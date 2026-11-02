/* ---------- dados (carregados do servidor, veja api.js) ---------- */
const DB={services:[],barbers:[],clients:[],appts:[],sales:[],notes:[],alerts:[],cats:[],bills:[],fin:[],reviews:[],
 settings:{phone:'',addr:'',email:'',insta:'',hours:'',android:'',ios:'',autoConfirm:true,remind:true,walkin:true}};
const svc=id=>DB.services.find(x=>x.id===id);
const cli=id=>DB.clients.find(x=>x.id===id);
const brb=id=>DB.barbers.find(x=>x.id===id);
const uid=p=>p+Math.random().toString(36).slice(2,6).toUpperCase();

/* série diária determinística */
const SER=(()=>{let s=42;const r=()=>(s=(s*16807)%2147483647)/2147483647;const a=[];
 for(let i=89;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const wk=d.getDay();const done=Math.round((wk===6?20:wk===0?6:13)+r()*9);a.push({date:d,done,canc:Math.round(r()*4)})}return a})();
const TICKET=62;

/* ---------- autenticação ---------- */
/* contas de demonstração: só preenchem o formulário de login (a conta real vem do servidor) */
const BASE_USERS=[
 {name:'Administrador',email:'admin@seumustache.demo',pass:'admin123',role:'admin'},
 {name:'Cliente Exemplo',email:'cliente@seumustache.demo',pass:'cliente123',role:'client'}];
const me=()=>API.user;
let notice=null,pendingScroll=null;

