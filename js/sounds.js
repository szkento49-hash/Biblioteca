/* =========================================================
   SOM — EFEITOS SONOROS (Web Audio API, sem arquivos externos)
   ========================================================= */
function getAudioCtx(){
  if(!window._actx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    window._actx = new AC();
  }
  if(window._actx.state==='suspended') window._actx.resume();
  return window._actx;
}
function playTone(freq, start, duration, type, gainStart){
  if(!state.profile.soundEnabled) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type||'sine';
  osc.frequency.value = freq;
  const t0 = ctx.currentTime+start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainStart||0.15, t0+0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0+duration+0.02);
}
function playRegisterSound(){
  // pequeno "brilho" satisfatório ao registrar a leitura, tipo ganhar moeda/XP
  playTone(659.25, 0, 0.10, 'triangle', 0.16);
  playTone(987.77, 0.06, 0.16, 'triangle', 0.13);
}
function playLevelUpSound(){
  // sequência ascendente e triunfante
  [523.25,659.25,783.99,1046.50].forEach((f,i)=>playTone(f, i*0.09, 0.28, 'triangle', 0.17));
}
function playAchievementSound(){
  playTone(587.33, 0, 0.14, 'sine', 0.15);
  playTone(739.99, 0.10, 0.14, 'sine', 0.15);
  playTone(987.77, 0.20, 0.32, 'sine', 0.18);
}
function playStreakSound(){
  playTone(392.00, 0, 0.10, 'sawtooth', 0.10);
  playTone(523.25, 0.07, 0.10, 'sawtooth', 0.12);
  playTone(659.25, 0.14, 0.22, 'sawtooth', 0.13);
}
function playNoiseBurst(duration, filterFreq, filterType, gainPeak){
  if(!state.profile.soundEnabled) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const size = Math.floor(ctx.sampleRate*duration);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<size;i++) data[i] = Math.random()*2-1;
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = filterType||'bandpass'; filter.frequency.value = filterFreq||2000;
  const gain = ctx.createGain();
  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak||0.2, t0+duration*0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(t0); src.stop(t0+duration+0.02);
}
function playBookOpenSound(){
  playNoiseBurst(0.28, 1400, 'bandpass', 0.14);
  playTone(146.83, 0.02, 0.3, 'sine', 0.08);
}
let _lastPageTurnSoundAt = 0;
function playPageTurnSound(){
  const now = Date.now();
  if(now-_lastPageTurnSoundAt < 380) return;
  _lastPageTurnSoundAt = now;
  playNoiseBurst(0.11, 2600, 'highpass', 0.1);
}
function playClickSound(){
  playTone(1046.5, 0, 0.05, 'sine', 0.09);
}
function toggleSound(){
  state.profile.soundEnabled = !state.profile.soundEnabled;
  if(state.profile.soundEnabled) playRegisterSound();
  render();
}
<script src="js/storage.js"></script>
<script src="js/sounds.js"></script>
<script src="js/app.js"></script>