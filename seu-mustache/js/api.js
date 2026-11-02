/* ---------- API: comunicação com o backend e sincronização do painel ---------- */
const API={
 token:(()=>{try{return localStorage.getItem('sm_token')}catch(e){return null}})(),
 user:null,demo:false,
 setToken(t){this.token=t;try{t?localStorage.setItem('sm_token',t):localStorage.removeItem('sm_token')}catch(e){}},
 async req(method,path,body){
  const h={Accept:'application/json'};
  if(body!==undefined)h['Content-Type']='application/json';
  if(this.token)h.Authorization='Bearer '+this.token;
  let r;
  try{r=await fetch('/api'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
  catch(e){const er=new Error('Sem conexão com o servidor.');er.status=0;throw er}
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok){
   const er=new Error((d&&d.error)||'Erro inesperado ('+r.status+').');er.status=r.status;er.fields=d&&d.fields;
   if(r.status===401&&this.token&&!path.startsWith('/auth/login')){this.setToken(null);this.user=null}
   throw er}
  return d},
 async login(email,password){
  const r=await this.req('POST','/auth/login',{email,password});
  this.setToken(r.token);this.user=r.user;
  if(r.user.role==='admin')await loadAdmin();
  return r.user},
 async signup(data){
  const r=await this.req('POST','/auth/signup',data);
  this.setToken(r.token);this.user=r.user;return r.user},
 async logout(){
  try{if(this.token)await this.req('POST','/auth/logout',{})}catch(e){}
  this.setToken(null);this.user=null;
  try{await loadPublic()}catch(e){}}
};

/* dados públicos (serviços, barbeiros ativos, avaliações, contatos) */
async function loadPublic(){
 const p=await API.req('GET','/public');
 API.demo=!!p.demo;
 ['clients','appts','sales','notes','alerts','bills','fin','cats'].forEach(k=>DB[k]=[]);
 DB.services=p.services;DB.barbers=p.barbers;DB.reviews=p.reviews;
 DB.settings=Object.assign({autoConfirm:true,remind:true,walkin:true},p.settings);
 Sync.off()}

/* todos os dados do painel (somente administrador) */
async function loadAdmin(){
 const s=await API.req('GET','/admin/state');
 ['services','barbers','clients','appts','sales','reviews','notes','alerts','bills','cats','fin'].forEach(k=>DB[k]=s[k]);
 DB.settings=s.settings;
 Sync.take()}

/* Sync: compara o DB em memória com o último estado salvo e envia só o que mudou */
const Sync=(()=>{
 const COLS=['services','barbers','clients','appts','sales','reviews','notes','alerts','bills'];
 const j=o=>JSON.stringify(o);
 let snap={},snapSet='',snapCats='',on=false,chain=Promise.resolve();
 function take(){COLS.forEach(c=>{snap[c]=new Map(DB[c].map(r=>[r.id,j(r)]))});snapSet=j(DB.settings);snapCats=j(DB.cats);on=true}
 function off(){on=false;snap={}}
 async function run(){
  if(!on||!API.user||API.user.role!=='admin')return;
  for(const c of COLS){
   const old=snap[c],cur=new Map(DB[c].map(r=>[r.id,r]));
   for(const [id,r] of cur){
    const s=j(r);
    if(!old.has(id)){const saved=await API.req('POST','/admin/'+c,r);Object.assign(r,saved);old.set(r.id,j(r))}
    else if(old.get(id)!==s){const saved=await API.req('PUT','/admin/'+c+'/'+encodeURIComponent(id),r);Object.assign(r,saved);old.set(id,j(r))}}
   for(const id of [...old.keys()])if(!cur.has(id)){await API.req('DELETE','/admin/'+c+'/'+encodeURIComponent(id));old.delete(id)}}
  if(j(DB.settings)!==snapSet){DB.settings=await API.req('PUT','/admin/settings',DB.settings);snapSet=j(DB.settings)}
  if(j(DB.cats)!==snapCats){DB.cats=await API.req('PUT','/admin/cats',DB.cats);snapCats=j(DB.cats)}}
 function push(){
  chain=chain.then(run).catch(async e=>{
   if(e.status===401){notice='Sua sessão expirou. Entre novamente.';return go('#/login')}
   toast(e.message||'Não foi possível salvar.',true);
   try{await loadAdmin();render()}catch(x){}});
  return chain}
 return{take,off,push}})();

/* inicialização: carrega dados e desenha a página */
async function boot(){
 try{
  await loadPublic();
  if(API.token){
   try{const r=await API.req('GET','/auth/me');API.user=r.user;if(r.user.role==='admin')await loadAdmin()}
   catch(e){if(e.status===0)throw e}}
  render()
 }catch(e){
  $('#app').innerHTML=`<main class="simple"><h1>Servidor indisponível</h1><p class="muted" style="font-size:18px">Não foi possível falar com o servidor. Inicie com <code>npm start</code> e abra <code>http://localhost:3000</code> no navegador (não abra o index.html direto do arquivo).</p><p><button class="btn" onclick="location.reload()">Tentar de novo</button></p></main>`}}
