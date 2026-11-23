/* ===== exam-style sheets: a floating step bubble, a solution that advances with the deck's clicks, and Insert > Recommended Charts ===== */
(function(){
const D=window.__deck;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>(v<0?'−':'')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:2});
const nice=(lo,hi,n)=>{if(lo===hi){lo-=1;hi+=1;}const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw-1e-12);const a=Math.floor(lo/st+1e-9)*st,b=Math.ceil(hi/st-1e-9)*st,t=[];for(let v=a;v<=b+st/2;v+=st)t.push(+v.toFixed(8));return t;};
const COLS=['#4472C4','#ED7D31','#A5A5A5','#FFC000'];
const TYPES={col:{n:'עמודות מקובצות',e:'Clustered Column',d:'אקסל שם את המחיר בפקיעה כתוויות על הציר האופקי, וצייר כל רווח כעמודה. המספרים נכונים, אבל צורת הקו אינה נראית.',ok:false},
 bar:{n:'טורים מקובצים',e:'Clustered Bar',d:'אותן עמודות, שוכבות. המחיר בפקיעה עבר לציר האנכי, וזה לא מה שהשאלה מבקשת.',ok:false},
 line:{n:'קו',e:'Line',d:'המחיר בפקיעה מופיע כתוויות, וכל עמודה אחריו היא קו. המרחק בין התוויות קבוע תמיד, גם כשהמחירים אינם במרווחים שווים.',ok:true},
 scatter:{n:'פיזור',e:'Scatter',d:'המחיר בפקיעה הוא הציר האופקי, כמספר, וכל עמודה אחריו היא קו של רווח או הפסד. זה התרשים שהשאלה מבקשת.',ok:true},
 lineflat:{n:'קו',e:'Line',d:'',ok:false}};

/* one chart, drawn as Excel draws it. d: {x:[..], names:[..], ys:[[..]], xname}; o.hide: hidden series, o.sel: the selected one */
function chartSvg(type,d,o){o=o||{};const W=o.w||440,H=o.h||262,mini=!!o.mini,fs=mini?0:12;const hide=o.hide||[];
 const idx=d.ys.map((_,k)=>k).filter(k=>!hide.includes(k)),multi=idx.length>1,n=d.ys[0].length,cat=type!=='scatter';
 const bar=type==='bar',lab=type==='lineflat'||!d.x?Array.from({length:n},(_,i)=>i+1):d.x;
 const all=[].concat(...idx.map(k=>d.ys[k])).filter(v=>typeof v==='number');if(!all.length)all.push(0,1);
 const vt=nice(Math.min(0,...all),Math.max(0,...all),mini?3:5),V0=vt[0],V1=vt[vt.length-1];
 const xs=cat?null:nice(Math.min(0,...d.x),Math.max(...d.x),mini?3:6);
 const ml=mini?6:(bar?40:(o.axt?58:44)),mr=mini?6:16,mt=mini?6:(o.title===false?12:34),mb=mini?6:((multi?24:0)+(o.axt?22:0)+24);
 const PW=W-ml-mr,PH=H-mt-mb;
 const T=(x,y,t,a,ex)=>`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fs}" text-anchor="${a||'middle'}" fill="#595959" ${/[֐-׿]/.test(String(t))?'direction="rtl"':''} ${ex||''}>${esc(t)}</text>`;
 let p=`<rect width="${W}" height="${H}" fill="#fff"/>`;
 if(bar){const X=v=>ml+(v-V0)/(V1-V0)*PW,Yc=i=>mt+PH-(i+0.5)*PH/n;
  vt.forEach(t=>{p+=`<line x1="${X(t).toFixed(1)}" y1="${mt}" x2="${X(t).toFixed(1)}" y2="${H-mb}" stroke="${t===0?'#8c8c8c':'#e3e3e3'}"/>`;if(!mini)p+=T(X(t),H-mb+16,fmt(t));});
  const bh=PH/n/(idx.length+0.6);idx.forEach((k,j)=>{d.ys[k].forEach((v,i)=>{if(typeof v!=='number')return;const y=Yc(i)-bh*idx.length/2+j*bh,x0=X(0),x1=X(v);p+=`<rect x="${Math.min(x0,x1).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.abs(x1-x0).toFixed(1)}" height="${(bh-1).toFixed(1)}" fill="${COLS[k%4]}"/>`;});});
  if(!mini)lab.forEach((t,i)=>{p+=T(ml-6,Yc(i)+4,fmt(t),'end');});}
 else{const XA=cat?0.5:xs[0],XB=cat?n+0.5:xs[xs.length-1],X=v=>ml+(v-XA)/(XB-XA)*PW,Y=v=>mt+(V1-v)/(V1-V0)*PH;
  if(o.grid!==false)vt.forEach(t=>{p+=`<line x1="${ml}" y1="${Y(t).toFixed(1)}" x2="${W-mr}" y2="${Y(t).toFixed(1)}" stroke="${t===0?'#8c8c8c':'#e3e3e3'}" stroke-width="${t===0?1.4:1}"/>`;});
  else p+=`<line x1="${ml}" y1="${Y(0)}" x2="${W-mr}" y2="${Y(0)}" stroke="#8c8c8c" stroke-width="1.4"/>`;
  if(!cat&&!mini)xs.forEach(t=>{p+=`<line x1="${X(t).toFixed(1)}" y1="${mt}" x2="${X(t).toFixed(1)}" y2="${H-mb}" stroke="#eeeeee"/>`;});
  if(!mini){vt.forEach(t=>{p+=T(ml-6,Y(t)+4,fmt(t),'end');});if(cat)lab.forEach((t,i)=>{p+=T(X(i+1),H-mb+16,fmt(t));});else xs.forEach(t=>{p+=T(X(t),H-mb+16,fmt(t));});}
  idx.forEach((k,j)=>{const c=COLS[k%4],ys=d.ys[k],sel=o.sel===k;
   if(type==='col'){const bw=PW/n/(idx.length+0.6);ys.forEach((v,i)=>{if(typeof v!=='number')return;const x=X(i+1)-bw*idx.length/2+j*bw,y0=Y(0),y1=Y(v);p+=`<rect x="${x.toFixed(1)}" y="${Math.min(y0,y1).toFixed(1)}" width="${(bw-1).toFixed(1)}" height="${Math.abs(y1-y0).toFixed(1)}" fill="${c}"/>`;});}
   else{const pts=[];ys.forEach((v,i)=>{const xv=cat?i+1:d.x[i];if(typeof v==='number'&&typeof xv==='number')pts.push([X(xv),Y(v),v]);});const ps=pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
    let gq=`<g class="cs${sel?' sel':''}" data-k="${k}">`;if(pts.length>1){if(!mini)gq+=`<polyline points="${ps}" fill="none" stroke="transparent" stroke-width="14"/>`;gq+=`<polyline class="cl" points="${ps}" fill="none" stroke="${c}" stroke-width="${mini?2:2.4}" stroke-linejoin="round" stroke-linecap="round"/>`;}
    if(type==='scatter'||!mini)pts.forEach(q=>{gq+=sel?`<rect x="${(q[0]-4).toFixed(1)}" y="${(q[1]-4).toFixed(1)}" width="8" height="8" fill="#fff" stroke="${c}" stroke-width="1.6"/>`:`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${mini?2:3.6}" fill="${c}"/>`;if(o.labels&&!mini)gq+=`<text x="${q[0].toFixed(1)}" y="${(q[1]-9).toFixed(1)}" font-size="12" font-weight="600" text-anchor="middle" fill="${c}">${fmt(q[2])}</text>`;});
    p+=gq+'</g>';}});
  if(!mini)(o.marks||[]).forEach(m=>{const ci=v=>{const j=lab.indexOf(v);if(j>=0)return j+1;for(let q=0;q<lab.length-1;q++)if(v>lab[q]&&v<lab[q+1])return q+1+(v-lab[q])/(lab[q+1]-lab[q]);return 1;};const x=X(cat?ci(m.x):m.x),y=Y(m.y),c=m.c||'#c00000',tw=String(m.t).length*6.9+16,dx=m.dx||0,dy=m.dy||-34;let bx=x+dx-tw/2;bx=Math.max(ml+2,Math.min(W-mr-tw-2,bx));const by=y+dy;
   p+=`<g class="cm"><line x1="${x}" y1="${y}" x2="${bx+tw/2}" y2="${by+(dy<0?20:0)}" stroke="${c}" stroke-width="1.3"/><circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="${c}" stroke-width="2.2"/><rect x="${bx}" y="${by}" width="${tw}" height="20" rx="4" fill="#fff" stroke="${c}" stroke-width="1.3"/><text x="${bx+tw/2}" y="${by+14.5}" font-size="12.5" font-weight="700" text-anchor="middle" fill="${c}" direction="rtl">${esc(m.t)}</text></g>`;});}
 if(!mini){const names=type==='lineflat'?d.names:d.names;if(o.title!==false)p+=`<text x="${W/2}" y="22" font-size="15.5" text-anchor="middle" fill="#404040" ${/[֐-׿]/.test(o.title||'')?'direction="rtl"':''}>${esc(o.title||(multi||!idx.length?'Chart Title':names[idx[0]]))}</text>`;
  if(multi){const wd=idx.map(k=>26+String(names[k]).length*7.4),tot=wd.reduce((a,b)=>a+b,0)+14*(wd.length-1);let x=(W-tot)/2;const ly=H-10;idx.forEach((k,j)=>{p+=`<g class="lg" data-k="${k}"><rect x="${x-3}" y="${ly-14}" width="${wd[j]+2}" height="18" fill="${o.sel===k?'#e7eefb':'transparent'}"/><line x1="${x}" y1="${ly-4}" x2="${x+18}" y2="${ly-4}" stroke="${COLS[k%4]}" stroke-width="2.4"/><circle cx="${x+9}" cy="${ly-4}" r="3" fill="${COLS[k%4]}"/>`+T(x+23,ly,names[k],'start')+'</g>';x+=wd[j]+14;});}
  if(o.axt&&!bar){p+=T((ml+W-mr)/2,H-(multi?26:8),o.axt[0]||'','middle','font-weight="600"');p+=`<text x="13" y="${(mt+H-mb)/2}" font-size="12" text-anchor="middle" fill="#595959" font-weight="600" transform="rotate(-90 13 ${(mt+H-mb)/2})" direction="rtl">${esc(o.axt[1]||'')}</text>`;}}
 return `<svg viewBox="0 0 ${W} ${H}" width="${mini?'100%':W}" height="${mini?'100%':H}" dir="ltr" xmlns="http://www.w3.org/2000/svg" style="font-family:'Segoe UI',Calibri,Arial,sans-serif">${p}</svg>`;}
window.__xqChartSvg=chartSvg;
const P=XL.parseAddr,A=XL.addr;
const block=rg=>{const [a,c]=String(rg).split(':');const p=P(a),q=P(c||a);return {r0:Math.min(p.r,q.r),r1:Math.max(p.r,q.r),c0:Math.min(p.c,q.c),c1:Math.max(p.c,q.c)};};
const NOSEL='סמנו קודם את הטבלה: עמודת המחיר בפקיעה ועמודות הרווח, כולל שורת הכותרות.';

/* ---------------- Insert > Recommended Charts, on one mounted sheet ---------------- */
function chartTool(box,host,api,cfg,K,onChange){
 let chart=null,tab='home',dlg=null,pick=0;const wrap=api.wrap;wrap.style.position='relative';
 const ins=document.createElement('div');ins.className='xl-ins';ins.innerHTML=
  `<div class="xg off"><div class="xg-b"><button disabled><span class="ic">▦</span><small>PivotTable</small></button><button disabled><span class="ic">▤</span><small>טבלה</small></button></div><div class="xg-n">טבלאות</div></div>`
  +`<div class="xg off"><div class="xg-b"><button disabled><span class="ic">▣</span><small>תמונות</small></button><button disabled><span class="ic">◇</span><small>צורות</small></button></div><div class="xg-n">איורים</div></div>`
  +`<div class="xg xg-ch"><div class="xg-b"><button data-q="rec" class="big" title="תרשימים מומלצים (Recommended Charts): אקסל מציע תרשימים לפי הנתונים שסומנו"><svg viewBox="0 0 34 30" width="34" height="30"><rect x="2" y="16" width="6" height="11" fill="#4472C4"/><rect x="10" y="9" width="6" height="18" fill="#ED7D31"/><rect x="18" y="13" width="6" height="14" fill="#A5A5A5"/><path d="M27 3l1.6 3.6L32 8l-3.4 1.4L27 13l-1.6-3.6L22 8l3.4-1.4z" fill="#e8a400"/></svg><small>תרשימים<br>מומלצים</small></button>`
  +`<span class="mini"><button data-q="t-col" title="עמודות"><svg viewBox="0 0 20 18" width="20" height="18"><rect x="2" y="8" width="4" height="9" fill="#4472C4"/><rect x="8" y="3" width="4" height="14" fill="#4472C4"/><rect x="14" y="10" width="4" height="7" fill="#4472C4"/></svg></button><button data-q="t-lineflat" title="קו"><svg viewBox="0 0 20 18" width="20" height="18"><polyline points="2,14 7,7 12,11 18,3" fill="none" stroke="#4472C4" stroke-width="2"/></svg></button><button data-q="t-scatter" title="פיזור (X, Y)"><svg viewBox="0 0 20 18" width="20" height="18"><circle cx="4" cy="13" r="2" fill="#4472C4"/><circle cx="9" cy="8" r="2" fill="#4472C4"/><circle cx="15" cy="5" r="2" fill="#4472C4"/><circle cx="14" cy="13" r="2" fill="#ED7D31"/></svg></button><button disabled title="עוגה"><svg viewBox="0 0 20 18" width="20" height="18"><circle cx="10" cy="9" r="7" fill="#c9c9c9"/><path d="M10 9V2a7 7 0 0 1 7 7z" fill="#9a9a9a"/></svg></button></span></div><div class="xg-n">תרשימים</div></div>`
  +`<div class="xg off"><div class="xg-b"><button disabled><span class="ic">⛓</span><small>קישור</small></button><button disabled><span class="ic">A</span><small>תיבת טקסט</small></button></div><div class="xg-n">קישורים וטקסט</div></div>`;
 host.insertBefore(ins,host.querySelector('.xl-top'));
 const tabs=[...host.querySelectorAll('.xl-tabs .xt')],tIns=tabs.find(t=>t.textContent.trim()==='הוספה'),tHome=tabs.find(t=>t.textContent.trim()==='בית');
 function setTab(t){tab=t;host.classList.toggle('xq-ins',t==='ins');tIns.classList.toggle('on',t==='ins');tHome.classList.toggle('on',t!=='ins');}
 cfg.onTab=t=>{if(t===tIns){setTab(tab==='ins'?'home':'ins');return true;}if(t===tHome&&tab==='ins'){setTab('home');return true;}return false;};
 const say=m=>{let tt=box.querySelector('.xq-toast');if(!tt){tt=document.createElement('div');tt.className='xq-toast';box.appendChild(tt);}tt.textContent=m;tt.classList.add('on');clearTimeout(say.u);say.u=setTimeout(()=>tt.classList.remove('on'),3800);};
 /* how Excel reads a selected block: a first row of text holds the names, the first column is the axis, every other column is a series */
 function read(rg){const B=block(rg);if(B.c1-B.c0<1)return null;const cols=[];for(let c=B.c0;c<=B.c1;c++){const col=[];for(let r=B.r0;r<=B.r1;r++)col.push(api.get(A(r,c)));cols.push(col);}
  const head=cols.every(c=>typeof c[0]!=='number');const names=cols.map((c,i)=>head&&c[0]!=null&&c[0]!==''?String(c[0]):'Series'+(i+1));const body=cols.map(c=>head?c.slice(1):c);
  const rows=body[0].map((_,i)=>i).filter(i=>typeof body[0][i]==='number'&&body.slice(1).some(c=>typeof c[i]==='number'));if(rows.length<2)return null;const v=body.map(c=>rows.map(i=>c[i]));
  return {xy:{x:v[0],names:names.slice(1),ys:v.slice(1),xname:names[0]},flat:{x:null,names,ys:v,xname:''}};}
 const dataOf=(type,R)=>type==='lineflat'?R.flat:R.xy;
 const orderOf=R=>R.xy.ys.length>1?['col','bar','line','scatter']:['col','bar','line','scatter'];
 function closeDlg(){if(dlg){dlg.remove();dlg=null;}}
 function openDlg(rg,sel){closeDlg();const R=read(rg);if(!R){say(NOSEL);return false;}const ORDER=orderOf(R);
  pick=typeof sel==='string'?Math.max(0,ORDER.indexOf(sel)):(sel||0);dlg=document.createElement('div');dlg.className='xq-dlg';
  const draw=()=>{const t=ORDER[pick],d=dataOf(t,R);dlg.querySelector('.dl-list').innerHTML=ORDER.map((x,i)=>`<button class="dl-th${i===pick?' on':''}" data-i="${i}" data-ty="${x}">${chartSvg(x,dataOf(x,R),{mini:1,w:150,h:60})}<span>${TYPES[x].n} <i dir="ltr">${TYPES[x].e}</i></span></button>`).join('');
   dlg.querySelector('.dl-main').innerHTML=`<b class="dl-n">${TYPES[t].n} <i dir="ltr">(${TYPES[t].e})</i></b><div class="dl-pv">${chartSvg(t,d,{w:400,h:190})}</div><div class="dl-d ${TYPES[t].ok?'ok':'no'}"><b>כך אקסל קרא את הנתונים:</b> ${TYPES[t].d}</div>`;};
  dlg.innerHTML=`<div class="dl-h"><span>הוספת תרשים</span><button data-d="x" aria-label="סגירה">✕</button></div><div class="dl-t"><span class="on">תרשימים מומלצים</span><span>כל התרשימים</span></div><div class="dl-b"><div class="dl-list"></div><div class="dl-main"></div></div><div class="dl-f"><button data-d="ok" class="pri">אישור</button><button data-d="x">ביטול</button></div>`;
  host.appendChild(dlg);draw();dlg.__draw=draw;dlg.__rg=rg;dlg.__order=ORDER;dlg.__pick=i=>{pick=typeof i==='string'?Math.max(0,ORDER.indexOf(i)):i;draw();};
  dlg.addEventListener('click',e=>{const th=e.target.closest('.dl-th');if(th){pick=+th.dataset.i;draw();return;}const d=e.target.closest('[data-d]');if(!d)return;if(d.dataset.d==='ok'){insert(rg,ORDER[pick]);}closeDlg();setTab('home');});return true;}
 function redraw(){if(!chart)return;const R=read(chart.rg);const bx=chart.el.querySelector('.ch-b');if(!R){bx.innerHTML='<div class="ch-e">אין נתונים מספריים בטווח שסומן</div>';return;}const d=dataOf(chart.type,R);chart.names=d.names;
  bx.innerHTML=chartSvg(chart.type,d,{w:chart.w,h:chart.h,labels:chart.labels,grid:chart.grid,axt:chart.axt?[chart.xn||R.xy.xname,chart.yn||'רווח או הפסד']:null,marks:chart.marks,title:chart.title,hide:chart.hide,sel:chart.sel});
  const w=chart.el.querySelector('.ch-w');const flat=chart.type==='lineflat',extra=flat&&!chart.hide.includes(0);
  w.hidden=!(extra||chart.type==='col'||chart.type==='bar');w.textContent=extra?'הקו '+d.names[0]+' הוא קו עודף: אקסל קרא את עמודת המחיר כסדרה. לחצו על הקו, ואז Delete. עדיף: למחוק את התרשים (✕), ולבחור קו מתוך ״תרשימים מומלצים״.':'בתרשים הזה לא רואים את צורת הקו. מחקו אותו (✕), ובחרו תרשים קו.';
  const dl=chart.el.querySelector('[data-c="ds"]');dl.hidden=chart.sel==null;if(chart.sel!=null)dl.textContent='Delete: מחיקת הקו '+d.names[chart.sel];}
 function insert(rg,type,at,opt){removeChart(true);const B=block(rg);chart=Object.assign({rg,type,w:440,h:244,labels:false,grid:true,axt:false,marks:null,hide:[],sel:null},cfg.chartOpt||{},opt||{});chart.hide=(chart.hide||[]).slice();
  const el=document.createElement('div');el.className='xq-ch new';el.tabIndex=0;el.innerHTML=`<div class="ch-b"></div><div class="ch-w" hidden></div><div class="ch-t"><button data-c="plus" title="רכיבי תרשים (Chart Elements)">＋</button><button data-c="del" title="מחיקת התרשים">✕</button></div><button data-c="ds" class="ch-ds" hidden></button><div class="ch-m" hidden><label><input type="checkbox" data-o="axt">כותרות צירים</label><label><input type="checkbox" data-o="labels">תוויות נתונים</label><label><input type="checkbox" data-o="grid" checked>קווי רשת</label></div>`;
  wrap.appendChild(el);chart.el=el;
  chart.at=at||cfg.chartAt||A(B.r0,Math.min(B.c1+2,25));{const td0=api.td(chart.at);if(td0){const av=(td0.getBoundingClientRect().right-wrap.getBoundingClientRect().left)/K()-6;if(av>120&&av<chart.w){chart.w=Math.max(300,Math.floor(av));chart.h=Math.round(chart.w*0.56);}}}el.style.width=chart.w+'px';pos();
  el.querySelectorAll('[data-o]').forEach(i=>{i.checked=!!chart[i.dataset.o];});redraw();setTimeout(()=>el.classList.remove('new'),900);
  el.addEventListener('click',e=>{const c=e.target.closest('[data-c]');if(c){if(c.dataset.c==='del')removeChart();else if(c.dataset.c==='ds')delSeries(chart.sel);else el.querySelector('.ch-m').hidden=!el.querySelector('.ch-m').hidden;return;}
   const sg=e.target.closest('.cs,.lg');if(sg){chart.sel=+sg.dataset.k;redraw();el.focus();}else if(!e.target.closest('.ch-m')&&chart.sel!=null){chart.sel=null;redraw();}});
  el.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&chart&&chart.sel!=null){e.preventDefault();e.stopPropagation();delSeries(chart.sel);}});
  el.addEventListener('change',e=>{const o=e.target.dataset.o;if(o){chart[o]=e.target.checked;redraw();}});
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button,label,input,.cs,.lg'))return;const k=K(),x0=e.clientX,y0=e.clientY,l0=parseFloat(el.style.left),t0=parseFloat(el.style.top);el.setPointerCapture(e.pointerId);el.classList.add('drag');
   chart.moved=true;const mv=ev=>{el.style.left=(l0+(ev.clientX-x0)/k)+'px';el.style.top=Math.max(0,t0+(ev.clientY-y0)/k)+'px';};const up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.classList.remove('drag');};el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);});
  if(onChange)onChange();return chart;}
 function pos(){if(!chart||chart.moved)return;const td=api.td(chart.at);if(!td)return;const k=K(),r=td.getBoundingClientRect(),w=wrap.getBoundingClientRect();if(!r.width)return;
  chart.el.style.left=Math.max(2,(r.right-w.left)/k+wrap.scrollLeft-chart.w)+'px';chart.el.style.top=((r.top-w.top)/k+wrap.scrollTop)+'px';}
 function delSeries(k){if(!chart||k==null)return;if(!chart.hide.includes(k))chart.hide.push(k);chart.sel=null;redraw();if(onChange)onChange();}
 function selSeries(name){if(!chart)return;const k=(chart.names||[]).indexOf(name);chart.sel=k<0?null:k;redraw();}
 function removeChart(quiet){if(chart){chart.el.remove();chart=null;if(!quiet&&onChange)onChange();}}
 ins.addEventListener('click',e=>{const q=e.target.closest('[data-q]');if(!q)return;const s=api.selection(),rg=s.a+':'+s.b;
  if(q.dataset.q==='rec'){openDlg(rg,0);}else{const R=read(rg);if(!R){say(NOSEL);return;}insert(rg,q.dataset.q.slice(2));setTab('home');}});
 const old=cfg.onChange;cfg.onChange=()=>{if(old)old();redraw();pos();};if(window.ResizeObserver)new ResizeObserver(()=>pos()).observe(wrap.querySelector('.xl-g'));
 return {pos,ins,tIns,tHome,setTab,read,openDlg,closeDlg,insert,removeChart,delSeries,selSeries,redraw,chart:()=>chart,dlg:()=>dlg};}

/* ---------------- "animation in Excel": the whole chart routine, played on a copy of the table ---------------- */
function playAnim(slide,spec){const old=slide.querySelector('.xq-an');if(old)old.remove();
 const ov=document.createElement('div');ov.className='xq-an';ov.innerHTML=`<div class="an-h"><b>🎬 הנפשה באקסל: מטבלה לתרשים</b><span class="an-dots"></span><button data-a="x">סגירה ✕</button></div><div class="an-s"><div class="an-sheet"></div><div class="an-cur"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 2l14 11h-7l4 8-3 1.5-4-8-4 5z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg><i></i></div><div class="an-key" hidden>Delete</div></div><div class="an-c"><div class="an-t"></div><div class="an-b"><button data-a="prev">▶ הקודם</button><button data-a="play" class="go">⏸ השהיה</button><button data-a="next">הבא ◀</button><button data-a="again">↻ מההתחלה</button></div></div>`;
 slide.appendChild(ov);ov.addEventListener('click',e=>e.stopPropagation());
 const hostA=ov.querySelector('.an-sheet'),cur=ov.querySelector('.an-cur'),cap=ov.querySelector('.an-t'),keyEl=ov.querySelector('.an-key');
 const cfg={rows:spec.rows,cols:Math.max(spec.cols,13),widths:spec.widths,data:spec.data,headRows:spec.head||[],fit:false,fmt:spec.fmt||{}};
 const api=XL.mount(hostA,cfg);hostA.classList.add('xl-col');api.zoom(spec.rows>13?0.85:0.95);
 const fitA=()=>{const k=slide.getBoundingClientRect().width/1280||1,w=api.wrap,st=ov.querySelector('.an-s');const h=(st.getBoundingClientRect().bottom-w.getBoundingClientRect().top)/k-32;if(h>80)w.style.height=Math.floor(h)+'px';};fitA();requestAnimationFrame(fitA);const K=()=>slide.getBoundingClientRect().width/1280||1;const T=chartTool(ov,hostA,api,cfg,K);
 const B=block(spec.rg),stage=ov.querySelector('.an-s');spec=Object.assign({},spec,spec.at?{at:spec.at.replace(/\d+$/,String(B.r0+2))}:{});
 const at=el=>{const s=stage.getBoundingClientRect(),r=el.getBoundingClientRect(),k=K();return [(r.left+r.width/2-s.left)/k,(r.top+r.height/2-s.top)/k];};
 let timers=[];const later=(f,ms)=>{const t=setTimeout(f,ms);timers.push(t);};const stop=()=>{timers.forEach(clearTimeout);timers=[];};
 const move=(el,dx,dy)=>{if(!el)return;const [x,y]=at(el);cur.style.left=(x+(dx||0))+'px';cur.style.top=(y+(dy||0))+'px';};
 const click=()=>{cur.classList.remove('ck');void cur.offsetWidth;cur.classList.add('ck');};
 const only=spec.only||null,names=()=>((T.chart()||{}).names||[]);
 const F=[
  {t:'<b>שלב 1: מסמנים את הטבלה.</b> לוחצים על הכותרת של עמודת המחיר בפקיעה, וגוררים עד התא האחרון. שורת הכותרות נמצאת בתוך הסימון: ממנה אקסל לוקח את השמות.',
   set:()=>{T.closeDlg();T.removeChart(true);T.setTab('home');api.selectRange(A(B.r0,B.c0),A(B.r0,B.c0));},
   run:()=>{move(api.td(A(B.r0,B.c0)));later(()=>{click();const n=B.r1-B.r0;for(let i=0;i<=n;i++)later(()=>{api.selectRange(A(B.r0,B.c0),A(B.r0+i,B.c1));move(api.td(A(B.r0+i,B.c1)));},180+i*110);},800);},
   end:()=>api.selectRange(A(B.r0,B.c0),A(B.r1,B.c1))},
  {t:'<b>שלב 2: הכרטיסייה ״הוספה״ (Insert).</b> רצועת הכלים מתחלפת, ומופיעה קבוצת ״תרשימים״.',
   set:()=>{T.closeDlg();T.removeChart(true);T.setTab('home');api.selectRange(A(B.r0,B.c0),A(B.r1,B.c1));},run:()=>{move(T.tIns);later(()=>{click();T.setTab('ins');},900);},end:()=>T.setTab('ins')},
  {t:'<b>שלב 3: ״תרשימים מומלצים״ (Recommended Charts).</b> אקסל קורא את הטבלה שסומנה, ומציע כמה תרשימים. הראשון ברשימה אינו בהכרח המתאים.',
   set:()=>{T.closeDlg();T.removeChart(true);T.setTab('ins');},run:()=>{move(T.ins.querySelector('[data-q="rec"]'));later(()=>{click();T.openDlg(spec.rg,0);},900);},end:()=>{if(!T.dlg())T.openDlg(spec.rg,0);}},
  {t:'<b>שלב 4: בוחרים בתרשים קו (Line).</b> בדוגמה המוקטנת רואים את הקו השבור של הרווח: המחיר בפקיעה למטה, והרווח או ההפסד בצד. לוחצים ״אישור״.',
   set:()=>{T.removeChart(true);T.setTab('ins');if(!T.dlg())T.openDlg(spec.rg,0);else T.dlg().__pick(0);},
   run:()=>{later(()=>{const d=T.dlg();move(d.querySelector('[data-ty="line"]'));later(()=>{click();d.__pick('line');later(()=>{move(d.querySelector('[data-d="ok"]'));later(()=>{click();T.closeDlg();T.setTab('home');T.insert(spec.rg,'line',spec.at);},800);},900);},800);},100);},
   end:()=>{T.closeDlg();T.setTab('home');if(!T.chart())T.insert(spec.rg,'line',spec.at);}}];
 if(only)F.push({t:'<b>שלב 5: מוחקים קווים עודפים.</b> אקסל צייר קו לכל עמודה שסומנה. כדי שיישאר רק הקו שהשאלה מבקשת: לוחצים פעם אחת על קו עודף, עד שהנקודות שלו מסומנות, ומקישים Delete.',
   set:()=>{T.closeDlg();T.setTab('home');T.insert(spec.rg,'line',spec.at);},
   run:()=>{const ex=names().filter(n=>!only.includes(n));ex.forEach((n,i)=>{later(()=>{const g=T.chart().el.querySelector('.cs[data-k="'+names().indexOf(n)+'"] circle');move(g||T.chart().el);later(()=>{click();T.selSeries(n);later(()=>{keyEl.hidden=false;later(()=>{keyEl.hidden=true;T.delSeries(names().indexOf(n));},650);},600);},750);},i*2300);});},
   end:()=>{keyEl.hidden=true;if(!T.chart())T.insert(spec.rg,'line',spec.at);names().forEach((n,k)=>{if(!only.includes(n))T.delSeries(k);});},ms:1200+2300*(spec.cols>3?2:2)});
 F.push({t:'<b>שלב '+(only?6:5)+': מסמנים את הנקודות המהותיות.</b> הכפתור ＋ שליד התרשים פותח את ״רכיבי תרשים״: מוסיפים כותרות צירים ותוויות נתונים. עכשיו רואים בתרשים את נקודת האיזון, ואת הרווח או ההפסד המרבי.',
   set:()=>{keyEl.hidden=true;T.closeDlg();T.setTab('home');if(!T.chart())T.insert(spec.rg,'line',spec.at);if(only)names().forEach((n,k)=>{if(!only.includes(n)&&!T.chart().hide.includes(k))T.delSeries(k);});const c=T.chart();c.labels=false;c.axt=false;c.marks=null;c.el.querySelector('.ch-m').hidden=true;T.redraw();},
   run:()=>{const c=T.chart();move(c.el.querySelector('[data-c="plus"]'));later(()=>{click();c.el.querySelector('.ch-m').hidden=false;later(()=>{const i=c.el.querySelector('[data-o="axt"]');move(i);later(()=>{click();i.checked=true;c.axt=true;T.redraw();later(()=>{const j=c.el.querySelector('[data-o="labels"]');move(j);later(()=>{click();j.checked=true;c.labels=true;c.marks=spec.marks||null;T.redraw();},650);},500);},650);},500);},850);},
   end:()=>{const c=T.chart();c.labels=true;c.axt=true;c.marks=spec.marks||null;c.el.querySelectorAll('[data-o]').forEach(x=>{x.checked=!!c[x.dataset.o];});T.redraw();},ms:4200});
 let i=0,playing=true;const dots=ov.querySelector('.an-dots'),pb=ov.querySelector('[data-a="play"]');
 const dur=f=>f.ms||(f===F[0]?2600+(B.r1-B.r0)*110:f===F[3]?4200:2600);
 function go(k,auto){stop();i=Math.max(0,Math.min(F.length-1,k));const f=F[i];for(let j=0;j<i;j++){/* earlier frames leave their end state */}
  f.set();cap.innerHTML=f.t;dots.innerHTML=F.map((_,j)=>`<i class="${j<i?'done':j===i?'on':''}"></i>`).join('');
  later(()=>f.run(),350);later(()=>{f.end();if(playing&&i<F.length-1)later(()=>go(i+1),1500);else if(i===F.length-1){playing=false;pb.textContent='▶ הפעלה';}},350+dur(f));}
 ov.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(!a)return;const x=a.dataset.a;
  if(x==='x'){stop();ov.remove();}else if(x==='prev'){playing=false;pb.textContent='▶ הפעלה';go(i-1);}else if(x==='next'){playing=false;pb.textContent='▶ הפעלה';stop();F[i].end();go(i+1);}
  else if(x==='again'){playing=true;pb.textContent='⏸ השהיה';go(0);}else if(x==='play'){playing=!playing;pb.textContent=playing?'⏸ השהיה':'▶ הפעלה';if(playing)go(i>=F.length-1?0:i);}});
 const off=()=>{stop();ov.remove();slide.removeEventListener('shown',off);};slide.addEventListener('shown',off);
 cur.style.left='60%';cur.style.top='70%';go(0);
 return {go,frames:F.length,end:()=>{stop();F.forEach((f,j)=>{i=j;f.set();f.end();});cap.innerHTML=F[F.length-1].t;},close:off,tool:T};}
window.__xqAnim=playAnim;

document.querySelectorAll('.xlq.xe').forEach(b=>{
 const host=b.querySelector('.sheet'),api=host.__api;if(!api)return;const cfg=api.layout(),slide=b.closest('.slide'),demo=b.hasAttribute('data-demo');
 const K=()=>slide.getBoundingClientRect().width/1280||1;
 const rel=el=>{const s=slide.getBoundingClientRect(),r=el.getBoundingClientRect(),k=K();return {l:(r.left-s.left)/k,t:(r.top-s.top)/k,r:(r.right-s.left)/k,b:(r.bottom-s.top)/k,w:r.width/k,h:r.height/k};};
 /* the chart is part of the answer: the check says so when it is missing */
 const fbEl=()=>b.querySelector('.xl-fb');const N=cfg.needChart;
 function chartOk(){if(!N)return true;const c=T.chart();if(!c||!(c.type==='scatter'||c.type==='line'))return false;const B=block(c.rg),Q=block(N.rg);if(!(B.c0<=Q.c0&&B.c1>=Q.c1&&B.r0<=Q.r0&&B.r1>=Q.r1))return false;
  if(N.only){const vis=(c.names||[]).filter((_,k)=>!c.hide.includes(k));return vis.length===N.only.length&&N.only.every(n=>vis.includes(n));}return true;}
 function need(){const f=fbEl();if(!f||!N)return;const o=f.querySelector('.xq-need');if(o)o.remove();if(!f.querySelector('.xl-ok'))return;const d=document.createElement('div');
  if(chartOk()){d.className='xq-need ok';d.textContent='✔ התרשים נכון: המחיר בפקיעה על הציר האופקי.';}
  else{const c=T.chart();d.className='xq-need';d.innerHTML=c&&N.only&&(c.type==='line'||c.type==='scatter')?'<b>בתרשים יש קו עודף.</b> השאלה מבקשת רק את '+N.only.join(', ')+'. לחצו על הקו העודף, ואז Delete.':'<b>חסר עדיין התרשים.</b> מסמנים את הטבלה כולל הכותרות, ואז: הוספה ← תרשימים מומלצים ← קו. לא בטוחים? לחצו ״🎬 הנפשה באקסל״.';}
  f.appendChild(d);}
 const T=chartTool(b,host,api,cfg,K,()=>setTimeout(need,0));
 const fbPos=()=>{const f=fbEl();if(!f||!f.firstChild)return;const o=rel(b),w=rel(api.wrap),fh=f.offsetHeight,fw=f.offsetWidth,x=o.l+10;if(!w.w)return;
  const full=[];host.querySelectorAll('.xl-g td').forEach(e=>{if(e.textContent.trim()!==''||e.classList.contains('tg'))full.push(rel(e));});const c=T&&T.chart();if(c)full.push(rel(c.el));
  const cost=y=>full.reduce((s,r)=>s+Math.max(0,Math.min(x+fw,r.r)-Math.max(x,r.l))*Math.max(0,Math.min(y+fh,r.b)-Math.max(y,r.t)),0);
  const ys=[w.t+32,w.b-fh-38,(w.t+w.b-fh)/2];let best=ys[0];ys.forEach(y=>{if(cost(y)<cost(best)-1)best=y;});f.style.top=Math.round(best-o.t)+'px';};
 {const f=fbEl();if(f){const mo=new MutationObserver(()=>{mo.disconnect();fbPos();if(N){need();ensureChart();}mo.observe(f,{childList:true});});mo.observe(f,{childList:true});slide.addEventListener('shown',fbPos);}}
 b.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(!x)return;if(x.dataset.x==='reset'){T.closeDlg();T.removeChart(true);T.setTab('home');}setTimeout(need,0);});
 /* a walkthrough that ran to its end leaves its chart, however fast it was clicked through */
 function ensureChart(){if(!cfg.steps||api.steps.index()>=0||!b.querySelector('.xl-ok')||T.chart())return;const insS=cfg.steps.find(x=>x.ch==='insert');if(!insS||!ensureChart.armed)return;T.insert(insS.rg,'line',insS.at);const c=T.chart();cfg.steps.filter(x=>x.ch==='del').forEach(x=>{const k=(c.names||[]).indexOf(x.ser);if(k>=0)c.hide.push(k);});const mk=[...cfg.steps].reverse().find(x=>x.ch==='mark');if(mk){c.labels=!!mk.labels;c.axt=!!mk.axt;c.marks=mk.marks;}c.el.querySelectorAll('[data-o]').forEach(x=>{x.checked=!!c[x.dataset.o];});T.redraw();}
 b.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(x)ensureChart.armed=x.dataset.x==='steps';},true);
 /* the animation button: the solved table of this very question */
 if(cfg.anim){const pr=b.querySelector('.xl-pr');const bt=document.createElement('button');bt.className='xq-anb';bt.innerHTML='🎬 הנפשה באקסל';bt.title='איך בונים את התרשים: סימון, הוספה, תרשימים מומלצים, מחיקת קו עודף';(pr||b).appendChild(bt);
  bt.addEventListener('click',e=>{e.stopPropagation();playAnim(slide,cfg.anim);});}

 /* ---------------- the floating bubble ---------------- */
 const stp=b.querySelector('.xl-stp');let bub=null;
 if(stp){bub=document.createElement('div');bub.className='xq-bub'+(demo?' demo':'');bub.hidden=true;slide.appendChild(bub);bub.appendChild(stp);
  if(demo){const nav=document.createElement('div');nav.className='xq-nav';nav.innerHTML='<button data-n="prev">▶ חזרה</button><button data-n="next" class="go">המשך ◀</button>';bub.appendChild(nav);nav.addEventListener('click',e=>{const n=e.target.closest('[data-n]');if(!n)return;e.stopPropagation();n.dataset.n==='next'?D.next():D.prev();});}
  bub.addEventListener('click',e=>e.stopPropagation());}
 const cur=()=>{const i=api.steps?api.steps.index():-1;return i>=0?cfg.steps[i]:null;};
 function anchorRect(st){const c=T.chart(),dg=T.dlg();if(st.ch==='tab')return rel(T.tIns);if(st.ch==='rec'||st.ch==='pick')return dg?rel(dg):rel(T.ins);if(st.ch&&st.ch!=='select'&&c)return rel(c.el);
  const cs=[].concat(st.cells||[]);if(!cs.length)return null;const B0=block(cs[0]),B1=block(cs[cs.length-1]);const a=api.td(A(B0.r0,B0.c0)),z=api.td(A(B1.r1,B1.c1));if(!a||!z)return null;const ra=rel(a),rz=rel(z),w=rel(api.wrap);
  return {l:Math.max(w.l,Math.min(ra.l,rz.l)),r:Math.min(w.r,Math.max(ra.r,rz.r)),t:Math.max(w.t,Math.min(ra.t,rz.t)),b:Math.min(w.b,Math.max(ra.b,rz.b))};}
 function place(){if(!bub)return;const st=cur();if(!st||stp.hidden){bub.hidden=true;slide.querySelectorAll('.xe-q [data-req]').forEach(e=>e.classList.remove('on'));return;}
  bub.hidden=false;const H=rel(host),a=anchorRect(st),bw=bub.offsetWidth,bh=bub.offsetHeight,G=16;
  const lim={l:14,r:(st.ch==='rec'||st.ch==='pick')?1262:H.r-4,t:114,b:672};let best=null;
  const src=[];(st.items||[]).forEach(([c])=>{const B=block(String(c).replace(/\$/g,''));const e=api.td(A(B.r0,B.c0));if(e)src.push(rel(e));});const c=T.chart();if(c&&!(st.ch&&st.ch!=='select'))src.push(rel(c.el));
  const full=[];host.querySelectorAll('.xl-g td').forEach(e=>{if(e.textContent.trim()!==''){const r=rel(e);if(r.r>H.l&&r.l<H.r&&r.b>lim.t&&r.t<lim.b)full.push(r);}});T.pos();
  const ov=(x,y,r)=>Math.max(0,Math.min(x+bw,r.r)-Math.max(x,r.l))*Math.max(0,Math.min(y+bh,r.b)-Math.max(y,r.t));
  if(!a){best={x:lim.l+10,y:lim.b-bh,s:''};}
  else{const cy=Math.max(lim.t,Math.min(lim.b-bh,a.t-10)),cx=Math.max(lim.l,Math.min(lim.r-bw,a.r-bw+20));
   [{x:a.l-bw-G,y:cy,s:'ar-r'},{x:cx,y:a.b+G,s:'ar-t'},{x:cx,y:a.t-bh-G,s:'ar-b'},{x:a.r+G,y:cy,s:'ar-l'},{x:a.l-bw-G,y:a.b-12,s:'ar-r'},{x:a.l-bw-G,y:a.t-bh+12,s:'ar-r'},{x:a.l-bw-G-60,y:a.b+G,s:'ar-t'},{x:lim.l+6,y:lim.b-bh,s:''}].forEach((q,i)=>{const out=Math.max(0,lim.l-q.x)+Math.max(0,q.x+bw-lim.r)+Math.max(0,lim.t-q.y)+Math.max(0,q.y+bh-lim.b);
    const sc=out*1000+src.reduce((s,r)=>s+ov(q.x,q.y,r),0)*2+full.reduce((s,r)=>s+ov(q.x,q.y,r),0)+ov(q.x,q.y,a)*5+i*40;if(!best||sc<best.sc)best={...q,sc};});
   best.x=Math.max(lim.l,Math.min(lim.r-bw,best.x));best.y=Math.max(lim.t,Math.min(lim.b-bh,best.y));
   bub.style.setProperty('--ay',Math.max(14,Math.min(bh-14,(a.t+a.b)/2-best.y))+'px');bub.style.setProperty('--ax',Math.max(18,Math.min(bw-18,(a.l+a.r)/2-best.x))+'px');}
  bub.className='xq-bub'+(demo?' demo':'')+' '+best.s+(st.ch?' chs':'');bub.style.left=best.x+'px';bub.style.top=best.y+'px';
  slide.querySelectorAll('.xe-q [data-req]').forEach(e=>e.classList.toggle('on',st.req!=null&&String(st.req).split(',').includes(e.dataset.req)));
  if(demo){const i=api.steps.index();const nx=bub.querySelector('[data-n="next"]');if(nx)nx.textContent=i>=cfg.steps.length-1?'סיום ✔':'המשך ◀';}
  if(bub.offsetHeight!==bh&&!place.again){place.again=1;place();place.again=0;}}
 /* the chart steps of a walkthrough: select, the tab, the dialog, the choice, the chart, extra lines, the marks */
 function chartState(){if(!api.steps)return;const i=api.steps.index();if(i<0||!cfg.steps.some(s=>s.ch))return;const upto=cfg.steps.slice(0,i+1),st=cfg.steps[i];
  const last=k=>[...upto].reverse().find(s=>s.ch===k),insS=last('insert'),mk=last('mark');
  if(st.ch==='tab'){T.closeDlg();T.setTab('ins');}
  else if(st.ch==='rec'||st.ch==='pick'){T.setTab('ins');const want=st.ch==='pick'?(st.pick||'line'):0;const dg=T.dlg();if(!dg||dg.__rg!==st.rg)T.openDlg(st.rg,want);else dg.__pick(want);}
  else{T.closeDlg();T.setTab('home');}
  if(insS){const hide=[];let c=T.chart();if(!c||c.rg!==insS.rg||c.type!=='line'){T.insert(insS.rg,'line',insS.at);c=T.chart();}
   upto.filter(s=>s.ch==='del').forEach(s=>{const k=(c.names||[]).indexOf(s.ser);if(k>=0)hide.push(k);});
   c.hide=hide;c.sel=st.ch==='selser'?(c.names||[]).indexOf(st.ser):null;c.labels=!!(mk&&mk.labels);c.axt=!!(mk&&mk.axt);c.marks=mk?mk.marks:null;c.el.querySelectorAll('[data-o]').forEach(x=>{x.checked=!!c[x.dataset.o];});T.redraw();}
  else if(T.chart())T.removeChart(true);}
 if(stp){new MutationObserver(()=>{chartState();place();requestAnimationFrame(place);}).observe(stp,{childList:true,attributes:true,attributeFilter:['hidden']});
  slide.addEventListener('shown',()=>requestAnimationFrame(place));api.wrap.addEventListener('scroll',()=>requestAnimationFrame(place));if(window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(place)).observe(host);}

 /* ---------------- the deck drives the solution: one click, one step ---------------- */
 if(demo){const stubs=[...b.querySelectorAll('.dstep')];let last=-1;
  const dirty=()=>(cfg.targets||[]).some(a=>(api.raw(a)||'')!=='');
  const sync=()=>{if(!slide.classList.contains('on'))return;const k=stubs.filter(e=>e.classList.contains('show')).length;if(k===last&&(k>0)===(api.steps.index()>=0))return;last=k;
   if(k===0){if(api.steps.index()>=0)api.steps.close();T.closeDlg();T.removeChart(true);T.setTab('home');if(dirty()){const rb=b.querySelector('[data-x="reset"]');if(rb)rb.click();}}
   else api.steps.go(k-1);
   b.classList.toggle('started',k>0);b.classList.toggle('finished',k>=stubs.length);place();requestAnimationFrame(place);};
  slide.addEventListener('step',sync);slide.addEventListener('shown',()=>{last=-1;sync();});}
 host.__xq={tool:T,place,chartOk};
});
})();
