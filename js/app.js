let state = loadState();
/* =========================================================
   ESTADO / PERSISTÊNCIA
   ========================================================= */


/* =========================================================
   REGRAS DE JOGO — XP, NÍVEL, CONQUISTAS
   ========================================================= */

/* =========================================================
   RENDER — CONTROLE GERAL
   ========================================================= */
const app = document.getElementById('app');

function render(){
  const tab = state.ui.tab;
  let html = '';
  if(tab==='dashboard') html = renderDashboard();
  else if(tab==='library') html = renderLibrary();
  else if(tab==='wishlist') html = renderWishlist();
  else if(tab==='stats') html = renderStats();
  else if(tab==='profile') html = renderProfile();
  app.innerHTML = html + renderBottomNav();
  saveState();
  if(tab==='library') initLibraryTilt();
}

function renderBottomNav(){
  const tabs = [
    {id:'dashboard', ic:'🏰', label:'Início'},
    {id:'library', ic:'📚', label:'Livros'},
    {id:'wishlist', ic:'✨', label:'Desejos'},
    {id:'stats', ic:'📊', label:'Stats'},
    {id:'profile', ic:'🧙', label:'Perfil'},
  ];
  return `<div class="bottom-nav">${tabs.map(t=>`
    <button class="nav-btn ${state.ui.tab===t.id?'active':''}" onclick="goTab('${t.id}')">
      <span class="ic">${t.ic}</span><span>${t.label}</span>
    </button>`).join('')}</div>`;
}
function goTab(id){ state.ui.tab = id; render(); }

/* =========================================================
   DASHBOARD
   ========================================================= */


/* =========================================================
   BIBLIOTECA
   ========================================================= */


/* =========================================================
   LISTA DE DESEJOS
   ========================================================= */


/* =========================================================
   PERFIL
   ========================================================= */


/* =========================================================
   PDF.JS — CONFIGURAÇÃO
   ========================================================= */

/* =========================================================
   ÁUDIO AMBIENTE — SÍNTESE PROCEDURAL EM CAMADAS (Web Audio API)
   ========================================================= */

/* =========================================================
   PAINEL LATERAL (DRAWER) — GENÉRICO
   ========================================================= */


/* =========================================================
   DRAWER — MIXER DE SOM AMBIENTE
   ========================================================= */

/* =========================================================
  

/* =========================================================
   


/* =========================================================
 
/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
render();