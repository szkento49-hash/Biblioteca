if(window['pdfjsLib']){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* =========================================================
   AMBIENTES DE LEITURA
   ========================================================= */
const READER_ENVIRONMENTS = [
  { id:'medieval', name:'Biblioteca Medieval', desc:'Estantes antigas, velas quentes e poeira dourada flutuando no ar.',
    gradient:'radial-gradient(ellipse at 50% 0%, #3a2a18 0%, #1c130b 55%, #0d0906 100%)', bgImage:null, particle:'dust', count:16, locked:false, unlockLevel:0,
    sounds:['Biblioteca', 'Fogo'] },
  { id:'cabana', name:'Cabana na Chuva', desc:'Janela embaçada, chuva caindo devagar e uma lareira acesa ao fundo.',
    gradient:'linear-gradient(180deg, #101820 0%, #0a1116 60%, #060a0d 100%)', bgImage:null, particle:'rain', count:22, locked:false, unlockLevel:0,
    sounds:['Chuva', 'Fogo', 'Vento'] },
  { id:'lareira', name:'Lareira', desc:'Uma poltrona, o fogo estalando e faíscas subindo devagar.',
    gradient:'radial-gradient(ellipse at 50% 100%, #3a1408 0%, #1c0d06 55%, #0d0705 100%)', bgImage:null, particle:'embers', count:14, locked:false, unlockLevel:0,
    sounds:['Fogo'] },
  { id:'floresta', name:'Floresta', desc:'Árvores desfocadas, raios de sol e folhas balançando ao vento.',
    gradient:'linear-gradient(180deg, #14241a 0%, #0c1811 55%, #070d0a 100%)', bgImage:null, particle:'leaves', count:12, locked:false, unlockLevel:0,
    sounds:['Pássaros', 'Vento', 'Natureza'] },
  { id:'cafe', name:'Café', desc:'Uma cafeteria elegante e minimalista, luz natural e calma.',
    gradient:'linear-gradient(180deg, #241c16 0%, #17120d 60%, #0d0a08 100%)', bgImage:null, particle:null, count:0, locked:false, unlockLevel:0,
    sounds:['Música', 'Biblioteca'] },
  { id:'noturno', name:'Céu Noturno', desc:'Estrelas piscando devagar sob um azul profundo e silencioso.',
    gradient:'radial-gradient(ellipse at 50% 20%, #131c3a 0%, #0a0f22 55%, #050710 100%)', bgImage:null, particle:'stars', count:26, locked:false, unlockLevel:0,
    sounds:['Natureza', 'Vento'] },
  { id:'espaco', name:'Nebulosa Roxa', desc:'Flutuando entre estrelas, poeira cósmica violeta e um silêncio profundo do espaço.',
    gradient:'radial-gradient(ellipse at 30% 20%, #6b2fb3 0%, #2c1259 35%, #150a30 65%, #05030d 100%)', bgImage:null, particle:'stars', count:30, locked:false, unlockLevel:0,
    sounds:['Magia', 'Vento'] },
  { id:'caverna', name:'Caverna dos Cristais', desc:'Cristais azuis brilhando na pedra, uma cachoeira distante e névoa leve sobre a água.',
    gradient:'radial-gradient(ellipse at 50% 30%, #0f3a3a 0%, #0a2530 45%, #050f18 100%)', bgImage:null, particle:'crystal', count:18, locked:false, unlockLevel:3,
    sounds:['Chuva', 'Vento'] },
  { id:'castelo', name:'Castelo Medieval', desc:'Colunas de pedra, tapetes vermelhos, lustres antigos e vista para as montanhas.',
    gradient:'radial-gradient(ellipse at 50% 10%, #3a1f24 0%, #1c0f14 55%, #0d0708 100%)', bgImage:null, particle:'dust', count:14, locked:false, unlockLevel:5,
    sounds:['Fogo', 'Biblioteca'] },
  { id:'templo', name:'Templo Oriental', desc:'Madeira clara, lanternas de papel e um jardim zen silencioso ao fundo.',
    gradient:'linear-gradient(180deg, #1c2320 0%, #121815 60%, #0a0d0b 100%)', bgImage:null, particle:'sakura', count:16, locked:false, unlockLevel:7,
    sounds:['Natureza', 'Música'] },
  { id:'futurista', name:'Biblioteca Futurista', desc:'Estantes holográficas, luzes azuis e roxas, janelas para uma cidade distante.',
    gradient:'linear-gradient(180deg, #0d1a2e 0%, #150c2e 60%, #05030d 100%)', bgImage:null, particle:'stars', count:20, locked:false, unlockLevel:10,
    sounds:['Música', 'Magia'] },
  { id:'magica', name:'Biblioteca Mágica', desc:'Livros flutuantes e runas brilhando sob luz azul e dourada. Em breve.',
    gradient:'radial-gradient(ellipse at 50% 30%, #1b2a4a 0%, #120c2a 60%, #08050f 100%)', bgImage:null, particle:null, count:0, locked:true, unlockLevel:0,
    sounds:['Magia', 'Vento'] },
];

/* mapeia cada ambiente para o volume relativo (0–1) de cada canal de áudio */
const ENV_AUDIO_MAP = {
  medieval:  { biblioteca:1, fogo:0.3 },
  cabana:    { chuva:1, fogo:0.5, vento:0.3 },
  lareira:   { fogo:1 },
  floresta:  { passaros:1, vento:0.55, natureza:0.75 },
  cafe:      { musica:0.65, biblioteca:0.3 },
  noturno:   { natureza:0.55, vento:0.3 },
  espaco:    { magia:0.6, vento:0.25 },
  caverna:   { chuva:0.5, vento:0.35 },
  castelo:   { fogo:0.45, biblioteca:0.6 },
  templo:    { natureza:0.5, musica:0.35 },
  futurista: { musica:0.5, magia:0.35 },
  magica:    { magia:1, vento:0.2 },
};
