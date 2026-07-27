function renderDashboard(){
  const lvl = levelFromXP(state.profile.xp);
  const color = tierColor(lvl.level);
  const active = state.books.filter(b=>b.status==='lendo');
  const todayLogs = state.logs.filter(l=>l.date===todayStr());
  const pagesToday = todayLogs.reduce((s,l)=>s+l.pages,0);
  const goalPct = Math.min(100, Math.round(pagesToday/Math.max(1,state.profile.dailyGoalPages)*100));

  const monthStr = todayStr().slice(0,7);
  const booksThisMonth = state.books.filter(b=>b.status==='concluido' && (b.endDate||'').slice(0,7)===monthStr).length;
  const pagesThisMonth = state.logs.filter(l=>l.date.slice(0,7)===monthStr).reduce((s,l)=>s+l.pages,0);

  const last7 = last7Days().map(d=>{
    const p = state.logs.filter(l=>l.date===d).reduce((s,l)=>s+l.pages,0);
    return {d,p};
  });
  const maxP = Math.max(1, ...last7.map(x=>x.p));

  const nearLevelUp = lvl.xpNeeded - lvl.xpIntoLevel <= 20;

  return `
  <div class="screen">
    <div class="hero-card" style="--tier-color:${color}">
      <div class="hero-top">
        ${avatarHTML(64)}
        <div class="hero-info">
          <div class="name">${escapeHTML(state.profile.name)}</div>
          <div class="title">Nível ${lvl.level} · ${levelTitle(lvl.level)}</div>
        </div>
        <div class="streak-pill">
          <div class="flame">🔥</div>
          <div class="num">${state.profile.streak}</div>
        </div>
      </div>
      <div class="xp-hero">
        <div class="xp-hero-labels">
          <span class="lvl">PROGRESSO DO NÍVEL</span>
          <span class="amt">${lvl.xpIntoLevel} / ${lvl.xpNeeded} XP</span>
        </div>
        <div class="xp-track"><div class="xp-fill" style="width:${Math.round(lvl.xpIntoLevel/lvl.xpNeeded*100)}%"></div></div>
      </div>
      ${nearLevelUp ? `<div class="muted" style="margin-top:10px; font-size:11px; color:var(--gold); font-family:'Space Mono',monospace; position:relative; z-index:1;">⚡ Faltam ${lvl.xpNeeded-lvl.xpIntoLevel} XP para o próximo nível!</div>` : ''}
    </div>

    <div class="section-title"><h3>Livro atual</h3><button class="link-btn" onclick="openAddBookModal('lendo')">+ novo livro</button></div>
    ${active.length===0 ? emptyState('📖','Nenhum livro em andamento. Comece uma nova jornada!') :
      active.map(bookCardHTML).join('')}
    <button class="btn btn-primary" style="margin-top:6px;" onclick="openRegisterModal()">Registrar leitura de hoje</button>

    <div class="section-title"><h3>Missões de hoje</h3></div>
    <div class="goal-row">
      <div class="goal-ring">
        <div class="big">${pagesToday}/${state.profile.dailyGoalPages}</div>
        <div class="cap">páginas hoje</div>
        <div class="mini-track"><div class="mini-fill" style="width:${goalPct}%"></div></div>
      </div>
      <div class="goal-ring">
        <div class="big">${booksThisMonth}</div>
        <div class="cap">livros este mês</div>
      </div>
      <div class="goal-ring">
        <div class="big">${pagesThisMonth}</div>
        <div class="cap">páginas no mês</div>
      </div>
    </div>

    <div class="section-title"><h3>Ofensiva</h3><span class="muted">❄️ ${state.profile.streakFreezes} congelamento(s)</span></div>
    <div class="quest-card" style="display:block;">
      <div class="streak-calendar">
        ${last14Days().map(d=>{
          const read = state.logs.some(l=>l.date===d);
          const isToday = d===todayStr();
          return `<div class="streak-day ${read?'read':''} ${isToday?'today':''}">${read?'🔥':''}</div>`;
        }).join('')}
      </div>
      <div class="muted" style="margin-top:9px; font-size:11px;">Ganhe um congelamento a cada 7 dias seguidos — ele salva sua ofensiva se você perder 1 dia.</div>
    </div>

    <div class="section-title"><h3>Estatísticas rápidas</h3></div>
    <div class="quest-card" style="display:block;">
      <div class="bars">
        ${last7.map(x=>`
          <div class="bar-col">
            <div class="bar" style="height:${Math.max(4, x.p/maxP*80)}px" title="${x.p} páginas"></div>
            <div class="bar-label">${weekdayShort(x.d)}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function weekdayShort(dateStr){
  const days = ['dom','seg','ter','qua','qui','sex','sáb'];
  return days[new Date(dateStr+'T12:00:00').getDay()];
}
function last7Days(){
  const arr=[];
  for(let i=6;i>=0;i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    arr.push(d.toISOString().slice(0,10));
  }
  return arr;
}
function last14Days(){
  const arr=[];
  for(let i=13;i>=0;i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    arr.push(d.toISOString().slice(0,10));
  }
  return arr;
}
function emptyState(icon, text){
  return `<div class="empty-state"><div class="icon">${icon}</div><div>${text}</div></div>`;
}

function bookCardHTML(b){
  const pct = Math.min(100, Math.round((b.currentPage/b.pages)*100));
  const remaining = Math.max(0, b.pages-b.currentPage);
  const coverInner = b.cover ? `<img src="${b.cover}">` : initials(b.title);
  return `
  <div class="quest-card" id="questcard-${b.id}" onclick="openBook('${b.id}')">
    <button class="card-delete-btn" onclick="deleteBookAnimated('${b.id}', event)">✕</button>
    <div class="seal">${pct}%</div>
    <div class="cover" style="background:${coverColor(b.title)}; position:relative;">${b.source==='pdf'?'<div class="pdf-tag">PDF</div>':''}${coverInner}</div>
    <div class="info">
      <div class="t">${escapeHTML(b.title)}</div>
      <div class="a">${escapeHTML(b.author||'Autor desconhecido')}</div>
      <div class="track"><div class="track-fill" style="width:${pct}%"></div></div>
      <div class="meta">${b.status==='concluido' ? 'Concluído' : `faltam ${remaining} páginas`}</div>
    </div>
  </div>`;
}
function coverColor(seed){
  const colors = ['#E2793C','#D8B54C','#8B6BD1','#5C9274','#C1543F','#7C93C9'];
  let h=0; for(const c of seed) h+=c.charCodeAt(0);
  return colors[h%colors.length];
}
function initials(title){
  return title.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function escapeHTML(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function avatarHTML(size){
  const lvl = levelFromXP(state.profile.xp).level;
  if(state.profile.avatar){
    return `<div class="avatar-frame" style="width:${size}px;height:${size}px;--tier-color:${tierColor(lvl)}"><img src="${state.profile.avatar}"></div>`;
  }
  return `<div class="avatar-frame" style="width:${size}px;height:${size}px;--tier-color:${tierColor(lvl)}"><div class="avatar-fallback">🧙</div></div>`;
}