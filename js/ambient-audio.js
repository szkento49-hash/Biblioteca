const AMBIENT = { ctx:null, master:null, channels:{}, started:false };
const AMBIENT_CHANNEL_KEYS = ['musica','chuva','fogo','passaros','vento','biblioteca','magia','natureza'];

function makeNoiseBuffer(ctx, seconds){
  const size = Math.floor(ctx.sampleRate*seconds);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<size;i++) data[i] = Math.random()*2-1;
  return buffer;
}
function initAmbientAudio(){
  if(AMBIENT.started) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  const ctx = new AC();
  AMBIENT.ctx = ctx;
  AMBIENT.master = ctx.createGain();
  AMBIENT.master.gain.value = getEnvConfig().audio.master/100;
  AMBIENT.master.connect(ctx.destination);
  AMBIENT_CHANNEL_KEYS.forEach(key=>{
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(AMBIENT.master);
    AMBIENT.channels[key] = { gain, intervalId:null };
  });
  const noise2s = makeNoiseBuffer(ctx, 2);

  /* chuva — ruído filtrado contínuo em loop */
  (function(){
    const src = ctx.createBufferSource();
    src.buffer = noise2s; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type='bandpass'; filter.frequency.value=1100; filter.Q.value=0.6;
    src.connect(filter); filter.connect(AMBIENT.channels.chuva.gain);
    src.start();
  })();

  /* fogo — ronco grave contínuo + estalos aleatórios */
  (function(){
    const src = ctx.createBufferSource();
    src.buffer = noise2s; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type='lowpass'; filter.frequency.value=420;
    const bedGain = ctx.createGain(); bedGain.gain.value=0.5;
    src.connect(filter); filter.connect(bedGain); bedGain.connect(AMBIENT.channels.fogo.gain);
    src.start();
    AMBIENT.channels.fogo.intervalId = setInterval(()=>{
      if(document.visibilityState!=='visible') return;
      const b = makeNoiseBuffer(ctx, 0.12);
      const s = ctx.createBufferSource(); s.buffer=b;
      const f = ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1800;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.12);
      s.connect(f); f.connect(g); g.connect(AMBIENT.channels.fogo.gain);
      s.start(); s.stop(ctx.currentTime+0.15);
    }, 900+Math.random()*1400);
  })();

  /* vento — ruído filtrado com LFO variando a frequência do filtro */
  (function(){
    const src = ctx.createBufferSource();
    src.buffer = noise2s; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type='bandpass'; filter.frequency.value=500; filter.Q.value=0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value=0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value=260;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
    src.connect(filter); filter.connect(AMBIENT.channels.vento.gain);
    src.start();
  })();

  /* pássaros — cantos curtos e intermitentes */
  AMBIENT.channels.passaros.intervalId = setInterval(()=>{
    if(document.visibilityState!=='visible') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type='sine';
    const base = 1800+Math.random()*900;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base*1.4, now+0.08);
    osc.frequency.exponentialRampToValueAtTime(base*0.9, now+0.16);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.2);
    osc.connect(g); g.connect(AMBIENT.channels.passaros.gain);
    osc.start(now); osc.stop(now+0.22);
  }, 2200+Math.random()*3200);

  /* biblioteca — drone gravíssimo e discreto + folhear ocasional de página */
  (function(){
    const osc = ctx.createOscillator(); osc.type='sine'; osc.frequency.value=68;
    const g = ctx.createGain(); g.gain.value=0.35;
    osc.connect(g); g.connect(AMBIENT.channels.biblioteca.gain);
    osc.start();
  })();
  AMBIENT.channels.biblioteca.intervalId = setInterval(()=>{
    if(document.visibilityState!=='visible') return;
    const b = makeNoiseBuffer(ctx, 0.18);
    const s = ctx.createBufferSource(); s.buffer=b;
    const f = ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=2200;
    const now = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35, now+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.22);
    s.connect(f); f.connect(g); g.connect(AMBIENT.channels.biblioteca.gain);
    s.start(); s.stop(now+0.25);
  }, 14000+Math.random()*16000);

  /* magia — camadas de senoides suaves e desafinadas (shimmer) + brilhos ocasionais */
  (function(){
    [220, 330, 440].forEach((f,i)=>{
      const osc = ctx.createOscillator(); osc.type='sine'; osc.frequency.value=f*1.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value=0.05+i*0.02;
      const lfoGain = ctx.createGain(); lfoGain.gain.value=3;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      const g = ctx.createGain(); g.gain.value=0.12;
      osc.connect(g); g.connect(AMBIENT.channels.magia.gain);
      osc.start(); lfo.start();
    });
  })();
  AMBIENT.channels.magia.intervalId = setInterval(()=>{
    if(document.visibilityState!=='visible') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type='triangle';
    osc.frequency.setValueAtTime(1400+Math.random()*800, now);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.3, now+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.9);
    osc.connect(g); g.connect(AMBIENT.channels.magia.gain);
    osc.start(now); osc.stop(now+1);
  }, 8000+Math.random()*7000);

  /* natureza — grilos/folhas: pulsos curtos e regulares, mais discretos */
  AMBIENT.channels.natureza.intervalId = setInterval(()=>{
    if(document.visibilityState!=='visible') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type='square'; osc.frequency.value=2600+Math.random()*400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.06);
    osc.connect(g); g.connect(AMBIENT.channels.natureza.gain);
    osc.start(now); osc.stop(now+0.08);
  }, 700+Math.random()*900);

  /* música — pad ambiente suave, sem melodia, apenas textura */
  (function(){
    [130.8, 164.8, 196].forEach(f=>{
      const osc = ctx.createOscillator(); osc.type='sine'; osc.frequency.value=f;
      const g = ctx.createGain(); g.gain.value=0.1;
      osc.connect(g); g.connect(AMBIENT.channels.musica.gain);
      osc.start();
    });
  })();

  AMBIENT.started = true;
}
function setGainTarget(ctx, gainNode, target, rampSeconds){
  const now = ctx.currentTime;
  const safeTarget = Math.max(0.0001, target);
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(safeTarget, now+rampSeconds);
}
function applyEnvironmentAudio(animate){
  const cfg = getEnvConfig();
  if(!cfg.ambientSoundOn){
    if(AMBIENT.ctx){ AMBIENT_CHANNEL_KEYS.forEach(k=>setGainTarget(AMBIENT.ctx, AMBIENT.channels[k].gain, 0, animate?0.7:0.05)); }
    return;
  }
  if(!AMBIENT.ctx) initAmbientAudio();
  if(!AMBIENT.ctx) return;
  if(AMBIENT.ctx.state==='suspended') AMBIENT.ctx.resume();
  setGainTarget(AMBIENT.ctx, AMBIENT.master, cfg.audio.master/100, 0.4);
  const map = ENV_AUDIO_MAP[cfg.theme] || {};
  AMBIENT_CHANNEL_KEYS.forEach(key=>{
    const rel = map[key] || 0;
    const target = rel * (cfg.audio[key]/100);
    setGainTarget(AMBIENT.ctx, AMBIENT.channels[key].gain, target, animate?0.7:0.05);
  });
}
function suspendAmbientAudio(){
  if(AMBIENT.ctx && AMBIENT.ctx.state==='running') AMBIENT.ctx.suspend();
}

function getEnvConfig(){
  if(!state.profile.readerEnv){
    state.profile.readerEnv = { theme:'medieval', particles:true, animations:true, brightness:100, intensity:60, ambientSoundOn:true, audio:{} };
  }
  const cfg = state.profile.readerEnv;
  if(cfg.ambientSoundOn===undefined) cfg.ambientSoundOn = true;
  if(!cfg.audio) cfg.audio = {};
  const defaults = { master:14, musica:20, chuva:60, fogo:55, passaros:45, vento:40, biblioteca:35, magia:40, natureza:45 };
  Object.keys(defaults).forEach(k=>{ if(cfg.audio[k]===undefined) cfg.audio[k]=defaults[k]; });
  return cfg;
}