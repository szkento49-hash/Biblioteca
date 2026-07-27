function renderLibrary(){
  const filter = state.ui.libraryFilter;
  const view = state.ui.libraryView || 'grid';
  const list = state.books.filter(b=>b.status===filter);
  return `
  <div class="screen">
    <div class="section-title" style="margin-top:0;"><h2 style="text-transform:none; font-size:22px; letter-spacing:0.03em; font-family:'Fraunces',serif;">Biblioteca</h2>
      <div class="row" style="flex:0 0 auto; gap:6px;">
        <button class="btn btn-small ${view==='grid'?'btn-primary':'btn-ghost'}" onclick="setLibraryView('grid')">Estante</button>
        <button class="btn btn-small ${view==='list'?'btn-primary':'btn-ghost'}" onclick="setLibraryView('list')">Lista</button>
      </div>
    </div>

    <div class="upload-zone" id="upload-zone"
      ondragover="event.preventDefault(); this.classList.add('dragover')"
      ondragleave="this.classList.remove('dragover')"
      ondrop="event.preventDefault(); this.classList.remove('dragover'); handlePdfDrop(event)"
      onclick="document.getElementById('pdf-file-input').click()">
      <div id="upload-zone-inner">
        <div class="ic">📤</div>
        <div class="t">Arraste um PDF aqui ou toque para escolher</div>
        <div class="s">Vira um livro na sua estante, com leitura direto no app</div>
      </div>
    </div>
    <input type="file" id="pdf-file-input" accept="application/pdf,.pdf" style="display:none" onchange="handlePdfInputChange(event)">

    <div class="tabs-row">
      ${tabChip('lendo','Lendo')}${tabChip('concluido','Concluídos')}${tabChip('desejo','Desejos')}
    </div>
    <button class="btn btn-secondary" style="width:100%; margin-bottom:14px;" onclick="openAddBookModal('${filter}')">+ Adicionar livro manualmente</button>
    ${list.length===0 ? emptyState('📖','Nada por aqui ainda.') :
      view==='grid' ? `<div class="library-grid">${list.map(libCardHTML).join('')}</div>` : list.map(bookCardHTML).join('')}
  </div>`;
}
function libCardHTML(b){
  const pct = Math.min(100, Math.round((b.currentPage/b.pages)*100));
  const coverInner = b.cover ? `<img src="${b.cover}">` : initials(b.title);
  const selected = b.id===lastOpenedBookId ? ' selected' : '';
  const completed = b.status==='concluido' ? ' completed' : '';
  const justCompleted = window._justCompletedBookId===b.id ? ' just-completed' : '';
  const particles = justCompleted ? Array.from({length:10}).map(()=>{
    const angle = Math.random()*Math.PI*2, dist = 40+Math.random()*50;
    const px = Math.round(Math.cos(angle)*dist), py = Math.round(Math.sin(angle)*dist);
    return `<div class="lib-particle" style="--px:${px}px; --py:${py}px; animation-delay:${(Math.random()*0.15).toFixed(2)}s;"></div>`;
  }).join('') : '';
  return `
  <div class="lib-card${selected}${completed}${justCompleted}" id="libcard-${b.id}" onclick="openBookAnimated('${b.id}', this)">
    <button class="card-delete-btn" onclick="deleteBookAnimated('${b.id}', event)">✕</button>
    <div class="lib-book">
      <div class="lib-spine"></div>
      <div class="lib-cover" style="background:${coverColor(b.title)}">
        ${b.source==='pdf'?'<div class="pdf-tag">PDF</div>':''}
        ${coverInner}
        <div class="lib-shine"></div>
        ${b.status==='concluido' ? `<div class="lib-seal">✓ lido</div>` : `<div class="lib-seal">${pct}%</div>`}
        <div class="lib-track"><div class="lib-track-fill" style="width:${pct}%"></div></div>
      </div>
      ${particles}
    </div>
    <div class="lib-title">${escapeHTML(b.title)}</div>
    <div class="lib-author">${escapeHTML(b.author||'')}</div>
  </div>`;
}
/* =========================================================
   BIBLIOTECA — INCLINAÇÃO 3D E LUZ DINÂMICA (SEGUE O CURSOR)
   ========================================================= */
let _tiltRAF = null;
function initLibraryTilt(){
  const grid = document.querySelector('.library-grid');
  if(!grid) return;
  grid.addEventListener('mousemove', onLibraryMouseMove);
  grid.addEventListener('mouseleave', onLibraryMouseLeave);
}
function onLibraryMouseMove(evt){
  if(_tiltRAF) return;
  const clientX = evt.clientX, clientY = evt.clientY;
  _tiltRAF = requestAnimationFrame(()=>{
    _tiltRAF = null;
    document.querySelectorAll('.library-grid .lib-card').forEach(card=>{
      const r = card.getBoundingClientRect();
      const cx = r.left+r.width/2, cy = r.top+r.height/2;
      const dist = Math.hypot(clientX-cx, clientY-cy);
      card.classList.toggle('near', dist<140 && dist>=0);
      const inside = clientX>=r.left && clientX<=r.right && clientY>=r.top && clientY<=r.bottom;
      if(inside){
        const px = (clientX-r.left)/r.width;
        const py = (clientY-r.top)/r.height;
        card.style.setProperty('--ry', ((px-0.5)*22).toFixed(2)+'deg');
        card.style.setProperty('--rx', ((0.5-py)*14).toFixed(2)+'deg');
        card.style.setProperty('--lx', (px*100).toFixed(1)+'%');
        card.style.setProperty('--ly', (py*100).toFixed(1)+'%');
        card.classList.add('tilting');
      } else {
        card.classList.remove('tilting');
      }
    });
  });
}
function onLibraryMouseLeave(){
  document.querySelectorAll('.library-grid .lib-card').forEach(card=>{
    card.classList.remove('near','tilting');
  });
}

function tabChip(id,label){
  return `<div class="tab-chip ${state.ui.libraryFilter===id?'active':''}" onclick="setLibraryFilter('${id}')">${label}</div>`;
}
function setLibraryFilter(id){ state.ui.libraryFilter=id; render(); }
function setLibraryView(v){ state.ui.libraryView=v; render(); }

let _pendingNewCover = null;

function openAddBookModal(defaultStatus){
  _pendingNewCover = null;
  showModal(`
    <div class="modal-head"><h3>Adicionar livro</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="cover-upload-row">
      <div class="cover-large" id="f-cover-preview" style="background:${coverColor('novo')}">📷</div>
      <div style="flex:1;">
        <div class="muted">Capa do livro (opcional)</div>
        <label class="cover-upload-btn">
          Escolher da galeria
          <input type="file" accept="image/*" style="display:none" onchange="handleNewBookCover(event)">
        </label>
      </div>
    </div>
    <div class="field" style="margin-top:14px;"><label>Título</label><input id="f-title" placeholder="Ex: O Nome do Vento"></div>
    <div class="field"><label>Autor</label><input id="f-author" placeholder="Ex: Patrick Rothfuss"></div>
    <div class="row">
      <div class="field"><label>Total de páginas</label><input id="f-pages" type="number" min="1" placeholder="320"></div>
      <div class="field"><label>Gênero</label><input id="f-genre" placeholder="Fantasia"></div>
    </div>
    <div class="field"><label>Status inicial</label>
      <select id="f-status">
        <option value="lendo" ${defaultStatus==='lendo'?'selected':''}>Lendo agora</option>
        <option value="desejo" ${defaultStatus==='desejo'?'selected':''}>Lista de desejos</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="submitAddBook()">Salvar livro</button>
  `);
}
function handleNewBookCover(evt){
  const file = evt.target.files[0];
  if(!file) return;
  cropCoverImage(file, function(dataUrl){
    _pendingNewCover = dataUrl;
    const preview = document.getElementById('f-cover-preview');
    if(preview) preview.innerHTML = `<img src="${dataUrl}">`;
  });
}
function cropCoverImage(file, callback){
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const w = 300, h = 420; // proporção retrato padrão de capa
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const srcRatio = img.width/img.height, dstRatio = w/h;
      let sx=0, sy=0, sw=img.width, sh=img.height;
      if(srcRatio > dstRatio){ sw = img.height*dstRatio; sx = (img.width-sw)/2; }
      else { sh = img.width/dstRatio; sy = (img.height-sh)/2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function submitAddBook(){
  const title = document.getElementById('f-title').value.trim();
  const author = document.getElementById('f-author').value.trim();
  const pages = parseInt(document.getElementById('f-pages').value)||0;
  const genre = document.getElementById('f-genre').value.trim()||'Geral';
  const status = document.getElementById('f-status').value;
  if(!title || pages<=0){ alertToast('Preencha título e número de páginas.'); return; }
  state.books.push({
    id: 'b'+Date.now(),
    title, author, pages, genre, status,
    cover: _pendingNewCover,
    currentPage: 0,
    startDate: status==='lendo'? todayStr() : null,
    endDate: null,
    source: 'manual'
  });
  _pendingNewCover = null;
  closeModal();
  render();
  alertToast('Livro adicionado à sua estante!');
}

let lastOpenedBookId = null;
function openBook(id){
  const b = state.books.find(x=>x.id===id);
  if(!b) return;
  if(b.source==='pdf') openReader(id);
  else openBookDetail(id);
}
function openBookAnimated(id, cardEl){
  lastOpenedBookId = id;
  if(cardEl){
    cardEl.classList.add('opening');
    setTimeout(()=>openBook(id), 380);
  } else {
    openBook(id);
  }
}
function openBookDetail(id){
  const b = state.books.find(x=>x.id===id);
  if(!b) return;
  const pct = Math.min(100, Math.round((b.currentPage/b.pages)*100));
  const bookLogs = state.logs.filter(l=>l.bookId===id).slice().reverse();
  const coverInner = b.cover ? `<img src="${b.cover}">` : initials(b.title);
  showModal(`
    <div class="modal-head"><h3>${escapeHTML(b.title)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="cover-upload-row">
      <div class="cover-large" id="d-cover-preview" style="background:${coverColor(b.title)}">${coverInner}</div>
      <div style="flex:1;">
        <div class="muted">${escapeHTML(b.author||'')} · ${escapeHTML(b.genre)}</div>
        <label class="cover-upload-btn">
          ${b.cover ? 'Trocar capa' : 'Adicionar capa'}
          <input type="file" accept="image/*" style="display:none" onchange="handleBookCoverUpload('${b.id}', event)">
        </label>
      </div>
    </div>
    <div class="track" style="margin-top:12px;"><div class="track-fill" style="width:${pct}%"></div></div>
    <div class="meta muted" style="margin-top:6px;">${b.currentPage}/${b.pages} páginas (${pct}%)</div>

    ${b.status!=='concluido' ? `
    <div class="field" style="margin-top:14px;"><label>Atualizar página atual</label>
      <input id="f-currentpage" type="number" min="0" max="${b.pages}" value="${b.currentPage}">
    </div>
    <div class="row">
      <button class="btn btn-secondary" onclick="updateBookProgress('${b.id}')">Atualizar página</button>
      ${b.status==='desejo' ? `<button class="btn btn-primary" onclick="moveToReading('${b.id}')">Começar a ler</button>` : ''}
    </div>` : `<div class="muted" style="margin-top:10px;">Concluído em ${b.endDate}</div>`}

    <div class="section-title"><h3 style="font-size:13px;">Histórico</h3></div>
    ${bookLogs.length===0 ? `<div class="muted">Nenhum registro ainda.</div>` :
      bookLogs.slice(0,8).map(l=>`<div class="stat-line"><span>${l.date}</span><b>${l.pages}p${l.minutes?` · ${l.minutes}min`:''}</b></div>`).join('')}

    <button class="btn btn-danger" style="width:100%; margin-top:16px;" onclick="deleteBookAnimated('${b.id}')">Remover livro</button>
  `);
}
function handleBookCoverUpload(id, evt){
  const file = evt.target.files[0];
  if(!file) return;
  const b = state.books.find(x=>x.id===id);
  cropCoverImage(file, function(dataUrl){
    b.cover = dataUrl;
    const preview = document.getElementById('d-cover-preview');
    if(preview) preview.innerHTML = `<img src="${dataUrl}">`;
    saveState();
    alertToast('Capa atualizada!');
  });
}
function moveToReading(id){
  const b = state.books.find(x=>x.id===id);
  b.status='lendo'; b.startDate=todayStr();
  closeModal(); render(); alertToast('Boa leitura! Livro movido para "Lendo agora".');
}
function updateBookProgress(id){
  const b = state.books.find(x=>x.id===id);
  const newPage = Math.max(0, Math.min(b.pages, parseInt(document.getElementById('f-currentpage').value)||0));
  const delta = newPage - b.currentPage;
  if(delta>0){
    logReading(b, delta, 0);
  } else {
    b.currentPage = newPage;
  }
  checkBookCompletion(b);
  closeModal();
  const unlocked = checkAchievements();
  const streakMilestone = window._pendingStreakMilestone; window._pendingStreakMilestone = null;
  const freezeUsed = window._pendingStreakFreezeUsed; window._pendingStreakFreezeUsed = false;
  render();
  if(window._pendingLevelUp){
    const lvl = window._pendingLevelUp; window._pendingLevelUp=null;
    playLevelUpSound();
    showCelebration({name:`Nível ${lvl} alcançado!`, desc:levelTitle(lvl), icon:'⭐'}, 'levelup');
  } else if(streakMilestone){
    playStreakSound();
    showCelebration({name:`${streakMilestone} dias de ofensiva!`, desc:'Sua constância está em chamas.', icon:'🔥'}, 'levelup');
  } else if(unlocked.length){
    playAchievementSound();
    showCelebration(unlocked[0], 'achievement');
  } else if(delta>0){
    alertToast(freezeUsed ? `+${delta*2} XP · congelamento de ofensiva usado ❄️` : `+${delta*2} XP · página atualizada!`);
  }
}
function checkBookCompletion(b){
  if(b.currentPage>=b.pages && b.status!=='concluido'){
    b.status='concluido';
    b.endDate=todayStr();
    const bonus = 50 + (b.pages>400 ? 100 : 0);
    const leveledUp = addXP(bonus);
    if(leveledUp) window._pendingLevelUp = leveledUp;
    window._pendingBookCompletion = { title:b.title, bonus };
    window._justCompletedBookId = b.id;
    setTimeout(()=>{
      if(window._justCompletedBookId===b.id){ window._justCompletedBookId=null; render(); }
    }, 1300);
  }
}
function deleteBook(id){
  state.books = state.books.filter(b=>b.id!==id);
  state.logs = state.logs.filter(l=>l.bookId!==id);
  closeModal(); render();
}
function deleteBookAnimated(id, evt){
  if(evt){ evt.stopPropagation(); }
  closeModal();
  const card = document.getElementById('libcard-'+id) || document.getElementById('questcard-'+id);
  if(!card){ deleteBook(id); return; }
  card.classList.add('removing');
  const particleHost = card.querySelector('.lib-book') || card;
  const dustClass = card.classList.contains('lib-card') ? 'lib-dust' : 'quest-dust';
  for(let i=0;i<14;i++){
    const p = document.createElement('div');
    p.className = dustClass;
    const angle = Math.random()*Math.PI*2, dist = 30+Math.random()*70;
    p.style.setProperty('--px', Math.round(Math.cos(angle)*dist)+'px');
    p.style.setProperty('--py', Math.round(Math.sin(angle)*dist)+'px');
    p.style.animationDelay = (Math.random()*0.18).toFixed(2)+'s';
    particleHost.appendChild(p);
  }
  setTimeout(()=>{ deleteBook(id); }, 640);
}

/* =========================================================
   REGISTRAR LEITURA (modal global)
   ========================================================= */
function openRegisterModal(){
  const activeBooks = state.books.filter(b=>b.status==='lendo');
  if(activeBooks.length===0){
    alertToast('Adicione um livro em "Lendo agora" primeiro.');
    return;
  }
  showModal(`
    <div class="modal-head"><h3>Registrar leitura de hoje</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="field"><label>Livro</label>
      <select id="r-book">${activeBooks.map(b=>`<option value="${b.id}">${escapeHTML(b.title)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Páginas lidas agora</label><input id="r-pages" type="number" min="1" placeholder="Ex: 25"></div>
    <div class="field"><label>Tempo de leitura (minutos, opcional)</label><input id="r-minutes" type="number" min="0" placeholder="Ex: 30"></div>
    <button class="btn btn-primary" onclick="submitRegister()">Salvar registro</button>
  `);
}
function submitRegister(){
  const bookId = document.getElementById('r-book').value;
  const pages = parseInt(document.getElementById('r-pages').value)||0;
  const minutes = parseInt(document.getElementById('r-minutes').value)||0;
  if(pages<=0){ alertToast('Informe quantas páginas você leu.'); return; }
  const b = state.books.find(x=>x.id===bookId);
  logReading(b, pages, minutes);
  checkBookCompletion(b);
  closeModal();
  const unlocked = checkAchievements();
  const streakMilestone = window._pendingStreakMilestone; window._pendingStreakMilestone = null;
  const freezeUsed = window._pendingStreakFreezeUsed; window._pendingStreakFreezeUsed = false;
  render();
  if(window._pendingLevelUp){
    const lvl = window._pendingLevelUp; window._pendingLevelUp=null;
    playLevelUpSound();
    showCelebration({name:`Nível ${lvl} alcançado!`, desc:levelTitle(lvl), icon:'⭐'}, 'levelup');
  } else if(streakMilestone){
    playStreakSound();
    showCelebration({name:`${streakMilestone} dias de ofensiva!`, desc:'Sua constância está em chamas.', icon:'🔥'}, 'levelup');
  } else if(unlocked.length){
    playAchievementSound();
    showCelebration(unlocked[0], 'achievement');
  } else {
    alertToast(freezeUsed ? `+${pages*2} XP · congelamento de ofensiva usado ❄️` : `+${pages*2} XP registrado!`);
  }
}
function logReading(book, pages, minutes){
  book.currentPage = Math.min(book.pages, book.currentPage+pages);
  state.logs.push({ date: todayStr(), bookId: book.id, pages, minutes });
  registerStreak();
  const leveledUp = addXP(pages*2);
  if(leveledUp) window._pendingLevelUp = leveledUp;
  playRegisterSound();
}
 UPLOAD DE PDF — ENTRA NA BIBLIOTECA COMO LIVRO
   ========================================================= */
function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function renderPageToDataURL(pdf, pageNum, targetHeight){
  const page = await pdf.getPage(pageNum);
  const viewport1 = page.getViewport({scale:1});
  const scale = targetHeight/viewport1.height;
  const viewport = page.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({canvasContext:ctx, viewport}).promise;
  return canvas.toDataURL('image/jpeg',0.85);
}
function showUploadSpinner(show){
  const el = document.getElementById('upload-zone-inner');
  if(!el) return;
  el.innerHTML = show
    ? `<div class="upload-spinner"></div><div class="t" style="margin-top:10px;">Processando PDF…</div>`
    : `<div class="ic">📤</div><div class="t">Arraste um PDF aqui ou toque para escolher</div><div class="s">Vira um livro na sua estante, com leitura direto no app</div>`;
}
async function processPdfUpload(file){
  if(!file) return;
  const isPdf = file.type==='application/pdf' || /\.pdf$/i.test(file.name);
  if(!isPdf){ alertToast('Apenas arquivos PDF são aceitos.'); return; }
  if(!window['pdfjsLib']){ alertToast('Não foi possível carregar o leitor de PDF. Verifique sua conexão.'); return; }
  showUploadSpinner(true);
  try{
    const dataUrl = await readFileAsDataURL(file);
    const base64 = dataUrl.split(',')[1];
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({data:arr}).promise;
    const numPages = pdf.numPages;
    const coverDataUrl = await renderPageToDataURL(pdf, 1, 260).catch(()=>null);
    let title = file.name.replace(/\.pdf$/i,'');
    try{
      const meta = await pdf.getMetadata();
      if(meta && meta.info && meta.info.Title) title = meta.info.Title;
    }catch(e){}
    const book = {
      id:'b'+Date.now(),
      title, author:'', pages:numPages, genre:'PDF', status:'lendo',
      cover: coverDataUrl, currentPage:0, startDate:todayStr(), endDate:null,
      source:'pdf', pdfData: base64, fileName:file.name, uploadDate: todayStr(),
      bookmarks:[], highlights:[], notes:[], readingSeconds:0, sessions:0,
      readerState:{ lastPage:1, zoom:1.1 }
    };
    state.books.push(book);
    let saved = true;
    try{ saveState(); }catch(e){ saved = false; }
    render();
    alertToast(saved ? 'PDF adicionado! Toque no livro para começar a ler.' : 'Livro adicionado, mas o arquivo é grande demais para salvar localmente — pode se perder ao recarregar a página.');
  } catch(err){
    console.error(err);
    alertToast('Não foi possível processar esse PDF.');
    showUploadSpinner(false);
  }
}
function handlePdfInputChange(evt){
  const file = evt.target.files[0];
  processPdfUpload(file);
  evt.target.value='';
}
function handlePdfDrop(evt){
  const file = evt.dataTransfer.files[0];
  processPdfUpload(file);
}