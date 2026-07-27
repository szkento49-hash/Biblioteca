const AUDIO_CHANNEL_LABELS = { musica:'Música', chuva:'Chuva', fogo:'Fogo', passaros:'Pássaros', vento:'Vento', biblioteca:'Biblioteca', magia:'Magia', natureza:'Natureza' };
function openSoundMixer(){
  if(!AMBIENT.ctx) initAmbientAudio();
  const cfg = getEnvConfig();
  showDrawer(`
    <div class="modal-head"><h3>🎧 Som Ambiente</h3><button class="modal-close" onclick="closeDrawer()">✕</button></div>
    <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <span class="muted">Sons ambientes</span>
      <button class="btn btn-small ${cfg.ambientSoundOn?'btn-primary':'btn-ghost'}" onclick="toggleAmbientSound()">${cfg.ambientSoundOn?'Ativados':'Desativados'}</button>
    </div>
    <div class="field"><label>Volume geral (<span id="mix-master-val">${cfg.audio.master}</span>%)</label>
      <input type="range" min="0" max="100" value="${cfg.audio.master}" oninput="updateMasterVolume(this.value)">
    </div>
    <div class="section-title"><h3 style="font-size:13px;">Canais</h3></div>
    ${AMBIENT_CHANNEL_KEYS.map(key=>`
      <div class="field">
        <label>${AUDIO_CHANNEL_LABELS[key]} (<span id="mix-${key}-val">${cfg.audio[key]}</span>%)</label>
        <input type="range" min="0" max="100" value="${cfg.audio[key]}" oninput="updateAudioChannel('${key}', this.value)">
      </div>`).join('')}
    <div class="muted" style="margin-top:4px; font-size:11px;">Cada ambiente já liga automaticamente os canais que combinam com ele — os sliders aqui só ajustam o volume de cada camada.</div>
  `);
}
function toggleAmbientSound(){
  const cfg = getEnvConfig();
  cfg.ambientSoundOn = !cfg.ambientSoundOn;
  saveState();
  applyEnvironmentAudio(true);
  openSoundMixer();
}
function updateMasterVolume(value){
  const cfg = getEnvConfig();
  cfg.audio.master = parseInt(value);
  saveState();
  const label = document.getElementById('mix-master-val');
  if(label) label.textContent = value;
  if(AMBIENT.ctx) setGainTarget(AMBIENT.ctx, AMBIENT.master, cfg.audio.master/100, 0.08);
}
function updateAudioChannel(key, value){
  const cfg = getEnvConfig();
  cfg.audio[key] = parseInt(value);
  saveState();
  const label = document.getElementById('mix-'+key+'-val');
  if(label) label.textContent = value;
  applyEnvironmentAudio(false);
}
