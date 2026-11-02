'use strict';
/* Primeira execução: cria o administrador e (em modo demonstração) os dados de exemplo. */
const { db, tx, create, saveCats, saveSettings, addFin, addDays, todayISO } = require('./db');
const { hashPassword } = require('./auth');

const DEMO={
 services:[
  {id:'SV001',name:'Corte masculino',cat:'Cortes',dur:40,price:50,desc:'Corte na tesoura ou na máquina, com acabamento.'},
  {id:'SV002',name:'Barba',cat:'Barba',dur:30,price:35,desc:'Modelagem da barba com toalha quente.'},
  {id:'SV003',name:'Corte + barba',cat:'Combos',dur:70,price:80,desc:'Os dois serviços no mesmo horário.'},
  {id:'SV004',name:'Sobrancelha',cat:'Sobrancelha',dur:15,price:15,desc:'Design e limpeza da sobrancelha.'},
  {id:'SV005',name:'Pezinho e acabamento',cat:'Cortes',dur:15,price:20,desc:'Retoque dos contornos entre um corte e outro.'},
  {id:'SV006',name:'Hidratação capilar',cat:'Tratamentos',dur:30,price:40,desc:'Tratamento para cabelo e couro cabeludo.'}],
 barbers:[
  {id:'BB01',name:'Barbeiro 01',spec:'Cortes clássicos e degradê',phone:'(00) 00000-0001',email:'barbeiro01@exemplo.com',status:'Ativo',comm:40},
  {id:'BB02',name:'Barbeiro 02',spec:'Barba e acabamento',phone:'(00) 00000-0002',email:'barbeiro02@exemplo.com',status:'Ativo',comm:40},
  {id:'BB03',name:'Barbeiro 03',spec:'Combos e sobrancelha',phone:'(00) 00000-0003',email:'barbeiro03@exemplo.com',status:'Ativo',comm:35}],
 clients:[
  {id:'CL01',name:'Carlos Mendes',phone:'(31) 94444-6666',email:'carlos.mendes@gmail.com',cpf:'',status:'Ativo',city:'Belo Horizonte',uf:'MG'},
  {id:'CL02',name:'Maria Ferreira',phone:'(21) 95555-5555',email:'maria@exemplo.com.br',cpf:'',status:'Ativo',city:'Rio de Janeiro',uf:'RJ'},
  {id:'CL03',name:'João Silva',phone:'(11) 96666-4444',email:'joao@exemplo.com.br',cpf:'',status:'Ativo',city:'São Paulo',uf:'SP'},
  {id:'CL04',name:'Pedro Almeida',phone:'(31) 97777-1111',email:'pedro@exemplo.com',cpf:'',status:'Ativo',city:'Belo Horizonte',uf:'MG'},
  {id:'CL05',name:'Lucas Rocha',phone:'(31) 98888-2222',email:'lucas@exemplo.com',cpf:'',status:'Inativo',city:'Contagem',uf:'MG'}],
 appts:[],sales:[],
 notes:[
  {id:'N1',title:'Reforçar agenda de sábado',cat:'Agenda',urg:'Alta',desc:'Os horários de sábado estão quase lotados. Avaliar abrir mais vagas de encaixe.'},
  {id:'N2',title:'Rever preços dos combos',cat:'Financeiro',urg:'Média',desc:'Comparar o valor dos combos com o tempo de atendimento de cada um.'},
  {id:'N3',title:'Pedir avaliação aos clientes',cat:'Clientes',urg:'Baixa',desc:'Enviar um lembrete após o atendimento pedindo uma avaliação.'}],
 alerts:[
  {id:'A1',t:'Confirmações pendentes',s:'Agendamentos de hoje',n:4,fresh:true},
  {id:'A2',t:'Cancelamentos',s:'Nas últimas 24 horas',n:2},
  {id:'A3',t:'Vagas livres amanhã',s:'Podem receber encaixes',n:5}],
 cats:['Serviços','Produtos de uso','Aluguel','Comissões','Água e energia','Marketing'],
 bills:[{id:'B1',t:'Aluguel',v:5500,d:3},{id:'B2',t:'Internet',v:150,d:4},{id:'B3',t:'Energia elétrica',v:500,d:6}],
 fin:[
  {d:0,type:'Entrada',desc:'Atendimentos do dia',v:1200},
  {d:1,type:'Saída',desc:'Produtos de uso (reposição)',v:780},
  {d:2,type:'Entrada',desc:'Atendimentos do dia',v:1630.3},
  {d:3,type:'Saída',desc:'Comissões da semana',v:2100}],
 reviews:[],
 settings:{phone:'',addr:'',email:'',insta:'',hours:'',android:'',ios:'',autoConfirm:true,remind:true,walkin:true}
};

const DEMO_USERS = [
  { name: 'Administrador', email: 'admin@seumustache.demo', pass: 'admin123', role: 'admin' },
  { name: 'Cliente Exemplo', email: 'cliente@seumustache.demo', pass: 'cliente123', role: 'client' },
];

async function addUser({ name, email, pass, role, phone = '' }) {
  const hash = await hashPassword(pass);
  db.prepare('INSERT INTO users(name, email, phone, role, pass_hash) VALUES(?, ?, ?, ?, ?)').run(name, email.toLowerCase(), phone, role, hash);
}

function seedDemoData() {
  const dayISO = (o) => addDays(todayISO(), o);
  const DB = DEMO; // as linhas abaixo usam os mesmos nomes do protótipo
  const s = (id, type, c, sv, b, o, t, st) => DB.appts.push({ id, type, client: c, service: sv, barber: b, date: dayISO(o), time: t, status: st, notes: '' });
  const sl = (id, d, t, c, sv, b, st, pg) => { const p = DB.services.find((x) => x.id === sv).price; DB.sales.push({ id, d, t, client: c, service: sv, barber: b, total: p, status: st, pay: pg }); };
  s('AG-1042','Agendado','CL01','SV003','BB01',0,'09:00','Concluído');
  s('AG-1043','Agendado','CL03','SV001','BB02',0,'10:30','Concluído');
  s('AG-1044','Agendado','CL02','SV004','BB03',0,'14:00','Confirmado');
  s('AG-1045','Encaixe','CL04','SV002','BB02',0,'16:00','Confirmado');
  s('AG-1046','Agendado','CL01','SV001','BB01',1,'09:30','Confirmado');
  s('AG-1047','Remarcação','CL03','SV003','BB03',1,'11:00','Confirmado');
  s('AG-1048','Agendado','CL05','SV002','BB01',-1,'15:00','Faltou');
  s('AG-1049','Agendado','CL02','SV006','BB02',-1,'17:00','Cancelado');
  sl('P001',0,'17:00','CL01','SV003','BB01','Pago','Cartão');
  sl('P002',0,'17:30','CL02','SV004','BB03','Pendente','Pix');
  sl('P003',0,'18:00','CL03','SV001','BB02','Pago','Cartão');
  sl('P004',1,'18:00','CL04','SV002','BB02','Pago','Pix');
  sl('P005',1,'18:30','CL01','SV001','BB01','Pago','Dinheiro');
  sl('P006',2,'10:00','CL05','SV005','BB03','Pago','Cartão');
  sl('P007',2,'11:00','CL02','SV006','BB02','Cancelado','Pix');
  sl('P008',3,'15:00','CL03','SV003','BB01','Pago','Pix');
  sl('P009',3,'16:30','CL04','SV001','BB01','Pago','Cartão');
  sl('P010',5,'09:30','CL01','SV002','BB02','Pago','Dinheiro');
  sl('P011',6,'14:00','CL02','SV004','BB03','Pago','Pix');
  sl('P012',9,'12:00','CL05','SV003','BB03','Cancelado','Cartão');
  sl('P013',12,'10:00','CL03','SV001','BB02','Pago','Pix');
  sl('P014',20,'17:00','CL04','SV006','BB01','Pendente','Cartão');
  tx(() => {
    // listas "mais novo primeiro" são gravadas ao contrário, para manter a ordem do protótipo
    for (const k of ['services', 'barbers']) DEMO[k].forEach((r) => create(k, r));
    for (const k of ['clients', 'appts', 'sales', 'notes']) [...DEMO[k]].reverse().forEach((r) => create(k, r));
    for (const k of ['alerts', 'bills']) DEMO[k].forEach((r) => create(k, r));
    [...DEMO.reviews].reverse().forEach((r) => create('reviews', r));
    DEMO.fin.forEach(addFin);
  });
  saveCats(DEMO.cats);
  saveSettings(DEMO.settings);
}

/* Chamado na inicialização do servidor. */
async function bootstrap() {
  const has = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
  if (has) return;
  const prod = process.env.NODE_ENV === 'production';
  if (prod || process.env.SEED_DEMO === '0') {
    const email = process.env.ADMIN_EMAIL, pass = process.env.ADMIN_PASSWORD;
    if (!email || !pass || pass.length < 8) {
      console.error('Primeira execução: defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 8 caracteres).');
      process.exit(1);
    }
    await addUser({ name: process.env.ADMIN_NAME || 'Administrador', email, pass, role: 'admin' });
    saveCats(DEMO.cats);
    saveSettings({});
    console.log('Administrador criado: ' + email);
  } else {
    for (const u of DEMO_USERS) await addUser(u);
    db.prepare('INSERT INTO clients(id, name, phone, email, status) VALUES(?, ?, ?, ?, ?)').run('CLDEMO', 'Cliente Exemplo', '(31) 90000-0000', 'cliente@seumustache.demo', 'Ativo');
    seedDemoData();
    console.log('Modo demonstração: dados de exemplo criados.');
    console.log('  admin:   admin@seumustache.demo / admin123');
    console.log('  cliente: cliente@seumustache.demo / cliente123');
  }
}

module.exports = { bootstrap };
