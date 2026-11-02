/* ===== lesson activities: one clear task, immediate feedback ===== */
(function(){
const n=s=>`<span class="n">${s}</span>`;
const fm=(x,d=0)=>(x<0?'−':'')+Math.abs(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const cfg=b=>JSON.parse(b.dataset.cfg);
const say=(el,ok,html)=>{el.className='fbbar '+(ok===true?'good':ok===false?'wrong':'');el.innerHTML=html;};
const num=s=>{s=String(s).replace(/[,\s]/g,'').replace('−','-');return s===''?NaN:Number(s);};

/* ---------- shared chart drawing, same look as the static charts ---------- */
function frame(c){const W=c.W||640,H=c.H||400,ml=58,mr=18,mt=30,mb=46,X=v=>ml+(v-c.x0)/(c.x1-c.x0)*(W-ml-mr),Y=v=>mt+(c.y1-v)/(c.y1-c.y0)*(H-mt-mb);
 const tx=(x,y,t,o={})=>{const he=/[֐-׿]/.test(t);let a=o.a||'middle';if(he)a={start:'end',end:'start',middle:'middle'}[a];return `<text x="${x}" y="${y}" font-size="${o.fs||16}" text-anchor="${a}" fill="${o.fill||'#5d6a86'}" font-weight="${o.w||500}"${he?' direction="rtl"':''}>${t}</text>`;};
 let p=`<rect x="${ml}" y="${mt}" width="${W-ml-mr}" height="${H-mt-mb}" fill="#fff"/>`;
 c.yt.forEach(t=>{p+=`<line x1="${ml}" y1="${Y(t)}" x2="${W-mr}" y2="${Y(t)}" stroke="${t===0?'#1b2d55':'#e8e2d4'}" stroke-width="${t===0?2.2:1}"/>`+tx(ml-7,Y(t)+5,fm(t),{a:'end'});});
 c.xt.forEach(t=>{p+=`<line x1="${X(t)}" y1="${mt}" x2="${X(t)}" y2="${H-mb}" stroke="#f0ebe0"/>`+tx(X(t),H-mb+19,fm(t));});
 if(c.xl)p+=tx((ml+W-mr)/2,H-5,c.xl,{w:700,fill:'#2a3858'});
 if(c.yl)p+=tx(ml-40,mt-11,c.yl,{a:'start',w:700,fill:'#2a3858',fs:15});
 return {W,H,X,Y,tx,p,ml,mr,mt,mb,id:c.id};}
const line=(f,pts,col,w,dash)=>`<polyline points="${pts.map(([a,b])=>f.X(a)+','+f.Y(Math.max(Math.min(b,1e6),-1e6))).join(' ')}" fill="none" stroke="${col}" stroke-width="${w||4}" stroke-linejoin="round"${dash?` stroke-dasharray="${dash}"`:''} clip-path="url(#clp${f.id})"/>`;
const clip=f=>`<clipPath id="clp${f.id}"><rect x="${f.ml}" y="${f.mt}" width="${f.W-f.ml-f.mr}" height="${f.H-f.mt-f.mb}"/></clipPath>`;

/* ---------- sorter: each row has one right answer ---------- */
$$('.sorter').forEach(b=>{const rows=$$('.srow',b),fb=$('.fbbar',b),sc=$('.score',b);
 const upd=()=>{const d=rows.filter(r=>r.classList.contains('solved')).length;sc.textContent=d+' / '+rows.length;if(d===rows.length)say(fb,true,'כל השורות נכונות. '+fb.innerHTML);};
 rows.forEach(r=>{const a=+r.dataset.a;$$('.so',r).forEach(o=>o.addEventListener('click',()=>{if(r.classList.contains('solved'))return;const i=+o.dataset.i;
  if(i===a){o.classList.add('ok');r.classList.add('solved');$$('.so',r).forEach(x=>x.classList.remove('bad'));say(fb,true,'<b>נכון.</b> '+r.dataset.w);upd();}
  else{o.classList.add('bad');say(fb,false,'<b>לא.</b> קראו שוב את השורה, ונסו אפשרות אחרת.');}}));});
 $('.rst',b).addEventListener('click',()=>{rows.forEach(r=>{r.classList.remove('solved');$$('.so',r).forEach(x=>x.classList.remove('ok','bad'));});say(fb,null,'בחרו תשובה בכל שורה.');sc.textContent='0 / '+rows.length;});});

/* ---------- numeric question ---------- */
$$('.numq').forEach(b=>{const a=+b.dataset.a,t=+b.dataset.tol,i=$('input',b),fb=$('.fbbar',b);
 const check=()=>{const v=num(i.value);if(!Number.isFinite(v)){say(fb,false,'הקלידו מספר.');return;}
  if(Math.abs(v-a)<=t){b.classList.add('solved');say(fb,true,'<b>נכון.</b> '+b.dataset.w);}else{b.classList.remove('solved');say(fb,false,'<b>לא.</b> '+b.dataset.h);}};
 $('.chk',b).addEventListener('click',check);i.addEventListener('keydown',e=>{if(e.key==='Enter')check();});});

/* ---------- draw the profit line by dragging three points ---------- */
$$('.draw').forEach(b=>{const C=cfg(b),svg=$('svg',b),fb=$('.fbbar',b),tt=$('.tasktxt',b),xs=C.xs;let k=0,v=[],done=false,drag=-1;
 const ch={id:'d',x0:C.x0,x1:C.x1,y0:C.y0,y1:C.y1,xt:C.xt,yt:C.yt,W:640,H:430,xl:'מחיר נכס הבסיס בפקיעה',yl:'רווח או הפסד'};
 function paint(){const f=frame(ch);let p=f.p+clip(f);const T=C.tasks[k];
  p+=line(f,xs.map((x,i)=>[x,v[i]]),done?'#25a65f':'#ff6a4d',4.5);
  p+=`<line x1="${f.X(T.K)}" y1="${f.mt}" x2="${f.X(T.K)}" y2="${f.H-f.mb}" stroke="#6d4df2" stroke-width="1.6" stroke-dasharray="5 5"/>`+f.tx(f.X(T.K),f.mt+16,'K',{fill:'#6d4df2',w:800});
  xs.forEach((x,i)=>{const cx=f.X(x),cy=f.Y(v[i]);p+=`<g class="hd" data-i="${i}"><rect x="${cx-24}" y="${f.mt}" width="48" height="${f.H-f.mt-f.mb}" fill="transparent"/><circle cx="${cx}" cy="${cy}" r="12" fill="${done?'#25a65f':'#1b2d55'}" stroke="#fff" stroke-width="3"/>`+f.tx(cx+(i===xs.length-1?-20:20),cy-14,fm(v[i]),{fill:'#16213a',w:800,fs:18})+`</g>`;});
  svg.innerHTML=p;}
 function load(i){k=i;done=false;v=xs.map(()=>0);const T=C.tasks[k];tt.innerHTML=`<b>משימה ${n(k+1)} מתוך ${n(C.tasks.length)}:</b> ${T.t}`;say(fb,null,'גררו כל נקודה אנכית לערך הרווח או ההפסד במחיר שמתחתיה, ולחצו ״בדיקה״.');$('.nxt',b).disabled=true;paint();}
 const toY=e=>{const m=svg.getScreenCTM().inverse(),q=new DOMPoint(e.clientX,e.clientY).matrixTransform(m),f=frame(ch);const val=C.y1-(q.y-f.mt)/(f.H-f.mt-f.mb)*(C.y1-C.y0);return Math.max(C.y0,Math.min(C.y1,Math.round(val/C.snap)*C.snap));};
 svg.addEventListener('pointerdown',e=>{const g=e.target.closest('.hd');if(!g||done)return;drag=+g.dataset.i;svg.setPointerCapture&&svg.setPointerCapture(e.pointerId);v[drag]=toY(e);paint();e.preventDefault();});
 svg.addEventListener('pointermove',e=>{if(drag<0)return;v[drag]=toY(e);paint();});
 const up=()=>{drag=-1;};svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
 $('.chk',b).addEventListener('click',()=>{const T=C.tasks[k],bad=xs.filter((x,i)=>v[i]!==T.pts[i]);
  if(!bad.length){done=true;b.dataset.solved=(+b.dataset.solved||0)+1;paint();say(fb,true,'<b>נכון.</b> '+T.w);$('.nxt',b).disabled=false;}
  else say(fb,false,`<b>עדיין לא.</b> בדקו את הנקודה במחיר ${bad.map(x=>n(x)).join(' ובמחיר ')}. ${T.h}`);});
 $('.nxt',b).addEventListener('click',()=>{if(k<C.tasks.length-1)load(k+1);else{say(fb,true,'סיימתם את כל המשימות. ארבע הפוזיציות הן שתי צורות בלבד: קו ושיקופו ביחס לציר.');$('.nxt',b).disabled=true;}});
 $('.rst',b).addEventListener('click',()=>load(k));
 b.__set=a=>{v=a.slice();paint();};b.__task=()=>k;load(0);});

/* ---------- position builder ---------- */
$$('.builder').forEach(b=>{const C=cfg(b),svg=$('svg',b),fb=$('.fbbar',b),S={side:1,typ:'call',K:100,p:8,s:115};let m=0;
 const pnl=(s,o=S)=>{const p=o.typ==='fwd'?0:o.p;const pay=o.typ==='call'?Math.max(s-o.K,0):o.typ==='put'?Math.max(o.K-s,0):s-o.K;return o.side*(pay-p);};
 const ch={id:'b',x0:60,x1:140,y0:-50,y1:50,xt:[60,80,100,120,140],yt:[-40,-20,0,20,40],W:640,H:420,xl:'מחיר נכס הבסיס בפקיעה',yl:'רווח או הפסד למחיר יחידה'};
 function facts(){const p=S.typ==='fwd'?0:S.p,U='ללא תקרה';const long=S.side>0,K=S.K;
  if(S.typ==='fwd')return {right:'חובה לשני הצדדים',be:K,gain:long?U:fm(K),loss:long?fm(K):U,flow:'אין תשלום היום'};
  const be=S.typ==='call'?K+p:K-p,top=S.typ==='call'?U:fm(K-p),low=fm(p);
  return long?{right:'זכות, לא חובה',be,gain:top,loss:low,flow:`משלמים פרמיה: ${n(fm(p))}`}:{right:'חובה אם הקונה מממש',be,gain:low,loss:top,flow:`מקבלים פרמיה: ${n(fm(p))}`};}
 function paint(){$$('[data-side]',b).forEach(x=>x.classList.toggle('on',+x.dataset.side===S.side));$$('[data-typ]',b).forEach(x=>x.classList.toggle('on',x.dataset.typ===S.typ));
  $('.pfield',b).classList.toggle('off',S.typ==='fwd');$('[data-v=K]',b).textContent=S.K;$('[data-v=p]',b).textContent=S.typ==='fwd'?0:S.p;$('[data-v=s]',b).textContent=S.s;
  const f=frame(ch);let p=f.p+clip(f);p+=line(f,[[60,pnl(60)],[S.K,pnl(S.K)],[140,pnl(140)]],S.side>0?'#0f9d90':'#ff6a4d',4.5);const g=pnl(S.s);
  p+=`<line x1="${f.X(S.s)}" y1="${f.mt}" x2="${f.X(S.s)}" y2="${f.H-f.mb}" stroke="#16213a" stroke-width="1.4" stroke-dasharray="3 4"/><circle cx="${f.X(S.s)}" cy="${f.Y(Math.max(-50,Math.min(50,g)))}" r="8" fill="#16213a"/>`;svg.innerHTML=p;
  const F=facts();$('.rd',b).innerHTML=[['רווח או הפסד במחיר שנבחר',fm(g,0)],['נקודת איזון',fm(F.be)],['רווח מרבי',F.gain],['הפסד מרבי',F.loss],['מעמד',F.right],['היום',F.flow]].map(([a,c])=>`<div><span>${a}</span><b>${/[֐-׿]/.test(c)?c:n(c)}</b></div>`).join('');}
 function load(){const M=C.missions[m];$('.tasktxt',b).innerHTML=`<b>משימה ${n(m+1)} מתוך ${n(C.missions.length)}:</b> ${M.t}`;say(fb,null,'בחרו צד וסוג מכשיר, ולחצו ״בדיקה״.');$('.nxt',b).disabled=true;}
 $$('[data-side]',b).forEach(x=>x.addEventListener('click',()=>{S.side=+x.dataset.side;paint();}));$$('[data-typ]',b).forEach(x=>x.addEventListener('click',()=>{S.typ=x.dataset.typ;paint();}));
 $$('input[type=range]',b).forEach(i=>i.addEventListener('input',()=>{S[i.dataset.k]=+i.value;paint();}));
 $('.chk',b).addEventListener('click',()=>{const M=C.missions[m];if(S.side===M.side&&S.typ===M.typ){b.dataset.solved=(+b.dataset.solved||0)+1;say(fb,true,'<b>נכון.</b> '+M.w);$('.nxt',b).disabled=false;}else say(fb,false,'<b>לא.</b> '+M.h);});
 $('.nxt',b).addEventListener('click',()=>{if(m<C.missions.length-1){m++;load();}else{say(fb,true,'סיימתם את כל המשימות. שנו עכשיו K ופרמיה, ועקבו אחרי נקודת האיזון.');$('.nxt',b).disabled=true;}});
 load();paint();});

/* ---------- arbitrage lab ---------- */
$$('.carry').forEach(b=>{const C=cfg(b),fb=$('.fbbar',b),st={g:0,f:0,l:0,s:2100};let r=0;const FV=C.S*(1+C.r/100);
 function paint(){const F=C.rounds[r];$$('[data-g]',b).forEach(x=>x.classList.toggle('on',+x.dataset.g===st.g));$$('[data-f]',b).forEach(x=>x.classList.toggle('on',+x.dataset.f===st.f));$$('[data-l]',b).forEach(x=>x.classList.toggle('on',+x.dataset.l===st.l));
  $('[data-v=s]',b).textContent=fm(st.s);$('.tasktxt',b).innerHTML=`<b>סבב ${n(r+1)} מתוך ${n(C.rounds.length)}:</b> מחיר מיידי ${n(fm(C.S))} דולר, ריבית ${n(C.r+'%')} לשנה. מחיר חוזה האקדמה לשנה בשוק הוא ${n(fm(F))} דולר. בנו עסקה בלי השקעה עצמית ועם רווח ודאי, או קבעו שאין הזדמנות.`;
  const g0=-st.g*C.S,l0=st.l*C.S,gT=st.g*st.s,fT=st.f*(st.s-F),lT=-st.l*FV,t0=g0+l0,tT=gT+fT+lT;
  const row=(a,x,y)=>`<tr><td>${a}</td><td>${n(fm(x))}</td><td>${n(fm(y))}</td></tr>`;
  $('tbody',b).innerHTML=row('זהב',g0,gT)+row('חוזה אקדמה',0,fT)+row('הלוואה',l0,lT)+`<tr class="tot"><td>סך הכול</td><td>${n(fm(t0))}</td><td>${n(fm(tT))}</td></tr>`;}
 const t=(k,a)=>$$(`[data-${a}]`,b).forEach(x=>x.addEventListener('click',()=>{st[k]=+x.dataset[a];paint();}));t('g','g');t('f','f');t('l','l');
 $('input[type=range]',b).addEventListener('input',e=>{st.s=+e.target.value;paint();});
 const verdict=none=>{const F=C.rounds[r],gap=F-FV;
  if(Math.abs(gap)<1e-9){if(none){b.dataset.solved=(+b.dataset.solved||0)+1;say(fb,true,`<b>נכון.</b> המחיר בשוק שווה ל-${n(fm(FV))}, המחיר התיאורטי. אין רווח ודאי בכיוון אף אחד.`);$('.nxt',b).disabled=false;}else say(fb,false,`<b>לא.</b> כאן המחיר בשוק שווה למחיר התיאורטי ${n(fm(FV))}. נסו ״אין הזדמנות״.`);return;}
  if(none){say(fb,false,`<b>לא.</b> המחיר התיאורטי הוא ${n(fm(FV))}, ומחיר השוק שונה ממנו. לכן קיימת הזדמנות.`);return;}
  const sign=gap>0?1:-1;if(st.g===sign&&st.f===-sign&&st.l===sign){b.dataset.solved=(+b.dataset.solved||0)+1;say(fb,true,`<b>נכון.</b> ההשקעה היום אפס, והרווח בסוף השנה ${n(fm(Math.abs(gap)))} דולר. הזיזו את מחיר הזהב בפקיעה: הרווח אינו משתנה.`);$('.nxt',b).disabled=false;}
  else say(fb,false,`<b>עדיין לא.</b> חוזה האקדמה ${gap>0?'יקר':'זול'} מהמחיר התיאורטי ${n(fm(FV))}. ${gap>0?'מוכרים את היקר וקונים את הזול: Short בחוזה, קונים זהב היום, ומממנים בהלוואה.':'קונים את הזול ומוכרים את היקר: Long בחוזה, מוכרים זהב בחסר היום, ומלווים את התמורה.'}`);};
 $('.chk',b).addEventListener('click',()=>verdict(false));$('.none',b).addEventListener('click',()=>verdict(true));
 $('.nxt',b).addEventListener('click',()=>{if(r<C.rounds.length-1){r++;st.g=st.f=st.l=0;say(fb,null,'בחרו פעולה בכל אחת משלוש השורות, ולחצו ״בדיקה״.');$('.nxt',b).disabled=true;paint();}else{say(fb,true,'סיימתם את שלושת הסבבים. פעולת הארביטראז׳יסטים היא שמחזירה את מחיר השוק אל המחיר התיאורטי.');$('.nxt',b).disabled=true;}});
 paint();});

/* ---------- fuel hedge lab ---------- */
$$('.fuel').forEach(b=>{const C=cfg(b),svg=$('svg',b),fb=$('.fbbar',b),st={ins:'none',h:0,s:120};let k=0;
 const cost=(s,o=st)=>{const h=o.h/100;return o.ins==='none'?s:o.ins==='fwd'?(1-h)*s+h*C.F:s-h*Math.max(s-C.K,0)+h*C.c;};
 const ch={id:'f',x0:40,x1:160,y0:40,y1:160,xt:[40,60,80,100,120,140,160],yt:[40,60,80,100,120,140,160],W:600,H:400,xl:'מחיר החבית בעוד חצי שנה (דולר)',yl:'הוצאה (מיליוני דולר)'};
 function paint(){$$('[data-ins]',b).forEach(x=>x.classList.toggle('on',x.dataset.ins===st.ins));$('[data-v=h]',b).textContent=st.h+'%';$('[data-v=s]',b).textContent=st.s;
  const f=frame(ch);let p=f.p+clip(f);p+=`<line x1="${f.ml}" y1="${f.Y(C.budget)}" x2="${f.W-f.mr}" y2="${f.Y(C.budget)}" stroke="#e8960c" stroke-width="2" stroke-dasharray="6 5"/>`+f.tx(f.X(44),f.Y(C.budget)-7,'תקציב '+C.budget,{a:'start',fill:'#a86703',w:700});
  p+=line(f,[[40,40],[160,160]],'#8a93aa',2.6,'7 5');const xs=st.ins==='call'?[40,C.K,160]:[40,160];p+=line(f,xs.map(x=>[x,cost(x)]),'#0f9d90',5);
  const y=cost(st.s);p+=`<line x1="${f.X(st.s)}" y1="${f.mt}" x2="${f.X(st.s)}" y2="${f.H-f.mb}" stroke="#16213a" stroke-width="1.4" stroke-dasharray="3 4"/><circle cx="${f.X(st.s)}" cy="${f.Y(y)}" r="8" fill="#16213a"/>`;svg.innerHTML=p;
  const over=y>C.budget+1e-9;$('.rd',b).innerHTML=[['הוצאה במחיר שנבחר',fm(y,1)+' מיליון'],['ללא גידור',fm(st.s,1)+' מיליון'],['מול התקציב',over?'חריגה: '+fm(y-C.budget,1):'בתוך התקציב'],['חוזים לפי 1,000 חביות',fm(C.Q*st.h/100/1000)]].map(([a,c])=>`<div class="${a==='מול התקציב'&&over?'neg':''}"><span>${a}</span><b>${c.replace(/([−\d][\d,.]*)/g,'<span class="n">$1</span>')}</b></div>`).join('');
  $('.tasktxt',b).innerHTML=`<b>משימה ${n(k+1)} מתוך ${n(C.tasks.length)}:</b> ${C.tasks[k].t}`;}
 $$('[data-ins]',b).forEach(x=>x.addEventListener('click',()=>{st.ins=x.dataset.ins;paint();}));$$('input[type=range]',b).forEach(i=>i.addEventListener('input',()=>{st[i.dataset.k]=+i.value;paint();}));
 $('.chk',b).addEventListener('click',()=>{const T=C.tasks[k];if(st.ins!==T.ins){say(fb,false,'<b>לא.</b> '+T.hi);return;}if(st.h===T.h){b.dataset.solved=(+b.dataset.solved||0)+1;say(fb,true,'<b>נכון.</b> '+T.w);$('.nxt',b).disabled=false;}else{const y=cost(120,{ins:st.ins,h:st.h});say(fb,false,y>C.budget?`<b>נמוך מדי.</b> במחיר ${n(120)} ההוצאה היא ${n(fm(y,1))} מיליון, מעל התקציב.`:`<b>גבוה מהנדרש.</b> במחיר ${n(120)} ההוצאה ${n(fm(y,1))} מיליון, אבל יחס נמוך ב-${n('5%')} עדיין עומד בתקציב. חפשו את היחס הנמוך ביותר.`);}});
 $('.nxt',b).addEventListener('click',()=>{if(k<C.tasks.length-1){k++;st.h=0;$$('input[data-k=h]',b).forEach(i=>i.value=0);say(fb,null,'בחרו מכשיר וקבעו יחס גידור.');$('.nxt',b).disabled=true;paint();}else{say(fb,true,'סיימתם. הזיזו את המחיר ל-60 והשוו: חוזה האקדמה נועל, ואופציית הרכש משאירה את הירידה בידי החברה.');$('.nxt',b).disabled=true;}});
 paint();});

/* ---------- fill the table ---------- */
$$('.fill').forEach(b=>{const fb=$('.fbbar',b),ins=$$('input',b);
 $('.chk',b).addEventListener('click',()=>{let bad=0;ins.forEach(i=>{const ok=num(i.value)===+i.dataset.a;i.classList.toggle('good',ok);i.classList.toggle('badc',!ok);if(!ok)bad++;});
  if(!bad){b.classList.add('solved');say(fb,true,'<b>נכון.</b> '+b.dataset.w);}else{b.classList.remove('solved');say(fb,false,`<b>${n(bad)} תאים עדיין שגויים.</b> ${b.dataset.h}`);}});});

/* ---------- calculators ---------- */
const money=x=>fm(x,0);const eq=s=>`<div class="eq" dir="ltr">${s}</div>`;
const res=(l,v,sec)=>`<div class="res${sec?' sec':''}"><span>${l}</span><b${sec?'':' data-res'}>${v}</b></div>`;const ln=s=>`<p class="ln">${s}</p>`;const err=s=>`<div class="err">${s}</div>`;
const BAD='הקלידו מספרים תקינים בכל השדות.';const need=(v,keys)=>keys.every(k=>Number.isFinite(v[k]));
const CC={
expo(v){if(!need(v,['q','b','a','rev']))return err(BAD);const base=v.rev-v.q*v.b,act=v.rev-v.q*v.a,dr=(v.a/v.b-1)*100,dp=base?((act/base-1)*100):0;
 return eq(`${money(v.rev)} − ${money(v.q)} × ${v.a} = ${money(act)}`)+res('רווח בפועל, ש״ח',money(act))+res('רווח לפי התקציב',money(base),1)+res('שינוי בשער',fm(dr,1)+'%',1)+res('שינוי ברווח',fm(dp,1)+'%',1)+ln('שינוי קטן במחיר אחד מזיז את הרווח בשיעור גדול בהרבה, כי ההוצאה גדולה ביחס לרווח.');},
lev(v){if(!need(v,['i','m','c','g','d']))return err(BAD);if(v.g<=0||v.i<=0)return err('מדד וביטחונות חייבים להיות חיוביים.');const ex=v.i*v.m*v.c,mg=v.g*v.c,pl=ex*v.d/100;
 return eq(`${fm(v.i)} × ${fm(v.m)} × ${fm(v.c)} = ${money(ex)}`)+res('רווח או הפסד, ש״ח',money(pl))+res('חשיפה, ש״ח',money(ex),1)+res('ביטחונות, ש״ח',money(mg),1)+res('מנוף',fm(ex/mg,1),1)+res('תשואה על הביטחונות',fm(pl/mg*100,1)+'%',1);}
};
$$('.calc').forEach(box=>{const id=box.dataset.calc,out=$('#out-'+id),ins=$$('[data-k]',box);const run=()=>{const v={};ins.forEach(i=>{v[i.dataset.k]=num(i.value);});try{out.innerHTML=CC[id](v);}catch(e){out.innerHTML=err(BAD);}};ins.forEach(i=>i.addEventListener('input',run));run();});
})();
