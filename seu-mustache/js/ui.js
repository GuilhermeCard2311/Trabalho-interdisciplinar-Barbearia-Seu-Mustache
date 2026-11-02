/* ---------- UI utilitários ---------- */
function toast(msg,err){const t=document.createElement('div');t.className='toast'+(err?' err':'');t.innerHTML=`${I(err?'warn':'check',18)}<span>${esc(msg)}</span>`;$('#toasts').appendChild(t);setTimeout(()=>t.remove(),3400)}
function closeModal(){$('#modal-root').innerHTML=''}
function modal(inner,opt={}){closeModal();const el=document.createElement('div');el.className='ov';el.innerHTML=`<div class="md ${opt.wide?'wide':''}" role="dialog" aria-modal="true">${inner}</div>`;el.addEventListener('mousedown',e=>{if(e.target===el)closeModal()});$('#modal-root').appendChild(el);const f=el.querySelector('input:not([type=hidden]),select,textarea');(f||el.querySelector('button'))?.focus()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('.side.open')&&toggleSide(false)}});
document.addEventListener('click',e=>{
 const c=e.target.closest('.chip');if(c){const box=c.closest('.chips');$$('.chip',box).forEach(x=>x.classList.remove('on'));c.classList.add('on');$('input[type=hidden]',box.parentElement).value=c.dataset.v;return}
 const g=e.target.closest('[data-go]');if(g){e.preventDefault();const id=g.dataset.go;closeNav();if(parse()[0]!==''){pendingScroll=id;location.hash='#/'}else scrollToId(id)}
});
function scrollToId(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth'});else window.scrollTo({top:0,behavior:'smooth'})}
function closeNav(){$('.nav')?.classList.remove('open')}

function fieldHTML(f,val){
 const v=val??f.def??'';const id='f_'+f.k;
 let inp='';
 if(f.type==='chips'){inp=`<input type="hidden" name="${f.k}" value="${esc(v||f.opts[0])}"><div class="chips">${f.opts.map(o=>`<button type="button" class="chip ${(v||f.opts[0])===o?'on':''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`}
 else if(f.type==='select'){inp=`<select class="input" id="${id}" name="${f.k}"><option value="">${f.ph||'Selecione'}</option>${f.opts.map(o=>{const [ov,ol]=Array.isArray(o)?o:[o,o];return `<option value="${esc(ov)}" ${String(v)===String(ov)?'selected':''}>${esc(ol)}</option>`}).join('')}</select>`}
 else if(f.type==='textarea'){inp=`<textarea class="input" id="${id}" name="${f.k}" placeholder="${esc(f.ph||'')}">${esc(v)}</textarea>`}
 else inp=`<input class="input" id="${id}" name="${f.k}" type="${f.type||'text'}" value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.type==='number'?'min="0" step="any"':''}>`;
 return `<div class="field ${f.full?'full':''}"><label for="${id}">${f.label}${f.req?' *':''}</label>${inp}<small class="err" id="e_${f.k}" role="alert"></small></div>`}
function formModal({title,fields,vals={},save,label='Salvar',wide}){
 modal(`<div class="md-h"><h2>${title}</h2><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${I('x')}</button></div><form id="mf" novalidate class="fgrid">${fields.map(f=>fieldHTML(f,vals[f.k])).join('')}<div class="md-f"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn">${label}</button></div></form>`,{wide});
 $('#mf').onsubmit=e=>{e.preventDefault();const v={};$$('#mf [name]').forEach(el=>v[el.name]=el.value.trim());let ok=true,first=null;
  fields.forEach(f=>{const need=typeof f.req==='function'?f.req(v):f.req;const el=$(`#mf [name="${f.k}"]`),er=$('#e_'+f.k);const bad=need&&!v[f.k];er.textContent=bad?'Preencha este campo.':'';el.setAttribute('aria-invalid',bad?'true':'false');if(bad){ok=false;first=first||el}});
  if(!ok){first.focus();return}
  closeModal();save(v)}}
function confirmModal(text,fn,btn='Excluir'){modal(`<div class="md-h"><h2>Confirmar</h2></div><p>${text}</p><div class="md-f" style="display:flex;margin-top:20px"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger" id="cf">${btn}</button></div>`);$('#cf').onclick=()=>{closeModal();fn()}}

