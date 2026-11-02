/* ---------- login / cadastro ---------- */
function permBox(cur){const li=a=>a.map(t=>`<li>${I('check',16)}<span>${t}</span></li>`).join('');
 return `<div class="perm"><div class="${cur==='client'?'me':''}"><h3>Cliente ${cur==='client'?'<span class="badge">Sua conta</span>':''}</h3><ul>${li(['Baixar e usar o aplicativo','Agendar, remarcar e cancelar horários','Ver o histórico de atendimentos'])}</ul></div>
 <div class="${cur==='admin'?'me':''}"><h3>Administrador ${cur==='admin'?'<span class="badge">Sua conta</span>':''}</h3><ul>${li(['Painel de gestão da barbearia','Agenda, clientes, serviços e barbeiros','Financeiro, relatórios e configurações'])}</ul></div></div>`}
function authLeft(t,sub){return `<aside class="auth-l"><a href="#/" aria-label="Voltar ao início"><img src="${LOGO}" alt="Barbearia Seu Mustache"></a><h1>${t}</h1><p class="muted" style="font-size:18px;max-width:42ch">${sub}</p><div><p style="font-weight:600;margin-bottom:10px">O acesso depende do tipo da conta</p>${permBox()}</div></aside>`}
function loginPage(){const n=notice;notice=null;
 return `<div class="auth">${authLeft('Entre na sua conta','Ao entrar, o sistema identifica o tipo da sua conta e leva você ao lugar certo.')}
 <section class="auth-r"><h2>Entrar</h2>${n?`<div class="alert info" role="status">${I('lock',18)}<span>${esc(n)}</span></div>`:''}
 <form id="lf" novalidate style="display:grid;gap:14px"><div class="alert" id="lerr" role="alert" hidden></div>
 <div class="field"><label for="le">E-mail</label><input class="input" id="le" type="email" autocomplete="email" placeholder="voce@email.com"><small class="err" id="le_e"></small></div>
 <div class="field"><label for="lp">Senha</label><div class="pw"><input class="input" id="lp" type="password" autocomplete="current-password" placeholder="Sua senha"><button type="button" id="tp" aria-label="Mostrar senha">Mostrar</button></div><small class="err" id="lp_e"></small></div>
 <button class="btn" id="lb">Entrar</button></form>
 <p class="muted">Ainda não tem conta? <a href="#/cadastro">Cadastre-se</a></p>
 ${API.demo?`<div class="demo"><b>Contas de demonstração</b><div><span>Administrador <code>admin@seumustache.demo</code> · <code>admin123</code></span><button class="btn ghost sm" data-fill="admin">Preencher</button></div><div><span>Cliente <code>cliente@seumustache.demo</code> · <code>cliente123</code></span><button class="btn ghost sm" data-fill="client">Preencher</button></div></div>`:''}</section></div>`}
function signupPage(){
 return `<div class="auth">${authLeft('Crie sua conta','O cadastro cria uma conta de cliente. Contas de administrador só podem ser criadas por outro administrador.')}
 <section class="auth-r"><h2>Cadastrar</h2><form id="sf" novalidate class="fgrid"><div class="field full"><label for="sn">Nome completo</label><input class="input" id="sn" autocomplete="name"><small class="err" id="sn_e"></small></div>
 <div class="field"><label for="se">E-mail</label><input class="input" id="se" type="email" autocomplete="email"><small class="err" id="se_e"></small></div>
 <div class="field"><label for="st">Telefone</label><input class="input" id="st" type="tel" autocomplete="tel" placeholder="(00) 00000-0000"><small class="err" id="st_e"></small></div>
 <div class="field"><label for="sp">Senha</label><input class="input" id="sp" type="password" autocomplete="new-password"><small class="err" id="sp_e"></small></div>
 <div class="field"><label for="sc">Confirmar senha</label><input class="input" id="sc" type="password" autocomplete="new-password"><small class="err" id="sc_e"></small></div>
 <div class="full"><button class="btn" id="sb" style="width:100%">Criar conta</button></div></form>
 <p class="muted">Já tem conta? <a href="#/login">Entrar</a></p></section></div>`}
function bindAuth(kind){
 if(kind==='login'){
  $('#tp').onclick=()=>{const i=$('#lp');const h=i.type==='password';i.type=h?'text':'password';$('#tp').textContent=h?'Ocultar':'Mostrar'};
  $$('[data-fill]').forEach(b=>b.onclick=()=>{const u=BASE_USERS.find(x=>x.role===b.dataset.fill);$('#le').value=u.email;$('#lp').value=u.pass;$('#lp').focus()});
  $('#lf').onsubmit=e=>{e.preventDefault();const em=$('#le').value.trim().toLowerCase(),pw=$('#lp').value;let ok=true;
   $('#le_e').textContent=em?'':'Informe o e-mail.';$('#lp_e').textContent=pw?'':'Informe a senha.';if(!em||!pw)return;
   const b=$('#lb');b.disabled=true;b.innerHTML='<span class="spin"></span> Entrando…';$('#lerr').hidden=true;
   API.login(em,pw).then(u=>{toast('Bem-vindo, '+u.name.split(' ')[0]+'.');go(u.role==='admin'?'#/admin/dashboard':'#/app')}).catch(err=>{b.disabled=false;b.textContent='Entrar';const er=$('#lerr');er.hidden=false;er.innerHTML=I('warn',18)+'<span>'+esc(err.message)+'</span>'})}}
 else{$('#sf').onsubmit=e=>{e.preventDefault();const v={n:$('#sn').value.trim(),e:$('#se').value.trim().toLowerCase(),t:$('#st').value.trim(),p:$('#sp').value,c:$('#sc').value};
   const er={n:v.n.length<3?'Informe o nome completo.':'',e:/^\S+@\S+\.\S+$/.test(v.e)?'':'Informe um e-mail válido.',t:v.t.replace(/\D/g,'').length<10?'Informe o telefone com DDD.':'',p:v.p.length<6?'A senha precisa ter 6 caracteres ou mais.':'',c:v.c!==v.p?'As senhas não são iguais.':''};
   let bad=false;Object.keys(er).forEach(k=>{const m={n:'sn',e:'se',t:'st',p:'sp',c:'sc'}[k];$('#'+m+'_e').textContent=er[k];if(er[k])bad=true});if(bad)return;
   const b=$('#sb');b.disabled=true;b.innerHTML='<span class="spin"></span> Criando conta…';
   API.signup({name:v.n,email:v.e,phone:v.t,password:v.p}).then(()=>{toast('Conta criada com sucesso.');go('#/app')}).catch(err=>{b.disabled=false;b.textContent='Criar conta';$('#se_e').textContent=(err.fields&&err.fields.email)||err.message})}}}

