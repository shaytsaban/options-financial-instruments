/* ===== mini Excel: a small spreadsheet that behaves like Hebrew (right-to-left) Excel ===== */
const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const XL=(function(){
const colName=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
const colIdx=L=>{let n=0;for(const ch of L)n=n*26+(ch.charCodeAt(0)-64);return n-1;};
const addr=(r,c)=>colName(c)+(r+1);
const parseAddr=a=>{const m=/^\$?([A-Z]+)\$?(\d+)$/.exec(a);return m?{r:+m[2]-1,c:colIdx(m[1])}:null;};
const ERR=e=>({err:e});const isErr=v=>v&&typeof v==='object'&&'err' in v;
const NUMRX=/^\s*-?(\d+(\.\d*)?|\.\d+)\s*%?\s*$/;

/* ---------- tokenizer and parser ---------- */
function tokenize(s){const T=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/\s/.test(ch)){i++;continue;}
  let m;
  if((m=/^(\d+(\.\d*)?|\.\d+)/.exec(s.slice(i)))){T.push({t:'num',v:parseFloat(m[1])});i+=m[1].length;continue;}
  if((m=/^(\$?[A-Za-z]{1,2}\$?\d+)(:\$?[A-Za-z]{1,2}\$?\d+)?/.exec(s.slice(i)))&&!/^[A-Za-z]+\(/.test(s.slice(i))){
   T.push(m[2]?{t:'range',a:m[1].toUpperCase(),b:m[2].slice(1).toUpperCase()}:{t:'ref',a:m[1].toUpperCase()});i+=m[0].length;continue;}
  if((m=/^([A-Za-z]+)\s*\(/.exec(s.slice(i)))){T.push({t:'fn',v:m[1].toUpperCase()});i+=m[0].length;continue;}
  if((m=/^(>=|<=|<>)/.exec(s.slice(i)))){T.push({t:'op',v:m[1]});i+=2;continue;}
  if('+-*/^%(),;<>='.includes(ch)){T.push({t:'op',v:ch===';'?',':ch});i++;continue;}
  if(ch==='"'){const j=s.indexOf('"',i+1);if(j<0)throw 'str';T.push({t:'str',v:s.slice(i+1,j)});i=j+1;continue;}
  throw 'bad';}
 return T;}
function parse(T){let p=0;const peek=()=>T[p],eat=v=>{if(T[p]&&T[p].t==='op'&&T[p].v===v){p++;return true;}return false;};
 function expr(){let n=add();for(const o of ['>=','<=','<>','>','<','=']){if(eat(o))return {k:'cmp',o,a:n,b:add()};}return n;}
 function add(){let n=term();for(;;){if(eat('+'))n={k:'+',a:n,b:term()};else if(eat('-'))n={k:'-',a:n,b:term()};else return n;}}
 function term(){let n=pow();for(;;){if(eat('*'))n={k:'*',a:n,b:pow()};else if(eat('/'))n={k:'/',a:n,b:pow()};else return n;}}
 function pow(){let n=unary();while(eat('^'))n={k:'^',a:n,b:unary()};return n;}
 function unary(){if(eat('-'))return {k:'neg',a:unary()};if(eat('+'))return unary();return post();}
 function post(){let n=prim();while(eat('%'))n={k:'pct',a:n};return n;}
 function prim(){const t=peek();if(!t)throw 'end';
  if(t.t==='num'){p++;return {k:'num',v:t.v};}
  if(t.t==='str'){p++;return {k:'str',v:t.v};}
  if(t.t==='ref'){p++;return {k:'ref',a:t.a};}
  if(t.t==='range'){p++;return {k:'range',a:t.a,b:t.b};}
  if(t.t==='fn'){p++;const args=[];if(!eat(')')){do{args.push(expr());}while(eat(','));if(!eat(')'))throw 'paren';}return {k:'fn',f:t.v,args};}
  if(eat('(')){const n=expr();if(!eat(')'))throw 'paren';return n;}
  throw 'tok';}
 const n=expr();if(p<T.length)throw 'trail';return n;}

/* ---------- a sheet ---------- */
function Sheet(rows,cols){this.rows=rows;this.cols=cols;this.raw={};this.fmt={};this.val={};}
Sheet.prototype.set=function(a,raw){if(raw===''||raw==null)delete this.raw[a];else this.raw[a]=String(raw);};
Sheet.prototype.recalc=function(){const S=this,memo={},busy={};
 function cellv(a){if(a in memo)return memo[a];const pa=parseAddr(a);if(!pa||pa.r>=S.rows||pa.c>=S.cols&&pa.c>25)return ERR('#REF!');
  if(busy[a])return ERR('#CIRC!');busy[a]=1;let v;const raw=S.raw[a];
  if(raw==null)v=null;else if(raw[0]==='='){try{v=ev(parse(tokenize(raw.slice(1))));if(v==null)v=0;}catch(e){v=ERR(e==='bad'||e==='tok'?'#NAME?':'#ERROR!');}}
  else if(NUMRX.test(raw)){const pc=raw.includes('%');v=parseFloat(raw.replace('%',''))/(pc?100:1);}
  else v=raw;
  busy[a]=0;memo[a]=v;return v;}
 function rng(a,b){const A=parseAddr(a),B=parseAddr(b);const out=[];for(let r=Math.min(A.r,B.r);r<=Math.max(A.r,B.r);r++)for(let c=Math.min(A.c,B.c);c<=Math.max(A.c,B.c);c++)out.push(cellv(addr(r,c)));return out;}
 function num(v){if(isErr(v))return v;if(v==null)return 0;if(typeof v==='number')return v;return ERR('#VALUE!');}
 function ev(n){switch(n.k){
  case 'num':return n.v; case 'str':return n.v;
  case 'ref':return cellv(n.a.replace(/\$/g,''));
  case 'range':return ERR('#VALUE!');
  case 'neg':{const a=num(ev(n.a));return isErr(a)?a:-a;}
  case 'pct':{const a=num(ev(n.a));return isErr(a)?a:a/100;}
  case 'cmp':{const a=num(ev(n.a)),b=num(ev(n.b));if(isErr(a))return a;if(isErr(b))return b;return {'>=':a>=b,'<=':a<=b,'<>':a!==b,'>':a>b,'<':a<b,'=':a===b}[n.o];}
  case 'fn':{if(n.f==='IF'){if(n.args.length<2)return ERR('#N/A');const c=ev(n.args[0]);if(isErr(c))return c;return c?ev(n.args[1]):(n.args[2]?ev(n.args[2]):false);}
   if(n.f==='ABS'){const a=num(ev(n.args[0]));return isErr(a)?a:Math.abs(a);}
   const vals=[];for(const x of n.args){if(x.k==='range')vals.push(...rng(x.a.replace(/\$/g,''),x.b.replace(/\$/g,'')).map(v=>({v,inRange:true})));else vals.push({v:ev(x),inRange:false});}
   const e=vals.find(o=>isErr(o.v));if(e&&n.f!=='COUNTA'&&n.f!=='COUNT')return e.v;
   const nums=vals.filter(o=>typeof o.v==='number'||(!o.inRange&&o.v==null)).map(o=>o.v||0);
   switch(n.f){case 'SUM':return nums.reduce((s,x)=>s+x,0);
    case 'AVERAGE':return nums.length?nums.reduce((s,x)=>s+x,0)/nums.length:ERR('#DIV/0!');
    case 'MIN':return nums.length?Math.min(...nums):0; case 'MAX':return nums.length?Math.max(...nums):0;
    case 'COUNT':return vals.filter(o=>typeof o.v==='number').length;
    case 'COUNTA':return vals.filter(o=>o.v!=null&&o.v!=='').length;
    default:return ERR('#NAME?');}}
  default:{const a=num(ev(n.a)),b=num(ev(n.b));if(isErr(a))return a;if(isErr(b))return b;
   if(n.k==='+')return a+b;if(n.k==='-')return a-b;if(n.k==='*')return a*b;if(n.k==='/')return b===0?ERR('#DIV/0!'):a/b;if(n.k==='^')return Math.pow(a,b);}}}
 for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++)cellv(addr(r,c));
 Object.keys(S.raw).forEach(cellv);this.val=memo;};

/* shift every relative reference in a formula by (dr,dc), the way Excel does when a formula is dragged or pasted */
function shift(raw,dr,dc){if(!raw||raw[0]!=='=')return raw;
 return '='+raw.slice(1).replace(/("[^"]*")|(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?![\d(A-Za-z])/g,(m,str,d1,L,d2,R)=>{if(str)return str;
  let c=colIdx(L.toUpperCase()),r=+R-1;if(!d1)c+=dc;if(!d2)r+=dr;if(c<0||r<0)return '#REF!';return d1+colName(c)+d2+(r+1);});}

const fmtNum=(v,f)=>{if(f==='gen')f='';const fd=/^(pct|num)(\d)$/.exec(f||'');if(fd){const d=+fd[2];return fd[1]==='pct'?(v*100).toFixed(d)+'%':v.toFixed(d);}
 if(f==='pct'){const x=Math.round(v*100*100)/100;return x+'%';}
 if(Math.abs(v)>=1e11)return v.toExponential(4);const x=Math.round(v*1e6)/1e6;
 return x.toLocaleString('en-US',{maximumFractionDigits:2}).replace('-','−');};
function display(S,a){const v=S.val[a];if(v==null)return {t:'',n:false};if(isErr(v))return {t:v.err,n:false,e:true};
 if(typeof v==='number'){const raw=S.raw[a]||'';const f=S.fmt[a]||(raw[0]!=='='&&raw.includes('%')?'pct':'');return {t:fmtNum(v,f),n:true};}
 return {t:String(v),n:false};}

/* ---------- the widget: a window that looks and behaves like Excel in Hebrew ---------- */
let CLIP=null;
const RC=['#1f5fd6','#d4321c','#7b3fb3','#14853c','#c06000','#c2185b','#0b8a8a'];  /* reference colors, as Excel paints them while a formula is edited */
const REFRX=/("[^"]*")|(\$?[A-Za-z]{1,2}\$?\d+)(:\$?[A-Za-z]{1,2}\$?\d+)?(?![\w(])/g;
const ico=(t,cls)=>`<span class="xi ${cls||''}">${t}</span>`;
function mount(host,cfg){
 let R=cfg.rows,C=cfg.cols;const S=new Sheet(R,C);let base={...cfg.data};S.bold={};
 const load=()=>{S.raw={};S.fmt={...(cfg.fmt||{})};S.bold={};Object.entries(base).forEach(([a,v])=>S.set(a,v));S.recalc();};load();
 const W=cfg.widths||[];
 host.classList.add('xl');
 const pr=`<div class="xl-pr">${cfg.targets?`<button data-x="check" class="xl-go" title="בדיקת התאים הצהובים">✔ בדיקה</button>${cfg.hints?'<button data-x="hint">💡 רמז</button>':''}${cfg.remind?'<button data-x="remind">📐 תזכורת נוסחה</button>':''}${cfg.partial?'<button data-x="part">פתרון חלקי</button>':''}<button data-x="solve">פתרון מלא</button>`:''}<button data-x="reset" title="חזרה למצב ההתחלה">איפוס</button></div>`;
 host.innerHTML=`<div class="xl-tabs"><span class="xl-qat"><button data-x="undo" title="ביטול (Ctrl+Z)" aria-label="ביטול">↶</button><button data-x="redo" title="ביצוע מחדש (Ctrl+Y)" aria-label="ביצוע מחדש">↷</button></span><span class="xt">קובץ</span><span class="xt on" title="לחיצה מכווצת או פותחת את רצועת הכלים">בית</span><span class="xt">הוספה</span><span class="xt">פריסת עמוד</span><span class="xt">נוסחאות</span><span class="xt">נתונים</span><span class="xt">סקירה</span><span class="xt">תצוגה</span><span class="xl-tt">חוברת1 · Excel</span></div>
  <div class="xl-tools xl-ribbon">
   <div class="xg"><div class="xg-b"><button data-x="paste" class="big" title="הדבקה (Ctrl+V)">${ico('📋')}<small>הדבק</small></button><span class="col"><button data-x="cut" title="גזירה (Ctrl+X)">✂</button><button data-x="copy" title="העתקה (Ctrl+C)">⧉</button></span></div><div class="xg-n">לוח</div></div>
   <div class="xg"><div class="xg-b"><span class="col"><span class="row"><span class="xl-font" dir="ltr">Calibri</span><span class="xl-size">11</span></span><span class="row"><button data-x="bold" title="מודגש (Ctrl+B)"><b>B</b></button><button data-x="noop" title="נטוי"><i>I</i></button><button data-x="noop" title="קו תחתון"><u>U</u></button></span></span></div><div class="xg-n">גופן</div></div>
   <div class="xg"><div class="xg-b"><span class="col"><span class="row"><span class="xl-numf">כללי</span></span><span class="row"><button data-x="pct" title="סגנון אחוזים">%</button><button data-x="comma" title="סגנון מפריד אלפים" dir="ltr">000</button><button data-x="incd" title="הוספת מקום עשרוני" dir="ltr">.0<sup>+</sup></button><button data-x="decd" title="הפחתת מקום עשרוני" dir="ltr">.0<sup>−</sup></button></span></span></div><div class="xg-n">מספר</div></div>
   <div class="xg"><div class="xg-b"><span class="col"><button data-x="sum" title="סכום אוטומטי (Alt+=)">Σ סכום אוטומטי</button>${cfg.tools===false?'':'<button data-x="formulas" title="הצגת נוסחאות (Ctrl+`)">ƒx הצג נוסחאות</button>'}</span></div><div class="xg-n">עריכה</div></div>
   <span class="xl-msg"></span></div>
  <div class="xl-top"><div class="xl-name" title="תיבת השם">A1</div><span class="xl-xv"><button data-x="cancel" title="ביטול (Esc)">✕</button><button data-x="enter" title="הזנה (Enter)">✓</button></span><div class="xl-fx">fx</div><div class="xl-barw"><div class="xl-lay"></div><input class="xl-bar" dir="auto" spellcheck="false" autocomplete="off"></div></div>
  <div class="xl-wrap"><table class="xl-g" tabindex="0"></table></div>
  <div class="xl-foot"><span class="xl-sheet">גיליון1</span><span class="xl-plus">+</span><span class="xl-stat">מוכן</span></div>
  ${pr}${cfg.targets?'<div class="xl-fb"></div>':''}`;
 const g=host.querySelector('.xl-g'),bar=host.querySelector('.xl-bar'),barLay=host.querySelector('.xl-lay'),nameB=host.querySelector('.xl-name'),msg=host.querySelector('.xl-msg'),fb=host.querySelector('.xl-fb'),stat=host.querySelector('.xl-stat');
 let chs=[],rhs=[];
 const grid=()=>{g.innerHTML=`<thead><tr><th class="xl-c0"></th>${Array.from({length:C},(_,c)=>`<th class="xl-ch" data-c="${c}" style="width:${W[c]||84}px">${colName(c)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:R},(_,r)=>`<tr><th class="xl-rn" data-r="${r}">${r+1}</th>${Array.from({length:C},(_,c)=>`<td data-a="${addr(r,c)}"></td>`).join('')}</tr>`).join('')}</tbody>`;chs=[...g.querySelectorAll('th.xl-ch')];rhs=[...g.querySelectorAll('th.xl-rn')];};grid();
 /* like real Excel, the grid runs on past the exercise: extra rows and columns fill the free part of the slide, and the rest scrolls */
 const wrapEl=host.querySelector('.xl-wrap');let ribbonSet=false;
 /* refit whenever the slide is shown or the fonts finish loading: the height follows the text above the sheet */
 function fit(){const slide=host.closest('.slide');if(!slide)return;const k=slide.getBoundingClientRect().width/1280;if(!k||!wrapEl.getBoundingClientRect().width)return;
  const ft=slide.querySelector('.ft');const bottom=(ft?ft.getBoundingClientRect().top:slide.getBoundingClientRect().bottom)/k;const top=wrapEl.getBoundingClientRect().top/k;
  const foot=host.querySelector('.xl-foot').getBoundingClientRect().height/k;const room=Math.floor(bottom-top-foot-12);
  const tr=g.querySelector('tbody tr');let rh=tr?tr.getBoundingClientRect().height/k:32;const head=g.querySelector('thead').getBoundingClientRect().height/k;
  if(room<head+rh*(cfg.rows+1)&&!host.classList.contains('tight')){host.classList.add('tight');rh=tr.getBoundingClientRect().height/k;}
  if(room<head+rh*cfg.rows+2&&!host.classList.contains('xl-col')&&!ribbonSet){host.classList.add('xl-col');return fit();}
  if(Math.abs((parseFloat(wrapEl.style.height)||0)-room)>1)wrapEl.style.height=Math.max(120,room)+'px';
  const wantR=Math.min(99,Math.max(cfg.rows,Math.ceil((room-head)/rh)+6));const free=wrapEl.clientWidth-g.getBoundingClientRect().width/k;const wantC=Math.min(26,C+(free>4?Math.ceil(free/84)+1:0));
  if(wantR>R||wantC>C){R=Math.max(R,wantR);C=Math.max(C,wantC);S.rows=R;S.cols=C;grid();render();}}
 if(cfg.fit!==false){const sl=host.closest('.slide');if(sl)sl.addEventListener('shown',fit);}
 if(cfg.fit!==false&&window.ResizeObserver){new ResizeObserver(()=>fit()).observe(host);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);}
 /* hidden text sink: catches typing from on-screen keyboards and IMEs that send input events without a usable key */
 const sink=document.createElement('textarea');sink.className='xl-sink';sink.setAttribute('aria-hidden','true');sink.tabIndex=-1;sink.spellcheck=false;host.appendChild(sink);
 const focusG=()=>sink.focus({preventScroll:true});
 sink.addEventListener('input',()=>{const v=sink.value;sink.value='';if(!editing&&v)startEdit(v.trim()===''?'':v,false);});
 const td=a=>g.querySelector(`td[data-a="${a}"]`);
 let sel={r:0,c:0},sel2={r:0,c:0},editing=null,showF=false,marks={},hintN=0,refPaint=[],point=null;
 /* ---- undo and redo: a snapshot of the sheet before every change ---- */
 const hist=[],fut=[];
 const snap=()=>({raw:{...S.raw},fmt:{...S.fmt},bold:{...S.bold}});
 const push=()=>{hist.push(snap());if(hist.length>100)hist.shift();fut.length=0;};
 const restore=s=>{S.raw={...s.raw};S.fmt={...s.fmt};S.bold={...s.bold};marks={};};
 function undo(){if(editing)cancel();if(!hist.length){toastX('אין פעולה לביטול');return;}fut.push(snap());restore(hist.pop());render();toastX('בוטלה הפעולה האחרונה (Ctrl+Z)');if(cfg.onChange)cfg.onChange();}
 function redo(){if(!fut.length){toastX('אין פעולה לביצוע מחדש');return;}hist.push(snap());restore(fut.pop());render();toastX('בוצע מחדש (Ctrl+Y)');if(cfg.onChange)cfg.onChange();}
 const r0=()=>Math.min(sel.r,sel2.r),r1=()=>Math.max(sel.r,sel2.r),c0=()=>Math.min(sel.c,sel2.c),c1=()=>Math.max(sel.c,sel2.c);
 const inSel=(r,c)=>r>=r0()&&r<=r1()&&c>=c0()&&c<=c1();
 const eachSel=fn=>{for(let r=r0();r<=r1();r++)for(let c=c0();c<=c1();c++)fn(addr(r,c),r,c);};
 const selName=()=>sel.r===sel2.r&&sel.c===sel2.c?addr(sel.r,sel.c):addr(r0(),c0())+':'+addr(r1(),c1());
 const fmtStat=v=>fmtNum(v,'');
 function status(){if(editing){stat.textContent=editing.mode==='edit'?'עריכה':'הזנה';return;}
  const nums=[];let cnt=0;eachSel(a=>{const v=S.val[a];if(v!=null&&v!=='')cnt++;if(typeof v==='number')nums.push(v);});
  if(cnt>1){const s=nums.reduce((x,y)=>x+y,0);stat.innerHTML=nums.length?`ממוצע: <span dir="ltr">${fmtStat(s/nums.length)}</span>&emsp;ספירה: <span dir="ltr">${cnt}</span>&emsp;סכום: <span dir="ltr">${fmtStat(s)}</span>`:`ספירה: <span dir="ltr">${cnt}</span>`;}
  else stat.textContent='מוכן';}
 function render(){S.recalc();
  const sR=r0(),eR=r1(),sC=c0(),eC=c1(),multi=sR!==eR||sC!==eC;
  g.querySelectorAll('td').forEach(el=>{const a=el.dataset.a;if(editing&&editing.where==='cell'&&editing.a===a)return;const p=parseAddr(a);
   const raw=S.raw[a];let d=display(S,a);if(showF&&raw&&raw[0]==='=')d={t:raw,n:false,f:true};const s=inSel(p.r,p.c);
   el.className=(d.n?'n':'')+(d.f?' f':'')+(d.e?' e':'')+(s&&multi?' sel':'')+(s&&p.r===sR?' bt':'')+(s&&p.r===eR?' bb':'')+(s&&p.c===sC?' bs':'')+(s&&p.c===eC?' be':'')+(p.r===sel.r&&p.c===sel.c?' act':'')+(cfg.inputs&&cfg.inputs.includes(a)?' in':'')+(cfg.targets&&cfg.targets.includes(a)?' tg':'')+(marks[a]?' '+marks[a]:'')+(cfg.headRows&&cfg.headRows.includes(p.r+1)?' hd':'')+(S.bold[a]?' bo':'')+(CLIP&&CLIP.host===host&&CLIP.a===a?' cp':'');
   el.innerHTML=(d.n||d.f?`<span dir="ltr">${esc(d.t)}</span>`:esc(d.t))+(p.r===eR&&p.c===eC&&!editing?'<i class="xl-fh"></i>':'');});
  chs.forEach(h=>{const c=+h.dataset.c;h.classList.toggle('hs',c>=sC&&c<=eC);});rhs.forEach(h=>{const r=+h.dataset.r;h.classList.toggle('hs',r>=sR&&r<=eR);});
  nameB.textContent=editing?addr(sel.r,sel.c):selName();if(!editing||editing.where!=='bar'){bar.value=S.raw[addr(sel.r,sel.c)]||'';paint(bar,barLay);}
  status();if(cfg.onSelect)cfg.onSelect(selName());}
 /* ---- colored references: the formula text and the cells it points to share a color ---- */
 function refsOf(v){const out=[];if(!v||v[0]!=='=')return out;let m,k=0;REFRX.lastIndex=0;const seen={};
  while((m=REFRX.exec(v))){if(m[1])continue;const key=(m[2]+(m[3]||'')).replace(/\$/g,'').toUpperCase();if(!(key in seen))seen[key]=k++;out.push({i:m.index,len:m[0].length,a:m[2].replace(/\$/g,'').toUpperCase(),b:m[3]?m[3].slice(1).replace(/\$/g,'').toUpperCase():null,col:RC[seen[key]%RC.length]});}
  return out;}
 function paint(inp,lay){const v=inp.value;const isF=v[0]==='=';inp.dir=isF?'ltr':'auto';lay.dir=inp.dir;lay.classList.toggle('ltr',isF);inp.classList.toggle('ltr',isF);
  if(!isF){lay.textContent='';inp.classList.remove('painted');return;}
  inp.classList.add('painted');const rs=refsOf(v);let h='',p=0;rs.forEach(x=>{h+=esc(v.slice(p,x.i))+`<span style="color:${x.col}">${esc(v.substr(x.i,x.len))}</span>`;p=x.i+x.len;});h+=esc(v.slice(p));lay.innerHTML=h+' ';lay.scrollLeft=inp.scrollLeft;}
 function paintRefs(v){refPaint.forEach(el=>{el.style.removeProperty('--rc');el.classList.remove('rf','rt','rb','rs','re');});refPaint=[];
  refsOf(v).forEach(x=>{const A=parseAddr(x.a),B=x.b?parseAddr(x.b):A;if(!A||!B)return;const a0=Math.min(A.r,B.r),a1=Math.max(A.r,B.r),b0=Math.min(A.c,B.c),b1=Math.max(A.c,B.c);
   for(let r=a0;r<=a1;r++)for(let c=b0;c<=b1;c++){if(r>=R||c>=C)continue;const el=td(addr(r,c));if(!el)continue;el.style.setProperty('--rc',x.col);el.classList.add('rf');if(r===a0)el.classList.add('rt');if(r===a1)el.classList.add('rb');if(c===b0)el.classList.add('rs');if(c===b1)el.classList.add('re');refPaint.push(el);}});}
 function onEditInput(){const inp=curInput();if(!inp)return;if(editing.where==='cell'){bar.value=inp.value;inp.style.width='';const w=Math.max(inp.parentElement.clientWidth,inp.scrollWidth+14);inp.style.width=w+'px';editing.lay.style.width=w+'px';paint(inp,editing.lay);}paint(bar,barLay);paintRefs(inp.value);status();}
 function startEdit(initial,keep){if(editing)return;const a=addr(sel.r,sel.c);sel2={...sel};editing={a,where:'cell',orig:S.raw[a]||'',mode:keep?'edit':'enter'};point=null;const el=td(a);render();
  el.className+=' ed';el.innerHTML=`<div class="xl-lay"></div><input class="xl-in" dir="auto" spellcheck="false" autocomplete="off">`;const inp=el.querySelector('input');editing.lay=el.querySelector('.xl-lay');inp.value=keep?(S.raw[a]||''):initial;bar.value=inp.value;
  inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);
  inp.oninput=()=>{point=null;onEditInput();};inp.onkeydown=keyEdit;inp.onscroll=()=>{editing&&(editing.lay.scrollLeft=inp.scrollLeft);};onEditInput();}
 function curInput(){return editing?(editing.where==='bar'?bar:td(editing.a).querySelector('input')):null;}
 function commit(dr,dc){if(!editing)return;const v=curInput().value.trim();const a=editing.a;const changed=(S.raw[a]||'')!==v;if(changed)push();S.set(a,v);editing=null;point=null;paintRefs('');move(dr,dc);render();focusG();if(changed&&cfg.onChange)cfg.onChange();}
 function cancel(){if(!editing)return;editing=null;point=null;paintRefs('');render();focusG();}
 function move(dr,dc){sel={r:Math.max(0,Math.min(R-1,sel.r+dr)),c:Math.max(0,Math.min(C-1,sel.c+dc))};sel2={...sel};}
 const ARW={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,1],ArrowRight:[0,-1]};
 function keyEdit(e){e.stopPropagation();const inp=e.target;
  if(e.key==='Enter'){e.preventDefault();commit(e.shiftKey?-1:1,0);}
  else if(e.key==='Tab'){e.preventDefault();commit(0,e.shiftKey?-1:1);}
  else if(e.key==='Escape'){e.preventDefault();cancel();}
  else if(ARW[e.key]&&editing&&editing.mode==='enter'&&(point||pointable())){e.preventDefault();
   /* point mode: the arrows walk a reference through the sheet, as in Excel */
   const from=point?{r:point.r,c:point.c}:{...sel};const r=Math.max(0,Math.min(R-1,from.r+ARW[e.key][0])),c=Math.max(0,Math.min(C-1,from.c+ARW[e.key][1]));const ref=addr(r,c);
   let v=inp.value,at=point?point.i:inp.selectionStart;if(point)v=v.slice(0,point.i)+v.slice(point.i+point.len);
   inp.value=v.slice(0,at)+ref+v.slice(at);point={i:at,len:ref.length,r,c};inp.setSelectionRange(at+ref.length,at+ref.length);onEditInput();}
  else if(ARW[e.key]&&editing&&editing.mode==='enter'){e.preventDefault();commit(...ARW[e.key]);}
  else if(e.key==='F2'){e.preventDefault();if(editing){editing.mode=editing.mode==='edit'?'enter':'edit';status();}}
  else if(e.key==='F4'){e.preventDefault();const v=inp.value,p=inp.selectionStart,rx=/\$?[A-Za-z]{1,2}\$?\d+/g;let m,hit=null;
   while((m=rx.exec(v)))if(m.index<=p&&p<=m.index+m[0].length)hit=m;
   if(hit){const q=/^(\$?)([A-Za-z]{1,2})(\$?)(\d+)$/.exec(hit[0]),st=(q[1]?2:0)+(q[3]?1:0),nx={0:3,3:1,1:2,2:0}[st];
    const nr=(nx&2?'$':'')+q[2]+(nx&1?'$':'')+q[4];inp.value=v.slice(0,hit.index)+nr+v.slice(hit.index+hit[0].length);
    const np=hit.index+nr.length;inp.setSelectionRange(np,np);point=null;onEditInput();}}
  else{point=null;}}
 const pointable=()=>{const inp=curInput();if(!inp)return false;const v=inp.value.slice(0,inp.selectionStart).trimEnd();return v[0]==='='&&/[=+\-*/^(,:;<>]$/.test(v);};
 function insertRef(a,ext){const inp=curInput();let s=inp.selectionStart;if(point&&ext){inp.value=inp.value.slice(0,point.i)+inp.value.slice(point.i+point.len);s=point.i;}
  inp.value=inp.value.slice(0,s)+a+inp.value.slice(inp.selectionEnd>s?inp.selectionEnd:s);inp.setSelectionRange(s+a.length,s+a.length);const p=parseAddr(a.split(':').pop());point={i:s,len:a.length,r:p.r,c:p.c};inp.focus();onEditInput();}
 function toastX(t){msg.textContent=t;clearTimeout(toastX.t);toastX.t=setTimeout(()=>{if(msg.textContent===t)msg.textContent='';},1800);}
 /* pointer: select, drag a range, insert a reference while writing a formula, or drag the fill handle */
 let drag=null;
 g.addEventListener('pointerdown',e=>{const hc=e.target.closest('th');
  if(hc&&!editing){e.preventDefault();if(hc.classList.contains('xl-ch')){const c=+hc.dataset.c;sel={r:0,c};sel2={r:R-1,c};}else if(hc.classList.contains('xl-rn')){const r=+hc.dataset.r;sel={r,c:0};sel2={r,c:C-1};}else{sel={r:0,c:0};sel2={r:R-1,c:C-1};}render();focusG();return;}
  const cell=e.target.closest('td');
  if(e.target.classList.contains('xl-fh')){e.preventDefault();drag={k:'fill',b:blk(),to:null};try{g.setPointerCapture(e.pointerId);}catch(_){}return;}
  if(!cell)return;const p=parseAddr(cell.dataset.a);
  if(editing&&editing.where==='cell'&&editing.a===cell.dataset.a)return;
  if(editing&&(pointable()||point)){e.preventDefault();insertRef(cell.dataset.a,!!point&&!pointable());drag={k:'ref',a:cell.dataset.a};try{g.setPointerCapture(e.pointerId);}catch(_){}return;}
  if(editing)commit(0,0);
  e.preventDefault();if(e.shiftKey){sel2={...p};}else{sel={...p};sel2={...p};}drag={k:'sel'};try{g.setPointerCapture(e.pointerId);}catch(_){}render();focusG();});
 g.addEventListener('pointermove',e=>{if(!drag)return;const el=document.elementFromPoint(e.clientX,e.clientY);const cell=el&&el.closest&&el.closest('td');if(!cell||!g.contains(cell))return;const p=parseAddr(cell.dataset.a);
  if(drag.k==='sel'){if(p.r!==sel2.r||p.c!==sel2.c){sel2=p;render();}}
  else if(drag.k==='ref'){const A=parseAddr(drag.a);const a0=addr(Math.min(A.r,p.r),Math.min(A.c,p.c)),a1=addr(Math.max(A.r,p.r),Math.max(A.c,p.c));const ref=a0===a1?a0:a0+':'+a1;
   const inp=curInput();if(point&&inp.value.substr(point.i,point.len)!==ref){inp.value=inp.value.slice(0,point.i)+ref+inp.value.slice(point.i+point.len);point.len=ref.length;inp.setSelectionRange(point.i+ref.length,point.i+ref.length);onEditInput();}}
  else{const b=drag.b;const dv=p.r>b.r1?p.r-b.r1:p.r<b.r0?b.r0-p.r:0,dh=p.c>b.c1?p.c-b.c1:p.c<b.c0?b.c0-p.c:0;
   const to=!dv&&!dh?null:dv>=dh?{r0:Math.min(b.r0,p.r),r1:Math.max(b.r1,p.r),c0:b.c0,c1:b.c1,v:1}:{r0:b.r0,r1:b.r1,c0:Math.min(b.c0,p.c),c1:Math.max(b.c1,p.c),v:0};drag.to=to;
   g.querySelectorAll('td.fillp').forEach(x=>x.classList.remove('fillp'));
   if(to)for(let r=to.r0;r<=to.r1;r++)for(let c=to.c0;c<=to.c1;c++)td(addr(r,c)).classList.add('fillp');}});
 g.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;try{g.releasePointerCapture(e.pointerId);}catch(_){}
  if(d.k==='ref'){const inp=curInput();inp&&inp.focus();}
  if(d.k==='fill'){g.querySelectorAll('td.fillp').forEach(x=>x.classList.remove('fillp'));if(d.to)fill(d.b,d.to);}});
 /* fill a selected block (one cell or several) down/up or sideways, repeating the block like Excel */
 function blk(){return{r0:r0(),r1:r1(),c0:c0(),c1:c1()};}
 const md=(a,n)=>((a%n)+n)%n;
 function fill(b,to){push();const h=b.r1-b.r0+1,w=b.c1-b.c0+1;
  for(let r=to.r0;r<=to.r1;r++)for(let c=to.c0;c<=to.c1;c++){if(r>=b.r0&&r<=b.r1&&c>=b.c0&&c<=b.c1)continue;
   const sr=to.v?b.r0+md(r-b.r0,h):r,sc=to.v?c:b.c0+md(c-b.c0,w);const src=addr(sr,sc),raw=S.raw[src],a=addr(r,c);
   S.set(a,raw==null?'':shift(raw,r-sr,c-sc));if(S.fmt[src])S.fmt[a]=S.fmt[src];else delete S.fmt[a];if(S.bold[src])S.bold[a]=1;else delete S.bold[a];}
  sel={r:to.r0,c:to.c0};sel2={r:to.r1,c:to.c1};render();toastX('הנוסחה שוכפלה, וההפניות התעדכנו בכל תא');if(cfg.onChange)cfg.onChange();}
 g.addEventListener('dblclick',e=>{const pt0=document.elementFromPoint(e.clientX,e.clientY);if(e.target.classList.contains('xl-fh')||pt0&&pt0.classList&&pt0.classList.contains('xl-fh')){const b=blk();
   let last=b.r1;for(let r=b.r1+1;r<R;r++){const nb=[b.c0-1,b.c1+1].some(c=>c>=0&&c<C&&S.raw[addr(r,c)]!=null);if(nb)last=r;else break;}
   if(last>b.r1)fill(b,{r0:b.r0,r1:last,c0:b.c0,c1:b.c1,v:1});return;}
  const pt=document.elementFromPoint(e.clientX,e.clientY);const cell=e.target.closest('td')||(pt&&pt.closest&&pt.closest('td'));if(!cell||!g.contains(cell)||editing)return;sel=parseAddr(cell.dataset.a);sel2={...sel};startEdit('',true);});
 /* clipboard and formats */
 function copy(cut){CLIP={host,a:addr(sel.r,sel.c),raw:S.raw[addr(sel.r,sel.c)],r:sel.r,c:sel.c,fmt:S.fmt[addr(sel.r,sel.c)],bold:S.bold[addr(sel.r,sel.c)],cut};render();toastX(cut?'נגזר. סמנו תא, והדביקו ב-Ctrl+V':'הועתק. סמנו תא או טווח, והדביקו ב-Ctrl+V');}
 function paste(){if(!CLIP||CLIP.raw==null){toastX('אין מה להדביק. קודם העתיקו תא (Ctrl+C)');return;}push();
  eachSel((a,r,c)=>{S.set(a,CLIP.cut?CLIP.raw:shift(CLIP.raw,r-CLIP.r,c-CLIP.c));if(CLIP.fmt)S.fmt[a]=CLIP.fmt;if(CLIP.bold)S.bold[a]=1;});
  if(CLIP.cut&&CLIP.host===host&&!inSel(CLIP.r,CLIP.c)){S.set(CLIP.a,'');delete S.fmt[CLIP.a];delete S.bold[CLIP.a];CLIP=null;}render();if(cfg.onChange)cfg.onChange();}
 function decs(a){const f=S.fmt[a]||'';const m=/^(pct|num)(\d)$/.exec(f);if(m)return [m[1],+m[2]];const t=display(S,a).t.replace(/[^\d.%]/g,'');const pc=f==='pct'||t.includes('%');const d=(t.split('.')[1]||'').replace('%','').length;return [pc?'pct':'num',d];}
 function fmtAll(fn){push();eachSel(a=>{const f=fn(a);if(f)S.fmt[a]=f;else delete S.fmt[a];});render();if(cfg.onChange)cfg.onChange();}
 function autoSum(){const c=sel.c;let r=sel.r-1,top=-1;while(r>=0&&typeof S.val[addr(r,c)]==='number'){top=r;r--;}
  let f;if(top>=0)f=`=SUM(${addr(top,c)}:${addr(sel.r-1,c)})`;else{let cc=sel.c-1,st=-1;while(cc>=0&&typeof S.val[addr(sel.r,cc)]==='number'){st=cc;cc--;}f=st>=0?`=SUM(${addr(sel.r,st)}:${addr(sel.r,sel.c-1)})`:'=SUM()';}
  startEdit(f,false);const inp=curInput();if(f==='=SUM()')inp.setSelectionRange(5,5);}
 const gKey=e=>{if(editing)return;const k=e.key,code=e.code||'';
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&(code==='KeyZ'||k==='z'||k==='Z'||k==='ז')){e.preventDefault();e.stopPropagation();if(e.shiftKey)redo();else undo();return;}
  if(mod&&(code==='KeyY'||k==='y'||k==='Y'||k==='ט')){e.preventDefault();e.stopPropagation();redo();return;}
  if(mod&&(code==='KeyC'||k==='c'||k==='C'||k==='ב')){e.preventDefault();e.stopPropagation();copy(false);return;}
  if(mod&&(code==='KeyX'||k==='x'||k==='X'||k==='ס')){e.preventDefault();e.stopPropagation();copy(true);return;}
  if(mod&&(code==='KeyV'||k==='v'||k==='V'||k==='ה')){e.preventDefault();e.stopPropagation();paste();return;}
  if(mod&&(code==='KeyB'||k==='b'||k==='B'||k==='נ')){e.preventDefault();e.stopPropagation();toggleBold();return;}
  if(mod&&(code==='Backquote'||k==='`'||k===';')){e.preventDefault();e.stopPropagation();toggleF();return;}
  if(mod&&k==='Home'){e.preventDefault();e.stopPropagation();sel={r:0,c:0};sel2={...sel};render();return;}
  if(e.altKey&&(k==='='||code==='Equal')){e.preventDefault();e.stopPropagation();autoSum();return;}
  const nav={...ARW,Enter:[e.shiftKey?-1:1,0],Tab:[0,e.shiftKey?-1:1]};
  if(nav[k]){e.preventDefault();e.stopPropagation();if(e.shiftKey&&k.startsWith('Arrow')){sel2={r:Math.max(0,Math.min(R-1,sel2.r+nav[k][0])),c:Math.max(0,Math.min(C-1,sel2.c+nav[k][1]))};}else move(...nav[k]);render();return;}
  if(k==='Home'){e.preventDefault();e.stopPropagation();sel={r:sel.r,c:0};sel2={...sel};render();return;}
  if(k==='F2'){e.preventDefault();e.stopPropagation();startEdit('',true);return;}
  if(k==='Escape'){e.stopPropagation();if(CLIP&&CLIP.host===host){CLIP=null;render();}return;}
  if(k==='Delete'||k==='Backspace'){e.preventDefault();e.stopPropagation();let any=false;eachSel(a=>{if(S.raw[a]!=null)any=true;});if(!any)return;push();eachSel(a=>S.set(a,''));render();if(cfg.onChange)cfg.onChange();return;}
  if(k===' '||k.length===1&&!mod){e.preventDefault();e.stopPropagation();startEdit(k===' '?'':k,false);return;}
  if(k==='PageDown'||k==='PageUp'||k==='End')e.stopPropagation();};
 g.addEventListener('keydown',gKey);sink.addEventListener('keydown',gKey);
 bar.addEventListener('focus',()=>{if(!editing){editing={a:addr(sel.r,sel.c),where:'bar',orig:S.raw[addr(sel.r,sel.c)]||'',mode:'edit'};point=null;onEditInput();}});
 bar.addEventListener('input',()=>{point=null;onEditInput();});bar.addEventListener('scroll',()=>{barLay.scrollLeft=bar.scrollLeft;});
 bar.addEventListener('keydown',keyEdit);
 bar.addEventListener('blur',()=>{if(editing&&editing.where==='bar')setTimeout(()=>{if(editing&&editing.where==='bar'&&document.activeElement!==bar)commit(0,0);},120);});
 function toggleF(){showF=!showF;const b=host.querySelector('[data-x="formulas"]');b&&b.classList.toggle('on',showF);render();}
 function toggleBold(){const on=!S.bold[addr(sel.r,sel.c)];push();eachSel(a=>{if(on)S.bold[a]=1;else delete S.bold[a];});render();}
 host.querySelector('.xl-tabs').addEventListener('click',e=>{const t=e.target.closest('.xt');if(!t)return;if(!t.classList.contains('on')){toastX('בתרגול עובדים בכרטיסייה ״בית״');return;}ribbonSet=true;host.classList.toggle('xl-col');toastX(host.classList.contains('xl-col')?'רצועת הכלים כווצה. לחיצה על ״בית״ פותחת אותה':'רצועת הכלים פתוחה');fit();});
 host.addEventListener('mousedown',e=>{const b=e.target.closest('.xl-tools button,.xl-qat button,.xl-xv button,.xl-pr button');if(b&&editing)e.preventDefault();});
 const onBtn=e=>{const b=e.target.closest('.xl-tools button,.xl-qat button,.xl-xv button,.xl-pr button');if(!b)return;const x=b.dataset.x;
  if(x==='undo')undo();if(x==='redo')redo();if(x==='enter')commit(0,0);if(x==='cancel')cancel();
  if(x==='copy')copy(false);if(x==='cut')copy(true);if(x==='paste')paste();if(x==='bold')toggleBold();if(x==='noop')toastX('בתרגול הזה אין צורך בעיצוב');
  if(x==='pct')fmtAll(a=>/^pct/.test(S.fmt[a]||'')?'':'pct');
  if(x==='comma')fmtAll(a=>'num'+Math.max(0,Math.min(2,decs(a)[1]||0)));
  if(x==='incd')fmtAll(a=>{const [t,d]=decs(a);return t+Math.min(6,d+1);});
  if(x==='decd')fmtAll(a=>{const [t,d]=decs(a);return t+Math.max(0,d-1);});
  if(x==='sum'){if(editing)commit(0,0);autoSum();}
  if(x==='formulas')toggleF();
  if(x==='hint'&&fb){const i=hintN%cfg.hints.length;hintN++;fb.innerHTML=`<div class="xl-tip"><b>רמז ${i+1} מתוך ${cfg.hints.length}:</b> ${cfg.hints[i]}</div>`;}
  if(x==='remind'&&fb){fb.innerHTML=`<div class="xl-tip">${cfg.remind}</div>`;}
  if(x==='part'){push();cfg.partial.forEach(a=>{S.set(a,cfg.solution[a]);});render();if(fb)fb.innerHTML='<div class="xl-tip">השורה הראשונה מולאה. המשיכו מכאן: גררו את ידית המילוי או כתבו לבד. התחרטתם? Ctrl+Z.</div>';if(cfg.onChange)cfg.onChange();}
  if(x==='reset'){if(editing)cancel();push();load();marks={};hintN=0;if(fb)fb.innerHTML='';sel={r:0,c:0};sel2={...sel};render();toastX('הגיליון חזר להתחלה. Ctrl+Z מחזיר את מה שהיה');if(cfg.onChange)cfg.onChange();}
  if(x==='solve'){const rows=[...new Set(cfg.targets.map(a=>parseAddr(a).r))].sort((p,q)=>p-q);const todo=rows.find(r=>cfg.targets.some(a=>parseAddr(a).r===r&&(S.raw[a]||'')!==cfg.solution[a]));
   if(todo==null){check(true);return;}push();const now=cfg.targets.filter(a=>parseAddr(a).r===todo);now.forEach(a=>S.set(a,cfg.solution[a]));Object.assign(S.fmt,cfg.solFmt||{});
   const left=rows.filter(r=>r>todo&&cfg.targets.some(a=>parseAddr(a).r===r&&(S.raw[a]||'')!==cfg.solution[a])).length;
   sel=parseAddr(now[0]);sel2={...sel};render();
   if(left){if(fb)fb.innerHTML=`<div class="xl-tip"><b>פתרון, צעד אחר צעד:</b> מולאה שורה ${todo+1}: ${now.map(a=>`<code class="xl" dir="ltr">${esc(a)}: ${esc(cfg.solution[a])}</code>`).join(' ')}. לחצו שוב לשורה הבאה (נשארו ${left}).</div>`;}
   else check(true);if(cfg.onChange)cfg.onChange();}
  if(x==='check')check(false);
  if(!editing&&x!=='enter'&&x!=='cancel')focusG();};
 host.addEventListener('click',onBtn);
 /* the practice panel and the feedback may be moved beside the sheet: they keep working */
 const prEl=host.querySelector('.xl-pr');prEl.addEventListener('click',e=>{if(!host.contains(prEl))onBtn(e);});
 prEl.addEventListener('mousedown',e=>{if(editing&&!host.contains(prEl))e.preventDefault();});
 /* checking: the value must match, the cell must hold a formula with references (unless the solution has none: =14*12 converts years to months), and no number from the table may be typed in */
 const needOf=a=>cfg.need?(typeof cfg.need==='object'?cfg.need[a]:cfg.need):null;
 function check(silent){const sol=new Sheet(R,C);Object.entries(base).forEach(([a,v])=>sol.set(a,v));Object.entries(cfg.solution).forEach(([a,v])=>sol.set(a,v));sol.recalc();
  S.recalc();marks={};const notes=[];let ok=0;
  cfg.targets.forEach(a=>{const raw=S.raw[a]||'',want=sol.val[a],got=S.val[a];const sf=cfg.solution[a]||'';
   const lits=s=>(s.replace(/\$?[A-Za-z]{1,2}\$?\d+/g,' ').match(/\d+(\.\d+)?/g)||[]).map(Number);
   const allowed=new Set(lits(sf));let why='';
   if(!raw)why='ריק';else if(raw[0]!=='='&&cfg.values){if(typeof want==='number'&&Math.abs((typeof got==='number'?got:NaN)-want)>1e-6||typeof got!=='number')why='המספר אינו נכון. חשבו שוב לפי ההסבר';}else if(raw[0]!=='=')why='הוקלד ערך ולא נוסחה. נוסחה מתחילה בסימן =';
   else if(isErr(got))why=`שגיאה ${got.err}: בדקו את הכתיב ואת הסוגריים`;
   else if(raw[0]==='='&&!/[A-Za-z]{1,2}\d/.test(raw.replace(/\$/g,'').replace(/[A-Z]+\(/g,''))&&/[A-Za-z]{1,2}\d/.test(sf.replace(/\$/g,'').replace(/[A-Z]+\(/g,''))&&!cfg.values)why='אין בנוסחה הפניה לתאים. השתמשו בכתובות התאים במקום במספרים';
   else if(raw[0]==='='&&!cfg.values&&lits(raw).some(x=>!allowed.has(x)))why='הוקלד בנוסחה מספר. כשהנתון קיים בטבלה, מפנים לתא שלו';
   else if(needOf(a)&&!new RegExp(needOf(a),'i').test(raw))why=(/^קבעו/.test(cfg.needMsg||'')?'קיבוע: ':'עבודה יעילה: ')+(cfg.needMsg||'יש פונקציה מתאימה לפעולה הזו');
   else if(typeof want==='number'&&(typeof got!=='number'||Math.abs(got-want)>1e-6))why='התוצאה אינה נכונה. בדקו את סדר הפעולות ואת התאים שבחרתם';
   if(why){marks[a]='bad';notes.push(`<b>${a}:</b> ${why}`);}else{marks[a]='ok';ok++;}});
  render();const all=ok===cfg.targets.length;
  if(fb)fb.innerHTML=all?`<div class="xl-ok">✔ כל ${ok} התאים נכונים${silent?' (פתרון לדוגמה)':''}.${cfg.done?' '+cfg.done:''}</div>`:`<div class="xl-no">נכונים ${ok} מתוך ${cfg.targets.length}.</div><div class="xl-notes">${notes.slice(0,2).join('<br>')}${notes.length>2?' ועוד '+(notes.length-2)+' תאים.':''}</div>`;
  if(all&&!silent)host.dataset.solved='1';if(cfg.onChange)cfg.onChange();}
 render();
 return {sheet:S,render,fit,select:(a)=>{sel=parseAddr(a);sel2={...sel};render();},put:(a,v)=>{push();S.set(a,v);render();if(cfg.onChange)cfg.onChange();},get:a=>S.val[a],raw:a=>S.raw[a],check,reset:()=>host.querySelector('[data-x="reset"]').click(),showFormulas:v=>{if(showF!==!!v)toggleF();},undo,redo,
  fmtSel:fn=>{eachSel(a=>{const f=fn(S.fmt[a]||'',S.val[a],display(S,a).t);if(f)S.fmt[a]=f;else delete S.fmt[a];});render();},
  fmtAt:a=>S.fmt[a]||'',active:()=>addr(sel.r,sel.c),onSel:fn=>{cfg.onSelect=fn;}};}
return {mount,shift,Sheet,addr,parseAddr,colName,tokenize,parse};
})();
