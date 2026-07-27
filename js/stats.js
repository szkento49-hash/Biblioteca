function renderProfile(){
  const lvl = levelFromXP(state.profile.xp);
  const completed = state.books.filter(b=>b.status==='concluido').length;
  const totalPages = state.logs.reduce((s,l)=>s+l.pages,0);
  const unlockedCount = state.achievements.length;
  return `
  <div class="screen">
    <div class="char-sheet" style="--tier-color:${tierColor(lvl.level)};">
      <label style="cursor:pointer; display:inline-block;">
        <div class="char-avatar-frame">
          ${state.profile.avatar ? `<img src="${state.profile.avatar}">` : `<div class="avatar-fallback">🧙</div>`}
        </div>
        <input type="file" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
      </label>
      <div class="char-name">${escapeHTML(state.profile.name)}</div>
      <div class="char-title">Nível ${lvl.level} · ${levelTitle(lvl.level)}</div>
      <div class="char-hint">Toque no avatar para trocar a foto</div>
    </div>

    <div class="section-title"><h3>Atributos</h3></div>
    <div class="stat-block-grid">
      <div class="stat-block"><div class="v">${completed}</div><div class="l">livros concluídos</div></div>
      <div class="stat-block"><div class="v">${totalPages}</div><div class="l">páginas lidas</div></div>
      <div class="stat-block"><div class="v">${state.profile.streak}</div><div class="l">dias de ofensiva</div></div>
      <div class="stat-block"><div class="v">${unlockedCount}/${ACHIEVEMENTS.length}</div><div class="l">conquistas</div></div>
    </div>

    <div class="section-title"><h3>Editar nome</h3></div>
    <div class="field"><input id="p-name" value="${escapeHTML(state.profile.name)}" placeholder="Seu nome de leitor(a)"></div>
    <button class="btn btn-secondary" style="width:100%;" onclick="saveName()">Salvar nome</button>

    <div class="section-title"><h3>Preferências</h3></div>
    <div class="quest-card" style="justify-content:space-between;" onclick="toggleSound()">
      <div class="info">
        <div class="t">🔊 Efeitos sonoros</div>
        <div class="a">Som ao registrar leitura, subir de nível e conquistar badges</div>
      </div>
      <div class="btn btn-small ${state.profile.soundEnabled?'btn-primary':'btn-ghost'}">${state.profile.soundEnabled?'Ativado':'Desativado'}</div>
    </div>

    <div class="section-title"><h3>Metas</h3></div>
    <div class="field"><label>Meta diária (páginas)</label><input id="p-daily" type="number" min="1" value="${state.profile.dailyGoalPages}"></div>
    <div class="field"><label>Meta mensal (livros)</label><input id="p-monthly" type="number" min="1" value="${state.profile.monthlyGoalBooks}"></div>
    <div class="field"><label>Meta anual (livros)</label><input id="p-yearly" type="number" min="1" value="${state.profile.yearlyGoalBooks}"></div>
    <button class="btn btn-secondary" style="width:100%;" onclick="saveGoals()">Salvar metas</button>

    <div class="section-title"><h3>Conquistas</h3></div>
    <div class="badge-grid">
      ${ACHIEVEMENTS.map(a=>{
        const unlocked = state.achievements.find(x=>x.id===a.id);
        return `<div class="badge ${unlocked?'':'locked'}">
          <div class="ic">${a.icon}</div>
          <div class="n">${a.name}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function saveName(){
  state.profile.name = document.getElementById('p-name').value.trim()||'Aventureiro(a)';
  render(); alertToast('Nome atualizado!');
}
function saveGoals(){
  state.profile.dailyGoalPages = parseInt(document.getElementById('p-daily').value)||20;
  state.profile.monthlyGoalBooks = parseInt(document.getElementById('p-monthly').value)||2;
  state.profile.yearlyGoalBooks = parseInt(document.getElementById('p-yearly').value)||12;
  render(); alertToast('Metas atualizadas!');
}
function handleAvatarUpload(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const size = 240;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const side = Math.min(img.width, img.height);
      const sx = (img.width-side)/2, sy = (img.height-side)/2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      state.profile.avatar = canvas.toDataURL('image/jpeg', 0.9);
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* =========================================================
   MODAL / TOAST / CELEBRAÇÃO
   ========================================================= */
function showModal(innerHTML){
  closeModal();
  const div = document.createElement('div');
  div.className='modal-backdrop';
  div.id='modal-backdrop';
  div.onclick = (e)=>{ if(e.target.id==='modal-backdrop') closeModal(); };
  div.innerHTML = `<div class="modal-sheet">${innerHTML}</div>`;
  document.body.appendChild(div);
}
function closeModal(){
  const el = document.getElementById('modal-backdrop');
  if(el) el.remove();
}
function alertToast(msg){
  const el = document.createElement('div');
  el.className='toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2600);
}
function showCelebration(item, type){
  const div = document.createElement('div');
  div.className='celebrate-backdrop';
  div.onclick = ()=>div.remove();
  div.innerHTML = `
    <div class="celebrate-card">
      <div class="big-ic">${item.icon}</div>
      <h3 style="margin-top:10px;">${type==='levelup' ? item.name : 'Conquista desbloqueada!'}</h3>
      <div class="muted" style="margin-top:6px;">${type==='levelup' ? item.desc : item.name+' — '+item.desc}</div>
      <button class="btn btn-primary" style="margin-top:18px;" onclick="this.closest('.celebrate-backdrop').remove()">Continuar</button>
    </div>`;
  document.body.appendChild(div);
}