function showDrawer(innerHTML){
  closeDrawer();
  const backdrop = document.createElement('div');
  backdrop.className='drawer-backdrop';
  backdrop.id='drawer-backdrop';
  backdrop.onclick = (e)=>{ if(e.target.id==='drawer-backdrop') closeDrawer(); };
  backdrop.innerHTML = `<div class="drawer-panel" id="drawer-panel">${innerHTML}</div>`;
  document.body.appendChild(backdrop);
  requestAnimationFrame(()=>{ backdrop.classList.add('open'); });
}
function closeDrawer(){
  const el = document.getElementById('drawer-backdrop');
  if(el) el.remove();
}

/* =========================================================
   DRAWER — AMBIENTE DE LEITURA
   ========================================================= */
function openEnvironmentModal(){
  const cfg = getEnvConfig();
  const favs = cfg.favorites||[];
  const currentLevel = levelFromXP(state.profile.xp).level;
  showDrawer(`
    <div class="modal-head"><h3>🌍 Ambiente</h3><button class="modal-close" onclick="closeDrawer()">✕</button></div>
    <div class="muted" style="margin-bottom:12px; font-size:11.5px;">Troque o cenário sem sair da página — o livro continua exatamente de onde você parou.</div>
    <div class="env-grid">
      ${READER_ENVIRONMENTS.map(e=>{
        const levelLocked = !e.locked && e.unlockLevel>0 && currentLevel<e.unlockLevel;
        const unavailable = e.locked || levelLocked;
        return `
      <div class="env-option ${cfg.theme===e.id?'active':''} ${unavailable?'locked':''}">
        <div class="env-preview" style="background:${e.gradient}">
          ${unavailable?'':`<button class="env-fav-btn ${favs.includes(e.id)?'active':''}" onclick="toggleEnvFavorite('${e.id}')">${favs.includes(e.id)?'★':'☆'}</button>`}
        </div>
        <div class="env-name">${e.name}</div>
        <div class="env-desc">${e.desc}</div>
        ${e.sounds && e.sounds.length ? `<div class="env-sounds">${e.sounds.map(s=>`<span class="env-sound-tag">${s}</span>`).join('')}</div>` : ''}
        ${e.locked
          ? `<div class="env-lock-badge">🔒 Em breve</div>`
          : levelLocked
            ? `<div class="env-lock-badge">🔒 Desbloqueia no nível ${e.unlockLevel}</div>`
            : `<button class="btn btn-small ${cfg.theme===e.id?'btn-primary':'btn-secondary'}" style="margin-top:8px;" onclick="selectEnvironment('${e.id}')">${cfg.theme===e.id?'Aplicado':'Aplicar'}</button>`}
      </div>`;}).join('')}
    </div>
    <div class="section-title"><h3 style="font-size:13px;">Visual</h3></div>
    <div class="quest-card" style="display:block;">
      <div class="row" style="justify-content:space-between; align-items:center;">
        <span class="muted">Partículas</span>
        <button class="btn btn-small ${cfg.particles?'btn-primary':'btn-ghost'}" onclick="toggleEnvSetting('particles')">${cfg.particles?'Ativadas':'Desativadas'}</button>
      </div>
      <div class="row" style="justify-content:space-between; align-items:center; margin-top:10px;">
        <span class="muted">Animações</span>
        <button class="btn btn-small ${cfg.animations?'btn-primary':'btn-ghost'}" onclick="toggleEnvSetting('animations')">${cfg.animations?'Ativadas':'Desativadas'}</button>
      </div>
      <div class="field" style="margin-top:14px;"><label>Brilho do ambiente (<span id="env-brightness-val">${cfg.brightness}</span>%)</label>
        <input type="range" min="40" max="130" value="${cfg.brightness}" oninput="updateEnvSlider('brightness', this.value)">
      </div>
      <div class="field"><label>Intensidade do ambiente (<span id="env-intensity-val">${cfg.intensity}</span>%)</label>
        <input type="range" min="10" max="100" value="${cfg.intensity}" oninput="updateEnvSlider('intensity', this.value)">
      </div>
      <div class="muted" style="margin-top:6px; font-size:11px;">Esses ajustes afetam só o entorno da página — o texto do livro nunca perde contraste.</div>
    </div>
    <button class="btn btn-secondary" style="width:100%; margin-top:12px;" onclick="closeDrawer(); openSoundMixer();">🎧 Abrir mixer de som ambiente</button>
  `);
}
function toggleEnvFavorite(id){
  const cfg = getEnvConfig();
  cfg.favorites = cfg.favorites||[];
  const i = cfg.favorites.indexOf(id);
  if(i>=0) cfg.favorites.splice(i,1); else cfg.favorites.push(id);
  saveState();
  openEnvironmentModal();
}
function selectEnvironment(id){
  const cfg = getEnvConfig();
  if(cfg.theme===id) return;
  const env = READER_ENVIRONMENTS.find(e=>e.id===id);
  if(!env || env.locked) return;
  const currentLevel = levelFromXP(state.profile.xp).level;
  if(env.unlockLevel>0 && currentLevel<env.unlockLevel){ alertToast(`Este ambiente desbloqueia no nível ${env.unlockLevel}.`); return; }
  cfg.theme = id;
  saveState();
  applyReaderEnvironmentVisuals(true);
  applyEnvironmentAudio(true);
  openEnvironmentModal();
}
function toggleEnvSetting(key){
  const cfg = getEnvConfig();
  cfg[key] = !cfg[key];
  saveState();
  applyReaderEnvironmentVisuals(false);
  openEnvironmentModal();
}
function updateEnvSlider(key, value){
  const cfg = getEnvConfig();
  cfg[key] = parseInt(value);
  saveState();
  const label = document.getElementById('env-'+key+'-val');
  if(label) label.textContent = value;
  updateEnvVisualsLive();
}
function updateEnvVisualsLive(){
  const backdrop = document.getElementById('env-backdrop');
  if(!backdrop) return;
  const cfg = getEnvConfig();
  backdrop.style.opacity = (cfg.intensity/100).toFixed(2);
  backdrop.style.filter = `brightness(${cfg.brightness/100})`;
}
function applyReaderEnvironmentVisuals(animate){
  if(!READER) return;
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl) return;
  const cfg = getEnvConfig();
  const env = READER_ENVIRONMENTS.find(e=>e.id===cfg.theme) || READER_ENVIRONMENTS[0];
  const applyNow = ()=>{
    if(env.bgImage){
      scrollEl.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url("${env.bgImage}")`;
      scrollEl.style.backgroundSize = 'cover';
      scrollEl.style.backgroundPosition = 'center';
    } else {
      scrollEl.style.backgroundImage = 'none';
      scrollEl.style.background = env.gradient;
    }
    const overlay = document.getElementById('reader-overlay');
    if(overlay){
      overlay.className = overlay.className.replace(/env-light-\S+/g,'').trim();
      overlay.classList.add('env-light-'+env.id);
    }
    let backdrop = document.getElementById('env-backdrop');
    if(!backdrop){
      backdrop = document.createElement('div');
      backdrop.id='env-backdrop';
      backdrop.className='env-backdrop';
      scrollEl.insertBefore(backdrop, scrollEl.firstChild);
    }
    backdrop.classList.toggle('no-anim', !cfg.animations);
    backdrop.style.opacity = (cfg.intensity/100).toFixed(2);
    backdrop.style.filter = `brightness(${cfg.brightness/100})`;
    backdrop.innerHTML='';
    if(cfg.particles && env.particle){
      for(let i=0;i<env.count;i++){
        const p = document.createElement('div');
        p.className = 'env-particle env-particle-'+env.particle;
        p.style.left = (Math.random()*100).toFixed(1)+'%';
        if(env.particle==='stars') p.style.top = (Math.random()*70).toFixed(1)+'%';
        const dur = env.particle==='rain' ? (0.55+Math.random()*0.5) : env.particle==='stars' ? (2.5+Math.random()*3) : (6+Math.random()*8);
        p.style.animationDuration = dur.toFixed(2)+'s';
        p.style.animationDelay = (Math.random()*6).toFixed(2)+'s';
        backdrop.appendChild(p);
      }
    }
  };
  if(animate){
    scrollEl.classList.add('env-switching');
    setTimeout(()=>{ applyNow(); scrollEl.classList.remove('env-switching'); }, 380);
  } else { applyNow(); }
}