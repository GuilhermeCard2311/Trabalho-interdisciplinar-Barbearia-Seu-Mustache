/* ---------- roteamento ---------- */
const parse=()=>(location.hash||'#/').replace(/^#\/?/,'').split('/');
const go=h=>{if(location.hash===h)render();else location.hash=h};
const S={period:7,q:{},f:{},tab:'Ativos',sp:1,fin:'line',side:false,helpOpen:false};
function toggleSide(v){S.side=v===undefined?!S.side:v;$('.side')?.classList.toggle('open',S.side);const sc=$('.scrim');if(S.side&&!sc){const d=document.createElement('div');d.className='scrim';d.onclick=()=>toggleSide(false);document.body.appendChild(d)}else if(!S.side&&sc)sc.remove()}
function render(){
 const p=parse(),u=me(),app=$('#app');closeModal();toggleSide(false);
 const keep=window.scrollY;
 const to=h=>{location.replace(h)};
 if(p[0]==='admin'){
  if(!u){notice='Entre com uma conta para continuar.';return to('#/login')}
  if(u.role!=='admin'){toast('Acesso restrito a administradores. Você foi levado à área do cliente.',true);return to('#/app')}
  const pg=p[1]||'dashboard';if(!PAGES[pg])return to('#/admin/dashboard');
  app.innerHTML=adminShell(pg,u);PAGES[pg].after&&PAGES[pg].after();window.scrollTo(0,S.keepScroll===pg?keep:0);S.keepScroll=pg;return}
 S.keepScroll=null;
 if(p[0]==='app'){
  if(!u){notice='Entre com a sua conta para acessar o aplicativo.';return to('#/login')}
  if(u.role==='admin')return to('#/admin/dashboard');
  app.innerHTML=clientPage(u);window.scrollTo(0,0);return}
 if(p[0]==='login'||p[0]==='cadastro'){
  if(u)return to(u.role==='admin'?'#/admin/dashboard':'#/app');
  app.innerHTML=p[0]==='login'?loginPage():signupPage();window.scrollTo(0,0);bindAuth(p[0]);return}
 if(p[0]==='mapa'){app.innerHTML=publicHeader(u)+mapPage()+footer();window.scrollTo(0,0);return}
 app.innerHTML=proto()+publicHeader(u)+homePage()+footer();
 if(pendingScroll){const id=pendingScroll;pendingScroll=null;setTimeout(()=>scrollToId(id),30)}else window.scrollTo(0,0)}
window.addEventListener('hashchange',render);

