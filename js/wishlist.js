function renderWishlist(){
  const list = state.books.filter(b=>b.status==='desejo');
  return `
  <div class="screen">
    <h2>Lista de desejos</h2>
    <div class="muted" style="margin-top:6px;">Livros que você quer ler em breve.</div>
    <button class="btn btn-secondary" style="width:100%; margin:14px 0;" onclick="openAddBookModal('desejo')">+ Adicionar à lista</button>
    ${list.length===0 ? emptyState('✨','Sua lista de desejos está vazia.') :
      list.map((b,i)=>`
      <div class="quest-card">
        <div class="cover" style="background:${coverColor(b.title)}">${b.cover ? `<img src="${b.cover}">` : initials(b.title)}</div>
        <div class="info">
          <div class="t">${escapeHTML(b.title)}</div>
          <div class="a">${escapeHTML(b.author||'')}</div>
          <div class="row" style="margin-top:8px;">
            <button class="btn btn-small btn-secondary" onclick="reorderWishlist(${i},-1)">↑</button>
            <button class="btn btn-small btn-secondary" onclick="reorderWishlist(${i},1)">↓</button>
            <button class="btn btn-small btn-primary" onclick="moveToReading('${b.id}')">Ler agora</button>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}
function reorderWishlist(indexInList, dir){
  const wishlist = state.books.filter(b=>b.status==='desejo');
  const target = indexInList+dir;
  if(target<0 || target>=wishlist.length) return;
  const a = wishlist[indexInList], b = wishlist[target];
  const ia = state.books.indexOf(a), ib = state.books.indexOf(b);
  [state.books[ia], state.books[ib]] = [state.books[ib], state.books[ia]];
  render();
}

/* =========================================================
   ESTATÍSTICAS
   ========================================================= */
function renderStats(){
  const completed = state.books.filter(b=>b.status==='concluido');
  const genreCounts = {};
  state.logs.forEach(l=>{
    const b = state.books.find(x=>x.id===l.bookId);
    if(!b) return;
    genreCounts[b.genre] = (genreCounts[b.genre]||0)+l.pages;
  });
  const genreEntries = Object.entries(genreCounts).sort((a,b)=>b[1]-a[1]);
  const maxGenre = Math.max(1, ...genreEntries.map(e=>e[1]));

  const avgTime = completed.length ?
    Math.round(completed.reduce((s,b)=>{
      const logs = state.logs.filter(l=>l.bookId===b.id);
      return s + logs.reduce((a,l)=>a+(l.minutes||0),0);
    },0)/completed.length) : 0;

  const withDuration = completed.map(b=>({
    b, days: b.startDate && b.endDate ? Math.max(1,daysBetween(b.startDate,b.endDate)) : null
  })).filter(x=>x.days!==null);
  const fastest = withDuration.length ? withDuration.reduce((a,c)=>c.days<a.days?c:a) : null;
  const slowest = withDuration.length ? withDuration.reduce((a,c)=>c.days>a.days?c:a) : null;

  const totalPagesRead = state.logs.reduce((s,l)=>s+l.pages,0);
  const pdfSeconds = state.books.reduce((s,b)=>s+(b.readingSeconds||0),0);
  const logMinutes = state.logs.reduce((s,l)=>s+(l.minutes||0),0);
  const totalMinutes = Math.round(pdfSeconds/60) + logMinutes;
  const totalSessions = state.books.reduce((s,b)=>s+(b.sessions||0),0);
  const avgSpeed = totalMinutes>0 ? (totalPagesRead/totalMinutes).toFixed(1) : '0';

  return `
  <div class="screen">
    <h2>Estatísticas</h2>

    <div class="section-title" style="margin-top:20px;"><h3>Resumo geral</h3></div>
    <div class="hero-stats-row">
      <div class="hero-stat"><div class="v">${completed.length}</div><div class="l">livros concluídos</div></div>
      <div class="hero-stat"><div class="v">${totalPagesRead}</div><div class="l">páginas lidas</div></div>
      <div class="hero-stat"><div class="v">${totalMinutes}</div><div class="l">minutos lidos</div></div>
    </div>

    <div class="section-title"><h3>Leitura digital</h3></div>
    <div class="stat-line"><span>Velocidade média</span><b>${avgSpeed} pág./min</b></div>
    <div class="stat-line"><span>Sessões de leitura</span><b>${totalSessions}</b></div>
    <div class="stat-line"><span>Maior sequência (ofensiva)</span><b>${state.profile.longestStreak||0} dias</b></div>
    <div class="stat-line"><span>Tempo médio por livro concluído</span><b>${avgTime} min</b></div>

    <div class="section-title"><h3>Gêneros mais lidos (por páginas)</h3></div>
    ${genreEntries.length===0 ? emptyState('📊','Registre leituras para ver suas estatísticas.') :
      genreEntries.map(([g,v])=>`
      <div class="genre-bar-row">
        <div class="row" style="justify-content:space-between;"><span>${escapeHTML(g)}</span><b class="muted">${v}p</b></div>
        <div class="genre-bar-track"><div class="genre-bar-fill" style="width:${Math.round(v/maxGenre*100)}%"></div></div>
      </div>`).join('')}

    <div class="section-title"><h3>Recordes</h3></div>
    <div class="stat-line"><span>Livro mais rápido</span><b>${fastest ? `${fastest.days}d — ${escapeHTML(fastest.b.title)}` : '—'}</b></div>
    <div class="stat-line"><span>Livro mais demorado</span><b>${slowest ? `${slowest.days}d — ${escapeHTML(slowest.b.title)}` : '—'}</b></div>
  </div>`;
}