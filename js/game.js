function levelFromXP(xp){
  let level=1, remaining=xp, needed=level*100;
  while(remaining>=needed){ remaining-=needed; level++; needed=level*100; }
  return { level, xpIntoLevel:remaining, xpNeeded:needed };
}
function levelTitle(level){
  if(level>=11) return 'Mestre das Letras';
  if(level>=7) return 'Bibliófilo';
  if(level>=4) return 'Leitor Dedicado';
  return 'Aprendiz';
}
function tierColor(level){
  if(level>=11) return '#D8B54C';
  if(level>=7) return '#C7CEDB';
  if(level>=4) return '#C98A4B';
  return '#8B6BD1';
}

const ACHIEVEMENTS = [
  { id:'first_book', name:'Primeira Aventura', desc:'Concluiu o primeiro livro', icon:'🏅',
    check: s => s.books.filter(b=>b.status==='concluido').length>=1 },
  { id:'five_books', name:'Colecionador de Histórias', desc:'Concluiu 5 livros', icon:'📚',
    check: s => s.books.filter(b=>b.status==='concluido').length>=5 },
  { id:'streak7', name:'Chama Acesa', desc:'7 dias seguidos de leitura', icon:'🔥',
    check: s => s.profile.streak>=7 },
  { id:'streak30', name:'Guardião da Chama', desc:'30 dias seguidos de leitura', icon:'⚡',
    check: s => s.profile.streak>=30 },
  { id:'three_genres', name:'Explorador de Mundos', desc:'Concluiu livros de 3 gêneros diferentes', icon:'🗺️',
    check: s => new Set(s.books.filter(b=>b.status==='concluido').map(b=>b.genre)).size>=3 },
  { id:'big_book', name:'Caçador de Gigantes', desc:'Concluiu um livro de mais de 400 páginas', icon:'🐉',
    check: s => s.books.some(b=>b.status==='concluido' && b.pages>400) },
];

function checkAchievements(){
  const unlockedIds = state.achievements.map(a=>a.id);
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach=>{
    if(!unlockedIds.includes(ach.id) && ach.check(state)){
      state.achievements.push({ id:ach.id, unlockedAt: todayStr() });
      newlyUnlocked.push(ach);
    }
  });
  return newlyUnlocked;
}

function todayStr(){ return new Date().toISOString().slice(0,10); }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }

const STREAK_MILESTONES = [7,14,30,60,100,365];

function registerStreak(){
  const today = todayStr();
  if(state.profile.lastReadDate === today) return;
  const wasStreak = state.profile.streak||0;

  if(state.profile.lastReadDate){
    const diff = daysBetween(state.profile.lastReadDate, today);
    if(diff===1){
      state.profile.streak = wasStreak+1;
    } else if(diff===2 && state.profile.streakFreezes>0){
      // usa um congelamento para não perder a ofensiva por 1 dia perdido
      state.profile.streakFreezes -= 1;
      state.profile.streak = wasStreak+1;
      window._pendingStreakFreezeUsed = true;
    } else {
      state.profile.streak = 1;
    }
  } else {
    state.profile.streak = 1;
  }
  state.profile.lastReadDate = today;
  state.profile.longestStreak = Math.max(state.profile.longestStreak||0, state.profile.streak);

  // a cada 7 dias de ofensiva ativa, ganha um congelamento (máx. 2 guardados)
  if(state.profile.streak>0 && state.profile.streak%7===0){
    state.profile.streakFreezes = Math.min(2, state.profile.streakFreezes+1);
  }
  if(STREAK_MILESTONES.includes(state.profile.streak)){
    window._pendingStreakMilestone = state.profile.streak;
  }
}

function addXP(amount){
  const before = levelFromXP(state.profile.xp).level;
  state.profile.xp += amount;
  const after = levelFromXP(state.profile.xp).level;
  return after>before ? after : null;
}
