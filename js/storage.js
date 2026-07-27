const STORAGE_KEY = 'codexLeitorState_v1';

function defaultState(){
  return {
    profile:{
      name:'Aventureiro(a)',
      avatar:null,
      xp:0,
      streak:0,
      lastReadDate:null,
      dailyGoalPages:20,
      monthlyGoalBooks:2,
      yearlyGoalBooks:12,
      streakFreezes:1,
      soundEnabled:true,
      longestStreak:0,
      readerEnv:{
        theme:'medieval',
        particles:true,
        animations:true,
        brightness:100,
        intensity:60,
        ambientSoundOn:true,
        audio:{
          master:14,
          musica:20,
          chuva:60,
          fogo:55,
          passaros:45,
          vento:40,
          biblioteca:35,
          magia:40,
          natureza:45
        }
      },
    },
    books:[],
    logs:[],
    achievements:[],
    ui:{
      tab:'dashboard',
      libraryFilter:'lendo',
      libraryView:'grid'
    }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();

    const parsed = JSON.parse(raw);

    return Object.assign(defaultState(), parsed, {
      profile: Object.assign(defaultState().profile, parsed.profile || {}),
      ui: Object.assign(defaultState().ui, parsed.ui || {})
    });

  }catch(e){
    return defaultState();
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.error('Falha ao salvar estado', e);
  }
}