/* ---------- gráficos ---------- */
function nice(m){const p=Math.pow(10,Math.floor(Math.log10(m||1)));const f=m/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p}
function barsChart(rows,{stacked=true,c1='var(--gold)',c2='var(--err)',fmt=v=>v}={}){
 const W=640,H=250,P={l:40,r:8,t:10,b:28};const iw=W-P.l-P.r,ih=H-P.t-P.b;
 const max=nice(Math.max(...rows.map(r=>stacked?r.a+r.b:Math.max(r.a,r.b)),1));
 const bw=iw/rows.length;let g='';
 for(let i=0;i<=4;i++){const y=P.t+ih-ih*i/4;g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${P.l-6}" y="${y+4}" text-anchor="end" fill="var(--mute)" font-size="11">${fmt(max*i/4)}</text>`}
 let b='';rows.forEach((r,i)=>{const x=P.l+i*bw;const sk=rows.length>10&&i%2;
  if(stacked){const ha=ih*r.a/max,hb=ih*r.b/max,w=bw*.62,xx=x+(bw-w)/2;b+=`<rect x="${xx}" y="${P.t+ih-ha}" width="${w}" height="${ha}" rx="3" fill="${c1}"/><rect x="${xx}" y="${P.t+ih-ha-hb}" width="${w}" height="${hb}" rx="3" fill="${c2}"/>`}
  else{const w=bw*.3,ha=ih*r.a/max,hb=ih*r.b/max;b+=`<rect x="${x+bw*.18}" y="${P.t+ih-ha}" width="${w}" height="${ha}" rx="3" fill="${c1}"/><rect x="${x+bw*.18+w+2}" y="${P.t+ih-hb}" width="${w}" height="${hb}" rx="3" fill="${c2}"/>`}
  if(!sk)b+=`<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" fill="var(--mute)" font-size="11">${esc(r.l)}</text>`});
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de barras">${g}${b}</svg>`}
function lineChart(labels,vals){
 const W=640,H=230,P={l:46,r:16,t:14,b:28};const iw=W-P.l-P.r,ih=H-P.t-P.b;const max=nice(Math.max(...vals,1));
 let g='';for(let i=0;i<=4;i++){const y=P.t+ih-ih*i/4;g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${P.l-6}" y="${y+4}" text-anchor="end" fill="var(--mute)" font-size="11">${(max*i/4/1000).toFixed(1)}k</text>`}
 const pts=vals.map((v,i)=>[P.l+iw*i/(vals.length-1),P.t+ih-ih*v/max]);
 const poly=pts.map(p=>p.join(',')).join(' ');
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de linha do fluxo de caixa">${g}<polyline points="${poly}" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--gold-hi)"/>`).join('')}${labels.map((l,i)=>`<text x="${pts[i][0]}" y="${H-8}" text-anchor="middle" fill="var(--mute)" font-size="11">${l}</text>`).join('')}</svg>`}
function hbars(items,fmt=v=>v){const m=Math.max(...items.map(i=>i.v),1);return items.map(i=>`<div class="hb"><span>${esc(i.l)}</span><div class="tr"><i style="width:${i.v/m*100}%"></i></div><b>${fmt(i.v)}</b></div>`).join('')}

