LEITOR DE PDF — ESTADO E CICLO DE VIDA
   ========================================================= */
let READER = null;

async function openReader(bookId){
  const book = state.books.find(x=>x.id===bookId);
  if(!book || !book.pdfData){ alertToast('PDF não encontrado para este livro.'); return; }
  if(!window['pdfjsLib']){ alertToast('Não foi possível carregar o leitor de PDF.'); return; }
  closeModal();
  let arr;
  try{
    const bytes = atob(book.pdfData);
    arr = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
  }catch(e){ alertToast('Este PDF não pôde ser aberto.'); return; }

  let pdf;
  try{ pdf = await pdfjsLib.getDocument({data:arr}).promise; }
  catch(e){ alertToast('Não foi possível abrir este PDF.'); return; }

  READER = {
    book, pdf,
    scale: (book.readerState && book.readerState.zoom) || 1.1,
    currentPage: (book.readerState && book.readerState.lastPage) || 1,
    totalPages: pdf.numPages,
    sidebarOpen:false, sidebarTab:'thumbs',
    renderedPages:new Set(),
    sessionStart: Date.now(),
    secondsThisSession:0,
    maxPageReached: book.currentPage || 0,
    outline:null,
    relaxMode:false,
  };
  READER.startPage = READER.currentPage;
  buildReaderShell();
  applyReaderEnvironmentVisuals(false);
  applyEnvironmentAudio(false);
  playBookOpenSound();
  scrollToPage(READER.currentPage, false);
  onReaderPageChanged(READER.currentPage, true);
  startReaderTimer();
}

function buildReaderShell(){
  const book = READER.book;
  const div = document.createElement('div');
  div.id='reader-overlay';
  div.innerHTML = `
    <div class="reader-topbar">
      <button class="reader-icon-btn" onclick="closeReader()">✕</button>
      <div class="rt-title">${escapeHTML(book.title)}</div>
      <div class="rt-page" id="reader-page-indicator">1 / ${READER.totalPages}</div>
      <button class="reader-icon-btn" id="reader-bookmark-btn" onclick="toggleBookmarkCurrentPage()">🔖</button>
      <button class="reader-icon-btn" onclick="openEnvironmentModal()" title="Ambiente de Leitura">🌍</button>
      <button class="reader-icon-btn" id="reader-relax-btn" onclick="toggleRelaxMode()" title="Modo Relax">🌙</button>
      <button class="reader-icon-btn" onclick="toggleReaderSidebar()">☰</button>
    </div>
    <div class="reader-progress-track"><div class="reader-progress-fill" id="reader-progress-fill" style="width:0%"></div></div>
    <div class="reader-mini-stats" id="reader-mini-stats"></div>
    <div class="reader-body">
      <div class="reader-scroll" id="reader-scroll"></div>
      <div class="reader-sidebar" id="reader-sidebar">
        <div class="reader-sidebar-tabs">
          <button data-tab="thumbs" class="active" onclick="setSidebarTab('thumbs')">Páginas</button>
          <button data-tab="toc" onclick="setSidebarTab('toc')">Índice</button>
          <button data-tab="marks" onclick="setSidebarTab('marks')">Marcadores</button>
          <button data-tab="notes" onclick="setSidebarTab('notes')">Notas</button>
        </div>
        <div class="reader-sidebar-content" id="reader-sidebar-content"></div>
      </div>
    </div>
    <div class="reader-bottombar">
      <button class="reader-icon-btn" onclick="zoomReader(-0.15)">−</button>
      <div class="reader-zoom-label" id="reader-zoom-label">${Math.round(READER.scale*100)}%</div>
      <button class="reader-icon-btn" onclick="zoomReader(0.15)">+</button>
      <button class="reader-icon-btn" onclick="toggleReaderFullscreen()">⛶</button>
      <button class="reader-icon-btn" onclick="openSoundMixer()" title="Som Ambiente">🎧</button>
    </div>
  `;
  document.body.appendChild(div);

  const scrollEl = document.getElementById('reader-scroll');
  for(let n=1;n<=READER.totalPages;n++){
    const wrap = document.createElement('div');
    wrap.className='reader-page-wrap';
    wrap.dataset.page = n;
    wrap.style.width = '90vw';
    wrap.style.maxWidth = '760px';
    wrap.style.minHeight = '260px';
    scrollEl.appendChild(wrap);
  }
  READER.io = new IntersectionObserver(onPageIntersect, {root:scrollEl, rootMargin:'500px 0px', threshold:0.01});
  scrollEl.querySelectorAll('.reader-page-wrap').forEach(el=>READER.io.observe(el));
  scrollEl.addEventListener('scroll', onReaderScroll);
  scrollEl.addEventListener('wheel', onReaderWheel, {passive:false});
  document.addEventListener('mouseup', onReaderSelectionEnd);
  document.addEventListener('touchend', onReaderSelectionEnd);
  div.addEventListener('mousemove', scheduleFocusMode);
  div.addEventListener('touchstart', scheduleFocusMode, {passive:true});
  div.addEventListener('click', scheduleFocusMode);
  scheduleFocusMode();
  refreshBookmarkBtn();
  renderReaderSidebar();
}

function onPageIntersect(entries){
  entries.forEach(en=>{
    if(en.isIntersecting){
      const n = parseInt(en.target.dataset.page);
      if(READER && !READER.renderedPages.has(n)) renderPage(n);
    }
  });
}

async function renderPage(n){
  if(!READER || READER.renderedPages.has(n)) return;
  READER.renderedPages.add(n);
  const wrap = document.querySelector(`.reader-page-wrap[data-page="${n}"]`);
  if(!wrap) return;
  let page, viewport;
  try{
    page = await READER.pdf.getPage(n);
    viewport = page.getViewport({scale:READER.scale});
  }catch(e){ return; }
  wrap.style.width = viewport.width+'px';
  wrap.style.height = viewport.height+'px';
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  try{ await page.render({canvasContext:ctx, viewport}).promise; }catch(e){}
  wrap.innerHTML='';
  wrap.appendChild(canvas);
  const pnum = document.createElement('div');
  pnum.className='reader-page-number'; pnum.textContent = n;
  wrap.appendChild(pnum);

  try{
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className='reader-text-layer';
    textLayerDiv.style.width = viewport.width+'px';
    textLayerDiv.style.height = viewport.height+'px';
    textLayerDiv.style.setProperty('--scale-factor', String(READER.scale));
    wrap.appendChild(textLayerDiv);
    const task = pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      textContent: textContent,
      container: textLayerDiv,
      viewport: viewport,
      textDivs: []
    });
    if(task && task.promise) await task.promise;
  }catch(e){ /* segue apenas com a página renderizada, sem seleção de texto */ }

  applyStoredHighlights(n, wrap);
}
function applyStoredHighlights(n, wrapEl){
  if(!READER) return;
  const hls = (READER.book.highlights||[]).filter(h=>h.page===n);
  if(!hls.length) return;
  const spans = wrapEl.querySelectorAll('.reader-text-layer span');
  hls.forEach(h=>{
    spans.forEach(sp=>{
      const t = (sp.textContent||'').trim();
      if(t.length>2 && h.text && h.text.includes(t)) sp.classList.add('reader-hl');
    });
  });
}
/* ---------- SCROLL / PÁGINA ATUAL ---------- */
let readerScrollTimeout=null;
function onReaderScroll(){
  if(readerScrollTimeout) return;
  readerScrollTimeout = setTimeout(()=>{ readerScrollTimeout=null; updateCurrentPageFromScroll(); }, 150);
}
function updateCurrentPageFromScroll(){
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl || !READER) return;
  const top = scrollEl.getBoundingClientRect().top;
  let best=null, bestDist=Infinity;
  scrollEl.querySelectorAll('.reader-page-wrap').forEach(el=>{
    const r = el.getBoundingClientRect();
    const dist = Math.abs(r.top-top-40);
    if(dist<bestDist){ bestDist=dist; best=el; }
  });
  if(best){
    const n = parseInt(best.dataset.page);
    if(n!==READER.currentPage){ READER.currentPage=n; onReaderPageChanged(n); }
  }
}
function onReaderPageChanged(n, silent){
  READER.currentPage = n;
  const ind = document.getElementById('reader-page-indicator');
  if(ind) ind.textContent = `${n} / ${READER.totalPages}`;
  const fill = document.getElementById('reader-progress-fill');
  if(fill) fill.style.width = Math.round(n/READER.totalPages*100)+'%';
  refreshBookmarkBtn();
  updateReaderMiniStats();
  if(!silent) playPageTurnSound();
  if(READER.sidebarOpen && READER.sidebarTab==='thumbs') renderReaderSidebar();
  if(!silent && n>READER.maxPageReached){
    const delta = n-READER.maxPageReached;
    READER.maxPageReached = n;
    awardReadingProgress(READER.book, delta, n);
  }
}
function updateReaderMiniStats(){
  const el = document.getElementById('reader-mini-stats');
  if(!el || !READER) return;
  const remaining = Math.max(0, READER.totalPages-READER.currentPage);
  const pagesThisSession = Math.max(0, READER.currentPage-READER.startPage);
  const minutesThisSession = (READER.secondsThisSession||0)/60;
  const speed = minutesThisSession>0.3 ? pagesThisSession/minutesThisSession : 0;
  const etaMin = speed>0.05 ? Math.round(remaining/speed) : null;
  el.innerHTML = `${remaining} páginas restantes<br>${speed>0.05 ? speed.toFixed(1)+' pág/min' : '—'}${etaMin ? ` · ~${etaMin} min p/ terminar` : ''}`;
}
function scrollToPage(n, smooth){
  const wrap = document.querySelector(`.reader-page-wrap[data-page="${n}"]`);
  if(!wrap) return;
  if(!READER.renderedPages.has(n)) renderPage(n);
  wrap.scrollIntoView({behavior: smooth?'smooth':'auto', block:'start'});
}

/* ---------- PROGRESSO / XP EM TEMPO REAL ---------- */
function awardReadingProgress(book, pagesDelta, upToPage){
  book.currentPage = Math.max(book.currentPage||0, upToPage);
  const today = todayStr();
  const todayLog = state.logs.find(l=>l.date===today && l.bookId===book.id);
  if(todayLog){ todayLog.pages += pagesDelta; }
  else { state.logs.push({date:today, bookId:book.id, pages:pagesDelta, minutes:0}); }
  registerStreak();
  const pagesXP = pagesDelta*2;
  const leveledUpFromPages = addXP(pagesXP);
  checkBookCompletion(book);
  const leveledUpFromBonus = window._pendingLevelUp; window._pendingLevelUp = null;
  const leveledUp = leveledUpFromBonus || leveledUpFromPages;
  const completion = window._pendingBookCompletion; window._pendingBookCompletion = null;
  const unlocked = checkAchievements();
  const streakMilestone = window._pendingStreakMilestone; window._pendingStreakMilestone = null;
  saveState();
  playRegisterSound();
  if(completion && completion.title===book.title){
    playAchievementSound();
    const totalXP = pagesXP + completion.bonus;
    const extra = unlocked.length ? `<br><span style="color:var(--gold)">🏅 Nova conquista: ${unlocked[0].name}</span>` : (leveledUp ? `<br><span style="color:var(--gold)">⭐ Nível ${leveledUp} alcançado!</span>` : '');
    showCelebration({name:`🏆 Livro Concluído`, desc:`${escapeHTML(completion.title)}<br><b style="color:var(--gold)">+${totalXP} XP</b>${extra}`, icon:'📕'}, 'levelup');
  } else if(leveledUp){
    playLevelUpSound();
    showCelebration({name:`Nível ${leveledUp} alcançado!`, desc:levelTitle(leveledUp), icon:'⭐'}, 'levelup');
  } else if(streakMilestone){
    playStreakSound();
    showCelebration({name:`${streakMilestone} dias de ofensiva!`, desc:'Sua constância está em chamas.', icon:'🔥'}, 'levelup');
  } else if(unlocked.length){
    playAchievementSound();
    showCelebration(unlocked[0], 'achievement');
  }
}

/* ---------- ZOOM / TELA CHEIA ---------- */
function zoomReader(delta){
  READER.scale = Math.max(0.5, Math.min(3, +(READER.scale+delta).toFixed(2)));
  const label = document.getElementById('reader-zoom-label');
  if(label) label.textContent = Math.round(READER.scale*100)+'%';
  rerenderAllPages();
}
function rerenderAllPages(){
  const rendered = Array.from(READER.renderedPages);
  READER.renderedPages.clear();
  document.querySelectorAll('.reader-page-wrap').forEach(w=>{ w.innerHTML=''; });
  rendered.forEach(n=>renderPage(n));
}
function onReaderWheel(evt){
  if(evt.ctrlKey || evt.metaKey){
    evt.preventDefault();
    zoomReader(evt.deltaY<0 ? 0.1 : -0.1);
  }
}
function toggleReaderFullscreen(){
  const el = document.getElementById('reader-overlay');
  if(!el) return;
  if(!document.fullscreenElement){ el.requestFullscreen?.().catch(()=>{}); }
  else { document.exitFullscreen?.().catch(()=>{}); }
}

/* ---------- SIDEBAR: MINIATURAS / ÍNDICE / MARCADORES / NOTAS ---------- */
function toggleReaderSidebar(){
  READER.sidebarOpen = !READER.sidebarOpen;
  document.getElementById('reader-sidebar').classList.toggle('open', READER.sidebarOpen);
  if(READER.sidebarOpen) renderReaderSidebar();
}
function setSidebarTab(tab){
  READER.sidebarTab = tab;
  document.querySelectorAll('.reader-sidebar-tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  renderReaderSidebar();
}
function renderReaderSidebar(){
  const el = document.getElementById('reader-sidebar-content');
  if(!el || !READER) return;
  const tab = READER.sidebarTab;
  if(tab==='thumbs'){
    let html='';
    for(let n=1;n<=READER.totalPages;n++){
      html += `<div class="reader-thumb ${n===READER.currentPage?'current':''}" onclick="scrollToPage(${n},true)">
        <div class="ph">${n}</div><div class="n">Página ${n}</div></div>`;
    }
    el.innerHTML = html;
  } else if(tab==='toc'){
    if(READER.outline){ renderTocList(el, READER.outline); }
    else {
      el.innerHTML = `<div class="reader-empty-side">Carregando índice…</div>`;
      READER.pdf.getOutline().then(outline=>{
        READER.outline = outline||[];
        if(READER.sidebarTab==='toc') renderTocList(el, READER.outline);
      }).catch(()=>{ READER.outline=[]; if(READER.sidebarTab==='toc') el.innerHTML = `<div class="reader-empty-side">Índice indisponível para este PDF.</div>`; });
    }
  } else if(tab==='marks'){
    const marks = (READER.book.bookmarks||[]).slice().sort((a,c)=>a.page-c.page);
    el.innerHTML = marks.length===0 ? `<div class="reader-empty-side">Nenhum marcador ainda.<br>Toque no 🔖 para marcar a página atual.</div>` :
      marks.map(m=>`<div class="reader-thumb" onclick="scrollToPage(${m.page},true)"><div class="ph">🔖</div><div class="n">Página ${m.page}</div></div>`).join('');
  } else if(tab==='notes'){
    renderNotesTab(el);
  }
}
function renderTocList(el, outline){
  if(!outline.length){ el.innerHTML = `<div class="reader-empty-side">Este PDF não possui índice.</div>`; return; }
  el.innerHTML = outline.map((o,i)=>`<div class="reader-toc-item" onclick="jumpToOutlineIndex(${i})">${escapeHTML(o.title||'')}</div>`).join('');
}
async function jumpToOutlineIndex(i){
  try{
    const item = READER.outline[i];
    let dest = item.dest;
    if(typeof dest==='string') dest = await READER.pdf.getDestination(dest);
    if(Array.isArray(dest) && dest[0]){
      const idx = await READER.pdf.getPageIndex(dest[0]);
      scrollToPage(idx+1, true);
    }
  }catch(e){ alertToast('Não foi possível abrir este item do índice.'); }
}

/* ---------- MARCADORES ---------- */
function toggleBookmarkCurrentPage(){
  const b = READER.book;
  b.bookmarks = b.bookmarks||[];
  const idx = b.bookmarks.findIndex(m=>m.page===READER.currentPage);
  if(idx>=0){ b.bookmarks.splice(idx,1); }
  else { b.bookmarks.push({page:READER.currentPage, createdAt:todayStr()}); playClickSound(); }
  saveState();
  refreshBookmarkBtn();
  if(READER.sidebarOpen && READER.sidebarTab==='marks') renderReaderSidebar();
}
function refreshBookmarkBtn(){
  const btn = document.getElementById('reader-bookmark-btn');
  if(!btn || !READER) return;
  const has = (READER.book.bookmarks||[]).some(m=>m.page===READER.currentPage);
  btn.style.color = has ? 'var(--gold)' : '';
}

/* ---------- SELEÇÃO DE TEXTO: DESTACAR / COPIAR / NOTA / CITAÇÃO ---------- */
function onReaderSelectionEnd(){
  removeSelectionMenu();
  if(!READER) return;
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed || !sel.toString().trim()) return;
  const overlay = document.getElementById('reader-overlay');
  if(!overlay || !sel.anchorNode || !overlay.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if(!rect || (rect.width===0 && rect.height===0)) return;
  showSelectionMenu(rect, sel.toString().trim());
}
function showSelectionMenu(rect, text){
  const menu = document.createElement('div');
  menu.className='selection-menu';
  menu.id='selection-menu';
  menu.style.left = Math.max(8, Math.min(window.innerWidth-220, rect.left))+'px';
  menu.style.top = Math.max(8, rect.top-46)+'px';
  const enc = encodeURIComponent(text);
  menu.innerHTML = `
    <button onclick="applyHighlightToSelection('${enc}')">🖍 Destacar</button>
    <button onclick="copySelectionText('${enc}')">📋 Copiar</button>
    <button onclick="openNoteForSelection('${enc}')">📝 Nota</button>
    <button onclick="saveQuoteFromSelection('${enc}')">❝ Citação</button>
  `;
  document.body.appendChild(menu);
}
function removeSelectionMenu(){
  const m = document.getElementById('selection-menu');
  if(m) m.remove();
}
function applyHighlightToSelection(enc){
  const text = decodeURIComponent(enc);
  const b = READER.book;
  b.highlights = b.highlights||[];
  b.highlights.push({id:'h'+Date.now(), page:READER.currentPage, text, color:'gold', createdAt:todayStr()});
  saveState();
  removeSelectionMenu();
  window.getSelection().removeAllRanges();
  const wrap = document.querySelector(`.reader-page-wrap[data-page="${READER.currentPage}"]`);
  if(wrap) applyStoredHighlights(READER.currentPage, wrap);
  alertToast('Trecho destacado.');
}
function copySelectionText(enc){
  const text = decodeURIComponent(enc);
  removeSelectionMenu();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>alertToast('Copiado!')).catch(()=>alertToast('Não foi possível copiar.'));
  } else {
    alertToast('Cópia não suportada neste navegador.');
  }
}
function openNoteForSelection(enc){
  const text = decodeURIComponent(enc);
  removeSelectionMenu();
  window.getSelection().removeAllRanges();
  READER.sidebarOpen = true;
  document.getElementById('reader-sidebar').classList.add('open');
  setSidebarTab('notes');
  setTimeout(()=>{
    const ta = document.getElementById('new-note-text');
    if(ta) ta.value = `"${text}" — `;
  }, 50);
}
function saveQuoteFromSelection(enc){
  const text = decodeURIComponent(enc);
  const b = READER.book;
  b.notes = b.notes||[];
  b.notes.push({id:'n'+Date.now(), text:`❝ ${text} ❞`, page:READER.currentPage, createdAt:todayStr(), isQuote:true});
  saveState();
  removeSelectionMenu();
  window.getSelection().removeAllRanges();
  alertToast('Citação salva nas notas.');
}

/* ---------- NOTAS ---------- */
function renderNotesTab(el){
  const b = READER.book;
  const notes = (b.notes||[]).slice().reverse();
  el.innerHTML = `
    <div class="field"><textarea id="new-note-text" rows="3" class="reader-note-input" placeholder="Escreva uma nota sobre a página ${READER.currentPage}..."></textarea></div>
    <button class="btn btn-secondary btn-small" style="width:100%;" onclick="addNote()">+ Adicionar nota</button>
    <div style="margin-top:14px;">
      ${notes.length===0 ? `<div class="reader-empty-side">Nenhuma nota ainda.</div>` :
        notes.map(n=>`
        <div class="note-item">
          <div class="meta"><span>pág. ${n.page}</span><span>${n.createdAt}</span></div>
          <div class="txt">${escapeHTML(n.text)}</div>
          <div class="actions">
            <button onclick="scrollToPage(${n.page},true)">Ir à página</button>
            <button onclick="deleteNote('${n.id}')">Excluir</button>
          </div>
        </div>`).join('')}
    </div>
  `;
}
function addNote(){
  const ta = document.getElementById('new-note-text');
  if(!ta) return;
  const text = ta.value.trim();
  if(!text) return;
  const b = READER.book;
  b.notes = b.notes||[];
  b.notes.push({id:'n'+Date.now(), text, page:READER.currentPage, createdAt:todayStr()});
  saveState();
  renderNotesTab(document.getElementById('reader-sidebar-content'));
  alertToast('Nota salva.');
}
function deleteNote(id){
  const b = READER.book;
  b.notes = (b.notes||[]).filter(n=>n.id!==id);
  saveState();
  renderNotesTab(document.getElementById('reader-sidebar-content'));
}

/* ---------- TEMPO DE LEITURA / SESSÕES / FECHAMENTO ---------- */
function startReaderTimer(){
  READER.timerInterval = setInterval(()=>{
    if(!READER) return;
    if(document.visibilityState!=='visible') return;
    READER.secondsThisSession = (READER.secondsThisSession||0)+1;
    READER.book.readingSeconds = (READER.book.readingSeconds||0)+1;
    if(READER.secondsThisSession % 20===0) saveState();
  }, 1000);
}
function closeReader(){
  if(!READER) return;
  if(READER.secondsThisSession>5){ READER.book.sessions = (READER.book.sessions||0)+1; }
  READER.book.readerState = { lastPage: READER.currentPage, zoom: READER.scale };
  clearInterval(READER.timerInterval);
  clearTimeout(_focusModeTimer);
  if(READER.io) READER.io.disconnect();
  document.removeEventListener('mouseup', onReaderSelectionEnd);
  document.removeEventListener('touchend', onReaderSelectionEnd);
  document.getElementById('reader-overlay')?.remove();
  closeDrawer();
  suspendAmbientAudio();
  saveState();
  READER = null;
  render();
}
  MODO FOCO INTELIGENTE — some a interface após inatividade
   ========================================================= */
let _focusModeTimer = null;
function scheduleFocusMode(){
  const overlay = document.getElementById('reader-overlay');
  if(!overlay) return;
  overlay.classList.remove('focus-hidden');
  clearTimeout(_focusModeTimer);
  const delay = (READER && READER.relaxMode) ? 2200 : 5000;
  _focusModeTimer = setTimeout(()=>{
    const el = document.getElementById('reader-overlay');
    if(el) el.classList.add('focus-hidden');
  }, delay);
}

/* =========================================================
   MODO RELAX — reduz estímulos visuais para sessões longas
   ========================================================= */
function toggleRelaxMode(){
  if(!READER) return;
  READER.relaxMode = !READER.relaxMode;
  const overlay = document.getElementById('reader-overlay');
  const btn = document.getElementById('reader-relax-btn');
  if(overlay) overlay.classList.toggle('relax-on', READER.relaxMode);
  if(btn) btn.style.color = READER.relaxMode ? 'var(--gold)' : '';
  if(READER.relaxMode){
    const cfg = getEnvConfig();
    if(!cfg.ambientSoundOn){ cfg.ambientSoundOn = true; saveState(); applyEnvironmentAudio(true); }
    scheduleFocusMode();
    alertToast('Modo Relax ativado — brilho e estímulos reduzidos.');
  } else {
    scheduleFocusMode();
    alertToast('Modo Relax desativado.');
  }
}
