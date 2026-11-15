/* ===== mini Excel: a small spreadsheet that behaves like Hebrew (right-to-left) Excel ===== */
const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const XL=(function(){
const colName=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
const colIdx=L=>{let n=0;for(const ch of L)n=n*26+(ch.charCodeAt(0)-64);return n-1;};
const addr=(r,c)=>colName(c)+(r+1);
const parseAddr=a=>{const m=/^\$?([A-Z]+)\$?(\d+)$/.exec(a);return m?{r:+m[2]-1,c:colIdx(m[1])}:null;};
const ERR=e=>({err:e});const isErr=v=>v&&typeof v==='object'&&'err' in v;
const NUMRX=/^\s*-?(\d+(\.\d*)?|\.\d+)\s*%?\s*$/;
const MAXR=300,MAXC=52;

/* ---------- tokenizer and parser ---------- */
function tokenize(s){const T=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/\s/.test(ch)){i++;continue;}
  let m;
  if(s.startsWith('#REF!',i)){T.push({t:'err',v:'#REF!'});i+=5;continue;}
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
  if(t.t==='err'){p++;return {k:'err',v:t.v};}
  if(t.t==='ref'){p++;return {k:'ref',a:t.a};}
  if(t.t==='range'){p++;return {k:'range',a:t.a,b:t.b};}
  if(t.t==='fn'){p++;const args=[];if(!eat(')')){do{args.push(expr());}while(eat(','));if(!eat(')'))throw 'paren';}return {k:'fn',f:t.v,args};}
  if(eat('(')){const n=expr();if(!eat(')'))throw 'paren';return n;}
  throw 'tok';}
 const n=expr();if(p<T.length)throw 'trail';return n;}

/* ---------- a sheet ---------- */
function Sheet(rows,cols){this.rows=rows;this.cols=cols;this.raw={};this.fmt={};this.st={};this.val={};}
Sheet.prototype.set=function(a,raw){if(raw===''||raw==null)delete this.raw[a];else this.raw[a]=String(raw);};
Sheet.prototype.recalc=function(){const S=this,memo={},busy={};
 function cellv(a){if(a in memo)return memo[a];const pa=parseAddr(a);if(!pa||pa.r>=S.rows||pa.c>=MAXC)return ERR('#REF!');
  if(busy[a])return ERR('#CIRC!');busy[a]=1;let v;const raw=S.raw[a];
  if(raw==null)v=null;else if(raw[0]==='='){try{v=ev(parse(tokenize(raw.slice(1))));if(v==null)v=0;}catch(e){v=ERR(e==='bad'||e==='tok'?'#NAME?':'#ERROR!');}}
  else if(NUMRX.test(raw)){const pc=raw.includes('%');v=parseFloat(raw.replace('%',''))/(pc?100:1);}
  else v=raw;
  busy[a]=0;memo[a]=v;return v;}
 function rng(a,b){const A=parseAddr(a),B=parseAddr(b);const out=[];for(let r=Math.min(A.r,B.r);r<=Math.max(A.r,B.r);r++)for(let c=Math.min(A.c,B.c);c<=Math.max(A.c,B.c);c++)out.push(cellv(addr(r,c)));return out;}
 function num(v){if(isErr(v))return v;if(v==null)return 0;if(typeof v==='number')return v;return ERR('#VALUE!');}
 function ev(n){switch(n.k){
  case 'num':return n.v; case 'str':return n.v; case 'err':return ERR(n.v);
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

/* inserting or deleting rows and columns: every reference past the change moves, absolute or not; a reference to a deleted cell becomes #REF!, a range shrinks or grows */
const remapIdx=(i,at,n)=>{if(n>0)return i>=at?i+n:i;const m=-n;return i<at?i:i<at+m?null:i-m;};
function restruct(raw,kind,at,n){if(!raw||raw[0]!=='=')return raw;const k=kind==='row'?'r':'c';
 const one=(L,N)=>({c:colIdx(L.toUpperCase()),r:+N-1}),out=(d1,p,d2)=>d1+colName(p.c)+d2+(p.r+1);
 return '='+raw.slice(1).replace(/("[^"]*")|(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,2})(\$?)(\d+))?(?![\d(A-Za-z])/g,(m,str,a1,L1,a2,N1,b1,L2,b2,N2)=>{if(str)return str;
  const A=one(L1,N1);
  if(L2==null){const v=remapIdx(A[k],at,n);if(v==null)return '#REF!';A[k]=v;return out(a1,A,a2);}
  const B=one(L2,N2);const fw=A[k]<=B[k];let s=Math.min(A[k],B[k]),e=Math.max(A[k],B[k]);
  if(n>0){if(s>=at)s+=n;if(e>=at)e+=n;}
  else{const q=-n;if(s>=at&&e<at+q)return '#REF!';s=s<at?s:s<at+q?at:s-q;e=e<at?e:e<at+q?at-1:e-q;}
  A[k]=fw?s:e;B[k]=fw?e:s;return out(a1,A,a2)+':'+out(b1,B,b2);});}

const fmtNum=(v,f)=>{if(f==='gen')f='';const fd=/^(pct|num|com)(\d)$/.exec(f||'');
 if(fd){const d=+fd[2];if(fd[1]==='pct')return (v*100).toFixed(d)+'%';if(fd[1]==='com')return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});return v.toFixed(d);}
 if(f==='pct'){const x=Math.round(v*100*100)/100;return x+'%';}
 if(Math.abs(v)>=1e11)return v.toExponential(4);const x=Math.round(v*1e6)/1e6;
 return x.toLocaleString('en-US',{maximumFractionDigits:2}).replace('-','−');};
function display(S,a){const v=S.val[a];if(v==null)return {t:'',n:false};if(isErr(v))return {t:v.err,n:false,e:true};
 if(typeof v==='number'){const raw=S.raw[a]||'';const f=S.fmt[a]||(raw[0]!=='='&&raw.includes('%')?'pct':'');return {t:fmtNum(v,f),n:true};}
 return {t:String(v),n:false};}

/* ---------- the widget: a window that looks and behaves like Excel in Hebrew ---------- */
let CLIP=null;
const RC=['#1f5fd6','#d4321c','#7b3fb3','#14853c','#c06000','#c2185b','#0b8a8a'];
const RCS=['#1f5fd6','#d4321c','#7b3fb3','#c06000','#c2185b','#0b8a8a','#6b5b00'];  /* step colors: no green, the step's own cells are green */  /* reference colors, as Excel paints them while a formula is edited */
const REFRX=/("[^"]*")|(\$?[A-Za-z]{1,2}\$?\d+)(:\$?[A-Za-z]{1,2}\$?\d+)?(?![\w(])/g;
const ico=(t,cls)=>`<span class="xi ${cls||''}">${t}</span>`;
const sv=(b,vb)=>`<svg class="xs" viewBox="0 0 ${vb||16} ${vb||16}" aria-hidden="true">${b}</svg>`;
const IC={
 paste:sv('<rect x="5" y="4.5" width="14" height="16.5" rx="2" fill="#fff" stroke="#605e5c" stroke-width="1.5"/><rect x="8.5" y="2.5" width="7" height="4" rx="1.2" fill="#d2d0ce" stroke="#605e5c" stroke-width="1.2"/><path d="M8.5 11h7M8.5 14h7M8.5 17h4.5" stroke="#217346" stroke-width="1.6"/>',24),
 cut:sv('<circle cx="4.5" cy="12" r="2.3" fill="none" stroke="#605e5c" stroke-width="1.4"/><circle cx="11.5" cy="12" r="2.3" fill="none" stroke="#605e5c" stroke-width="1.4"/><path d="M6 10.3L11.5 2M10 10.3L4.5 2" stroke="#323130" stroke-width="1.4"/>'),
 copy:sv('<rect x="5.5" y="1.5" width="8" height="10" rx="1" fill="#fff" stroke="#605e5c"/><rect x="2.5" y="4.5" width="8" height="10" rx="1" fill="#fff" stroke="#605e5c"/><path d="M4.5 8h4M4.5 10.5h4" stroke="#217346"/>'),
 alR:sv('<path d="M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8" stroke="currentColor" stroke-width="1.4"/>'),
 alC:sv('<path d="M2 3.5h12M4.5 6.5h7M2 9.5h12M4.5 12.5h7" stroke="currentColor" stroke-width="1.4"/>'),
 alL:sv('<path d="M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8" stroke="currentColor" stroke-width="1.4"/>'),
 bd:sv('<path d="M2.5 2.5h11v11h-11zM8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" stroke-width="1.1"/>'),
 fill:sv('<path d="M3 7.5L7.5 3l4.5 4.5L7.5 12z" fill="#fff" stroke="#323130" stroke-width="1.2"/><path d="M12.6 8.6c.9 1.3 1.4 2.1 1.4 2.7a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.4 1.4-2.7z" fill="#323130"/><rect class="cb" x="1" y="13.6" width="14" height="2.4" fill="#ffff00"/>'),
 font:sv('<path d="M3.6 12L7.2 2.5h1.6L12.4 12M5.1 8.6h5.8" fill="none" stroke="#323130" stroke-width="1.5"/><rect class="cb" x="1" y="13.6" width="14" height="2.4" fill="#c00000"/>'),
 insR:sv('<rect x="1.5" y="1.5" width="13" height="4" fill="#fff" stroke="#8a8886"/><rect x="1.5" y="10.5" width="13" height="4" fill="#fff" stroke="#8a8886"/><path d="M8 5.2v5.6M5.2 8h5.6" stroke="#217346" stroke-width="2"/>'),
 insC:sv('<rect x="1.5" y="1.5" width="4" height="13" fill="#fff" stroke="#8a8886"/><rect x="10.5" y="1.5" width="4" height="13" fill="#fff" stroke="#8a8886"/><path d="M8 5.2v5.6M5.2 8h5.6" stroke="#217346" stroke-width="2"/>'),
 delR:sv('<rect x="1.5" y="5.5" width="13" height="5" fill="#fde7e9" stroke="#8a8886"/><path d="M5.6 5.8l4.8 4.4M10.4 5.8l-4.8 4.4" stroke="#d13438" stroke-width="1.7"/>'),
 delC:sv('<rect x="5.5" y="1.5" width="5" height="13" fill="#fde7e9" stroke="#8a8886"/><path d="M5.8 5.6l4.4 4.8M10.2 5.6l-4.4 4.8" stroke="#d13438" stroke-width="1.7"/>'),
};
const SIZES=[8,9,10,11,12,14,16,18,20,24,28];
const FILLS=['#ffff00','#ffc000','#92d050','#00b0f0','#ff0000','#fff2cc','#e2efda','#ddebf7','#fce4d6','#ededed'];
const FONTS=['#000000','#c00000','#ff0000','#ed7d31','#00b050','#0070c0','#7030a0','#808080','#217346','#ffffff'];
const KEYS={b:'נ',i:'ן',u:'ו',a:'ש',d:'ג',r:'ר',z:'ז',y:'ט',c:'ב',x:'ס',v:'ה'};
const isK=(e,l)=>e.code==='Key'+l.toUpperCase()||e.key===l||e.key===l.toUpperCase()||e.key===KEYS[l];
function mount(host,cfg){
 let R=cfg.rows,C=cfg.cols;const S=new Sheet(R,C);
 /* everything that names a cell address lives in the layout: inserting a row moves it, undo and reset bring it back */
 let base={...cfg.data},fmt0={...(cfg.fmt||{})};
 const LK=['targets','inputs','partial','headRows','solution','solFmt','need','chart','steps'];
 const layOf=()=>{const o={base,fmt0};LK.forEach(k=>{if(cfg[k]!==undefined)o[k]=cfg[k];});return o;};
 const setLay=o=>{base=o.base;fmt0=o.fmt0;LK.forEach(k=>{if(k in o)cfg[k]=o[k];});};
 const ORIG=JSON.stringify(layOf());
 const load=()=>{S.raw={};S.fmt={...fmt0};S.st={};Object.entries(base).forEach(([a,v])=>S.set(a,v));S.recalc();};load();
 let W=(cfg.widths||[]).slice();const W0=W.slice();
 host.classList.add('xl');
 const pr=`<div class="xl-pr">${cfg.targets?`<button data-x="check" class="xl-go" title="בדיקת התאים הצהובים">✔ בדיקה</button>${cfg.steps&&cfg.steps.length?'<button data-x="steps" class="xl-stb" title="הסבר מודרך, תא אחר תא">▶ שלב אחר שלב</button>':''}${cfg.hints?'<button data-x="hint">💡 רמז</button>':''}${cfg.remind?'<button data-x="remind">📐 תזכורת נוסחה</button>':''}${cfg.partial?'<button data-x="part">פתרון חלקי</button>':''}<button data-x="solve">פתרון מלא</button>`:''}<button data-x="reset" title="חזרה למצב ההתחלה">איפוס</button></div>`;
 const split=(x,icon,title,cls)=>`<span class="xl-split ${cls||''}"><button data-x="${x}" title="${title}">${icon}</button><button data-x="${x}M" class="dd" title="${title}: בחירה">▾</button></span>`;
 host.innerHTML=`<div class="xl-tabs"><span class="xl-qat"><button data-x="undo" title="ביטול (Ctrl+Z)" aria-label="ביטול">↶</button><button data-x="redo" title="ביצוע מחדש (Ctrl+Y)" aria-label="ביצוע מחדש">↷</button></span><span class="xt">קובץ</span><span class="xt on" title="לחיצה מכווצת או פותחת את רצועת הכלים">בית</span><span class="xt">הוספה</span><span class="xt">פריסת עמוד</span><span class="xt">נוסחאות</span><span class="xt">נתונים</span><span class="xt">סקירה</span><span class="xt">תצוגה</span><span class="xl-tt">חוברת1 · Excel</span></div>
  <div class="xl-tools xl-ribbon">
   <div class="xg xg-clip"><div class="xg-b"><button data-x="paste" class="big" title="הדבקה (Ctrl+V)">${IC.paste}<small>הדבקה</small></button><span class="col"><button data-x="cut" title="גזירה (Ctrl+X)">${IC.cut}</button><button data-x="copy" title="העתקה (Ctrl+C)">${IC.copy}</button></span></div><div class="xg-n">לוח</div></div>
   <div class="xg xg-font"><div class="xg-b"><span class="col"><span class="row"><span class="xl-font" dir="ltr">Calibri</span><select class="xl-size" title="גודל גופן" dir="ltr">${SIZES.map(s=>`<option value="${s}"${s===11?' selected':''}>${s}</option>`).join('')}</select><button data-x="grow" class="ab" dir="ltr" title="הגדלת גופן">A<sup>+</sup></button><button data-x="shrink" class="ab sm" dir="ltr" title="הקטנת גופן">A<sup>−</sup></button></span><span class="row"><button data-x="bold" title="מודגש (Ctrl+B)"><b>B</b></button><button data-x="italic" title="נטוי (Ctrl+I)"><i>I</i></button><button data-x="under" title="קו תחתון (Ctrl+U)"><u>U</u></button>${split('bd',IC.bd,'גבולות')}${split('fill',IC.fill,'צבע מילוי')}${split('fc',IC.font,'צבע גופן')}</span></span></div><div class="xg-n">גופן</div></div>
   <div class="xg xg-al"><div class="xg-b"><span class="row"><button data-x="alR" title="יישור לימין">${IC.alR}</button><button data-x="alC" title="מרכוז">${IC.alC}</button><button data-x="alL" title="יישור לשמאל">${IC.alL}</button></span></div><div class="xg-n">יישור</div></div>
   <div class="xg xg-num"><div class="xg-b"><span class="col"><span class="row"><span class="xl-numf">כללי</span></span><span class="row"><button data-x="pct" title="סגנון אחוזים">%</button><button data-x="comma" title="סגנון מפריד אלפים" dir="ltr">000</button><button data-x="incd" title="הוספת מקום עשרוני" dir="ltr">.0<sup>+</sup></button><button data-x="decd" title="הפחתת מקום עשרוני" dir="ltr">.0<sup>−</sup></button></span></span></div><div class="xg-n">מספר</div></div>
   <div class="xg xg-cells"><div class="xg-b"><span class="col"><span class="row"><button data-x="insR" title="הוספת שורה מעל (Ctrl++)">${IC.insR}<small>שורה</small></button><button data-x="insC" title="הוספת עמודה מימין">${IC.insC}<small>עמודה</small></button></span><span class="row"><button data-x="delR" title="מחיקת שורה (Ctrl+-)">${IC.delR}<small>שורה</small></button><button data-x="delC" title="מחיקת עמודה">${IC.delC}<small>עמודה</small></button></span></span></div><div class="xg-n">תאים</div></div>
   <div class="xg xg-ed"><div class="xg-b"><span class="col"><button data-x="sum" title="סכום אוטומטי (Alt+=)"><span class="sig">Σ</span><small>סכום</small></button>${cfg.tools===false?'':'<button data-x="formulas" title="הצגת נוסחאות (Ctrl+`)"><span class="fxi">ƒx</span><small>נוסחאות</small></button>'}</span></div><div class="xg-n">עריכה</div></div>
   <span class="xl-msg"></span></div>
  <div class="xl-top"><div class="xl-name" title="תיבת השם">A1</div><span class="xl-xv"><button data-x="cancel" title="ביטול (Esc)">✕</button><button data-x="enter" title="הזנה (Enter)">✓</button></span><div class="xl-fx">fx</div><div class="xl-barw"><div class="xl-lay"></div><input class="xl-bar" dir="ltr" spellcheck="false" autocomplete="off"></div></div>
  <div class="xl-wrap"><table class="xl-g" tabindex="0"></table></div>
  <div class="xl-foot"><span class="xl-sheet">גיליון1</span><span class="xl-plus">+</span><span class="xl-stat">מוכן</span><span class="xl-zoom" dir="ltr"><button data-x="zout" title="הקטנת התצוגה">−</button><input class="xl-zr" type="range" min="70" max="160" step="10" value="100" aria-label="מרחק מתצוגה" title="מרחק מתצוגה"><button data-x="zin" title="הגדלת התצוגה">+</button><span class="xl-zv">100%</span></span></div>
  <div class="xl-menu" hidden></div><div class="xl-pop" hidden></div>
  ${pr}${cfg.steps&&cfg.steps.length?'<div class="xl-stp" hidden></div>':''}${cfg.targets?'<div class="xl-fb"></div>':''}`;
 const $h=s=>host.querySelector(s);
 const g=$h('.xl-g'),bar=$h('.xl-bar'),barLay=$h('.xl-lay'),nameB=$h('.xl-name'),msg=$h('.xl-msg'),fb=$h('.xl-fb'),stat=$h('.xl-stat'),menu=$h('.xl-menu'),pop=$h('.xl-pop'),stpEl=$h('.xl-stp'),sizeSel=$h('.xl-size'),numf=$h('.xl-numf'),zr=$h('.xl-zr'),zv=$h('.xl-zv');
 const changed=()=>{if(cfg.onChange)cfg.onChange();};
 let chs=[],rhs=[],Z=1;
 const grid=()=>{g.innerHTML=`<thead><tr><th class="xl-c0" title="בחירת הכול (Ctrl+A)"></th>${Array.from({length:C},(_,c)=>`<th class="xl-ch" data-c="${c}" style="width:${Math.round((W[c]||84)*Z)}px">${colName(c)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:R},(_,r)=>`<tr><th class="xl-rn" data-r="${r}">${r+1}</th>${Array.from({length:C},(_,c)=>`<td data-a="${addr(r,c)}"></td>`).join('')}</tr>`).join('')}</tbody>`;chs=[...g.querySelectorAll('th.xl-ch')];rhs=[...g.querySelectorAll('th.xl-rn')];};grid();
 const setRC=(r,c)=>{R=r;C=c;S.rows=R;S.cols=C;};
 /* like real Excel, the grid runs on past the exercise: extra rows and columns fill the free part of the slide, and the rest scrolls */
 const wrapEl=$h('.xl-wrap');let ribbonSet=false;
 const scaleK=()=>{const sl=host.closest('.slide');const k=sl?sl.getBoundingClientRect().width/1280:host.getBoundingClientRect().width/(host.offsetWidth||1);return k||1;};
 /* refit whenever the slide is shown or the fonts finish loading: the height follows the text above the sheet */
 function fit(){const slide=host.closest('.slide');if(!slide)return;const k=slide.getBoundingClientRect().width/1280;if(!k||!wrapEl.getBoundingClientRect().width)return;
  const ft=slide.querySelector('.ft');const bottom=(ft?ft.getBoundingClientRect().top:slide.getBoundingClientRect().bottom)/k;const top=wrapEl.getBoundingClientRect().top/k;
  const foot=$h('.xl-foot').getBoundingClientRect().height/k;const room=Math.floor(bottom-top-foot-12);
  const tr=g.querySelector('tbody tr');let rh=tr?tr.getBoundingClientRect().height/k:32;const head=g.querySelector('thead').getBoundingClientRect().height/k;
  /* the decisions about a tight sheet are taken at 100%: zooming in must not fold the ribbon */
  if(room<(head+rh*(cfg.rows+1))/Z&&!host.classList.contains('tight')){host.classList.add('tight');rh=tr.getBoundingClientRect().height/k;}
  if(room<(head+rh*cfg.rows)/Z+2&&!host.classList.contains('xl-col')&&!ribbonSet){host.classList.add('xl-col');return fit();}
  if(Math.abs((parseFloat(wrapEl.style.height)||0)-room)>1)wrapEl.style.height=Math.max(120,room)+'px';
  const wantR=Math.min(MAXR,Math.max(cfg.rows,Math.ceil((room-head)/rh)+6));const free=wrapEl.clientWidth-g.getBoundingClientRect().width/k;const wantC=Math.min(Math.max(26,C),C+(free>4?Math.ceil(free/(84*Z))+1:0));
  if(wantR>R||wantC>C){setRC(Math.max(R,wantR),Math.max(C,wantC));grid();render();}}
 if(cfg.fit!==false){const sl=host.closest('.slide');if(sl)sl.addEventListener('shown',fit);}
 if(cfg.fit!==false&&window.ResizeObserver){new ResizeObserver(()=>requestAnimationFrame(fit)).observe(host);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);}
 /* hidden text sink: catches typing from on-screen keyboards and IMEs that send input events without a usable key */
 const sink=document.createElement('textarea');sink.className='xl-sink';sink.setAttribute('aria-hidden','true');sink.tabIndex=-1;sink.spellcheck=false;host.appendChild(sink);
 const focusG=()=>sink.focus({preventScroll:true});
 sink.addEventListener('input',()=>{const v=sink.value;sink.value='';if(!editing&&v)startEdit(v.trim()===''?'':v,false);});
 const td=a=>g.querySelector(`td[data-a="${a}"]`);
 let sel={r:0,c:0},sel2={r:0,c:0},editing=null,showF=false,marks={},hintN=0,refPaint=[],point=null,stepMark={},wt=null;
 /* ---- undo and redo: a snapshot of the whole sheet, its formats and its layout, before every change ---- */
 const hist=[],fut=[];
 const snap=()=>({raw:{...S.raw},fmt:{...S.fmt},st:{...S.st},R,C,W:W.slice(),lay:JSON.stringify(layOf())});
 const push=()=>{hist.push(snap());if(hist.length>100)hist.shift();fut.length=0;};
 const restore=s=>{S.raw={...s.raw};S.fmt={...s.fmt};S.st={...s.st};const re=s.R!==R||s.C!==C||s.W.join()!==W.join();W=s.W.slice();setRC(s.R,s.C);setLay(JSON.parse(s.lay));marks={};if(wt)closeSteps();if(re)grid();clampSel();};
 const clampSel=()=>{const cl=p=>({r:Math.max(0,Math.min(R-1,p.r)),c:Math.max(0,Math.min(C-1,p.c))});sel=cl(sel);sel2=cl(sel2);};
 function undo(){if(editing)cancel();if(!hist.length){toastX('אין פעולה לביטול');return;}fut.push(snap());restore(hist.pop());render();toastX('בוטלה הפעולה האחרונה (Ctrl+Z)');changed();}
 function redo(){if(editing)cancel();if(!fut.length){toastX('אין פעולה לביצוע מחדש');return;}hist.push(snap());restore(fut.pop());render();toastX('בוצע מחדש (Ctrl+Y)');changed();}
 const r0=()=>Math.min(sel.r,sel2.r),r1=()=>Math.max(sel.r,sel2.r),c0=()=>Math.min(sel.c,sel2.c),c1=()=>Math.max(sel.c,sel2.c);
 const inSel=(r,c)=>r>=r0()&&r<=r1()&&c>=c0()&&c<=c1();
 const eachSel=fn=>{for(let r=r0();r<=r1();r++)for(let c=c0();c<=c1();c++)fn(addr(r,c),r,c);};
 const selName=()=>sel.r===sel2.r&&sel.c===sel2.c?addr(sel.r,sel.c):addr(r0(),c0())+':'+addr(r1(),c1());
 const fullRows=()=>c0()===0&&c1()===C-1,fullCols=()=>r0()===0&&r1()===R-1&&!fullRows();
 const fmtStat=v=>fmtNum(v,'');
 function status(){if(editing){stat.textContent=editing.mode==='edit'?'עריכה':'הזנה';return;}
  const nums=[];let cnt=0;eachSel(a=>{const v=S.val[a];if(v!=null&&v!=='')cnt++;if(typeof v==='number')nums.push(v);});
  if(cnt>1){const s=nums.reduce((x,y)=>x+y,0);stat.innerHTML=nums.length?`ממוצע: <span dir="ltr">${fmtStat(s/nums.length)}</span>&emsp;ספירה: <span dir="ltr">${cnt}</span>&emsp;סכום: <span dir="ltr">${fmtStat(s)}</span>`:`ספירה: <span dir="ltr">${cnt}</span>`;}
  else stat.textContent='מוכן';}
 const hasSide=(r,c,s)=>{const t=S.st[addr(r,c)];return !!(t&&t.bd&&t.bd.includes(s));};
 /* per-cell look: bold, italic, underline, size, alignment, fill, font color, borders */
 function cellCss(a,p){const s=S.st[a];let css='';
  if(s){if(s.i)css+='font-style:italic;';if(s.u)css+='text-decoration:underline;';if(s.al)css+=`text-align:${{r:'right',c:'center',l:'left'}[s.al]};`;if(s.fs)css+=`font-size:${(s.fs*17/11*Z).toFixed(1)}px;`;if(s.bg)css+=`background-color:${s.bg};`;if(s.fc)css+=`color:${s.fc};`;}
  /* a side is drawn when this cell or its neighbour across that side asks for it, so both agree; in a right-to-left sheet column A is on the right */
  if(hasSide(p.r,p.c,'t')||p.r>0&&hasSide(p.r-1,p.c,'b'))css+='border-top:1px solid #000;';
  if(hasSide(p.r,p.c,'b')||hasSide(p.r+1,p.c,'t'))css+='border-bottom:1px solid #000;';
  if(hasSide(p.r,p.c,'r')||p.c>0&&hasSide(p.r,p.c-1,'l'))css+='border-right:1px solid #000;';
  if(hasSide(p.r,p.c,'l')||hasSide(p.r,p.c+1,'r'))css+='border-left:1px solid #000;';
  const m=stepMark[a];if(m&&m.c)css+=`--sc:${m.c};`;
  return css;}
 const NUMF={pct:'אחוזים',num:'מספר',com:'חשבונאות'};
 function render(){S.recalc();
  const sR=r0(),eR=r1(),sC=c0(),eC=c1(),multi=sR!==eR||sC!==eC;
  g.querySelectorAll('td').forEach(el=>{const a=el.dataset.a;if(editing&&editing.where==='cell'&&editing.a===a)return;const p=parseAddr(a);
   const raw=S.raw[a];let d=display(S,a);if(showF&&raw&&raw[0]==='=')d={t:raw,n:false,f:true};const s=inSel(p.r,p.c),st=S.st[a],m=stepMark[a];
   el.className=(d.n?'n':'')+(d.f?' f':'')+(d.e?' e':'')+(s&&multi?' sel':'')+(s&&p.r===sR?' bt':'')+(s&&p.r===eR?' bb':'')+(s&&p.c===sC?' bs':'')+(s&&p.c===eC?' be':'')+(p.r===sel.r&&p.c===sel.c?' act':'')+(cfg.inputs&&cfg.inputs.includes(a)?' in':'')+(cfg.targets&&cfg.targets.includes(a)?' tg':'')+(marks[a]?' '+marks[a]:'')+(cfg.headRows&&cfg.headRows.includes(p.r+1)?' hd':'')+(st&&st.b?' bo':'')+(CLIP&&CLIP.host===host&&p.r>=CLIP.r0&&p.r<CLIP.r0+CLIP.h&&p.c>=CLIP.c0&&p.c<CLIP.c0+CLIP.w?' cp':'')
    +(m?(m.c?' sr'+(m.t?' srt':'')+(m.b?' srb':'')+(m.r?' srr':'')+(m.l?' srl':''):'')+(m.tg?' stg':''):'');
   const css=cellCss(a,p);if(el.getAttribute('style')!==css){if(css)el.setAttribute('style',css);else el.removeAttribute('style');}
   el.innerHTML=(d.n||d.f?`<span dir="ltr">${esc(d.t)}</span>`:esc(d.t))+(p.r===eR&&p.c===eC&&!editing?'<i class="xl-fh"></i>':'');});
  chs.forEach(h=>{const c=+h.dataset.c;h.classList.toggle('hs',c>=sC&&c<=eC);});rhs.forEach(h=>{const r=+h.dataset.r;h.classList.toggle('hs',r>=sR&&r<=eR);});
  nameB.textContent=editing?addr(sel.r,sel.c):selName();if(!editing||editing.where!=='bar'){bar.value=S.raw[addr(sel.r,sel.c)]||'';barDir();paint(bar,barLay);}
  /* the ribbon shows the look of the active cell, as in Excel */
  const a0=addr(sel.r,sel.c),t0=S.st[a0]||{},on=(x,v)=>{const b=host.querySelector(`.xl-ribbon [data-x="${x}"]`);if(b)b.classList.toggle('on',!!v);};
  on('bold',t0.b);on('italic',t0.i);on('under',t0.u);on('alR',t0.al==='r');on('alC',t0.al==='c');on('alL',t0.al==='l');
  if(sizeSel&&document.activeElement!==sizeSel)sizeSel.value=String(t0.fs||11);
  const f0=(S.fmt[a0]||'').replace(/\d$/,'');numf.textContent=NUMF[f0]||(display(S,a0).t.includes('%')?'אחוזים':'כללי');
  status();if(cfg.onSelect)cfg.onSelect(selName());}
 /* ---- colored references: the formula text and the cells it points to share a color ---- */
 function refsOf(v){const out=[];if(!v||v[0]!=='=')return out;let m,k=0;REFRX.lastIndex=0;const seen={};
  while((m=REFRX.exec(v))){if(m[1])continue;const key=(m[2]+(m[3]||'')).replace(/\$/g,'').toUpperCase();if(!(key in seen))seen[key]=k++;out.push({i:m.index,len:m[0].length,a:m[2].replace(/\$/g,'').toUpperCase(),b:m[3]?m[3].slice(1).replace(/\$/g,'').toUpperCase():null,col:RC[seen[key]%RC.length],key});}
  return out;}
 function paint(inp,lay){const v=inp.value;const isF=v[0]==='=';inp.dir=isF?'ltr':'auto';lay.dir=inp.dir;lay.classList.toggle('ltr',isF);inp.classList.toggle('ltr',isF);
  if(!isF){lay.textContent='';inp.classList.remove('painted');return;}
  inp.classList.add('painted');const rs=refsOf(v);let h='',p=0;rs.forEach(x=>{h+=esc(v.slice(p,x.i))+`<span style="color:${x.col}">${esc(v.substr(x.i,x.len))}</span>`;p=x.i+x.len;});h+=esc(v.slice(p));lay.innerHTML=h+' ';lay.scrollLeft=inp.scrollLeft;}
 function paintRefs(v){refPaint.forEach(el=>{el.style.removeProperty('--rc');el.classList.remove('rf','rt','rb','rs','re');});refPaint=[];
  refsOf(v).forEach(x=>{const A=parseAddr(x.a),B=x.b?parseAddr(x.b):A;if(!A||!B)return;const a0=Math.min(A.r,B.r),a1=Math.max(A.r,B.r),b0=Math.min(A.c,B.c),b1=Math.max(A.c,B.c);
   for(let r=a0;r<=a1;r++)for(let c=b0;c<=b1;c++){if(r>=R||c>=C)continue;const el=td(addr(r,c));if(!el)continue;el.style.setProperty('--rc',x.col);el.classList.add('rf');if(r===a0)el.classList.add('rt');if(r===a1)el.classList.add('rb');if(c===b0)el.classList.add('rs');if(c===b1)el.classList.add('re');refPaint.push(el);}});}
 /* a formula, a number or an empty box reads left to right; only Hebrew text reads right to left */
 function barDir(){const v=bar.value,d=/[֐-׿]/.test(v)&&!/^\s*[=+\-]/.test(v)?'rtl':'ltr';if(bar.dir!==d)bar.dir=d;}
 function onEditInput(){const inp=curInput();if(!inp)return;if(editing.where==='cell'){bar.value=inp.value;inp.style.width='';const w=Math.max(inp.parentElement.clientWidth,inp.scrollWidth+14);inp.style.width=w+'px';editing.lay.style.width=w+'px';paint(inp,editing.lay);}barDir();paint(bar,barLay);paintRefs(inp.value);status();}
 function startEdit(initial,keep){if(editing)return;closeMenu();const a=addr(sel.r,sel.c);sel2={...sel};editing={a,where:'cell',orig:S.raw[a]||'',mode:keep?'edit':'enter'};point=null;const el=td(a);render();reveal(sel.r,sel.c);
  el.className+=' ed';el.innerHTML=`<div class="xl-lay"></div><input class="xl-in" dir="auto" spellcheck="false" autocomplete="off">`;const inp=el.querySelector('input');editing.lay=el.querySelector('.xl-lay');inp.value=keep?(S.raw[a]||''):initial;bar.value=inp.value;
  const st=S.st[a];if(st&&st.fs){const px=(st.fs*17/11*Z).toFixed(1)+'px';inp.style.fontSize=px;editing.lay.style.fontSize=px;}
  inp.focus({preventScroll:true});inp.setSelectionRange(inp.value.length,inp.value.length);
  inp.oninput=()=>{point=null;onEditInput();};inp.onkeydown=keyEdit;inp.onscroll=()=>{editing&&(editing.lay.scrollLeft=inp.scrollLeft);};onEditInput();}
 function curInput(){return editing?(editing.where==='bar'?bar:td(editing.a).querySelector('input')):null;}
 function commit(dr,dc){if(!editing)return;const v=curInput().value.trim();const a=editing.a;const ch=(S.raw[a]||'')!==v;if(ch)push();S.set(a,v);editing=null;point=null;paintRefs('');move(dr,dc);render();reveal(sel.r,sel.c);focusG();if(ch)changed();}
 function cancel(){if(!editing)return;editing=null;point=null;paintRefs('');render();focusG();}
 /* moving past the last row or column grows the sheet, as if it went on forever */
 function grow(r,c){let nr=R,nc=C;if(r>=R-1&&R<MAXR)nr=Math.min(MAXR,Math.max(R+20,r+2));if(c>=C-1&&C<MAXC)nc=Math.min(MAXC,Math.max(C+4,c+2));if(nr!==R||nc!==C){setRC(nr,nc);grid();}}
 function move(dr,dc){grow(sel.r+dr,sel.c+dc);sel={r:Math.max(0,Math.min(R-1,sel.r+dr)),c:Math.max(0,Math.min(C-1,sel.c+dc))};sel2={...sel};}
 function go(r,c){grow(r,c);sel={r:Math.max(0,Math.min(R-1,r)),c:Math.max(0,Math.min(C-1,c))};sel2={...sel};render();reveal(sel.r,sel.c);}
 function extendTo(r,c){grow(r,c);sel2={r:Math.max(0,Math.min(R-1,r)),c:Math.max(0,Math.min(C-1,c))};render();reveal(sel2.r,sel2.c);}
 /* keep a cell in view: the grid scrolls under the frozen headers */
 function reveal(r,c){const el=td(addr(r,c));if(!el||!wrapEl.clientHeight)return;const k=wrapEl.getBoundingClientRect().height/(wrapEl.offsetHeight||1)||1;
  const w=wrapEl.getBoundingClientRect(),e=el.getBoundingClientRect(),hd=g.tHead.getBoundingClientRect().height,rn=rhs[0]?rhs[0].getBoundingClientRect().width:0;
  const sb=(wrapEl.offsetWidth-wrapEl.clientWidth)*k,top=w.top+hd,bottom=w.top+wrapEl.clientHeight*k,right=w.right-rn,left=w.left+sb;
  if(e.top<top-1)wrapEl.scrollTop-=(top-e.top)/k;else if(e.bottom>bottom+1)wrapEl.scrollTop+=(e.bottom-bottom)/k;
  if(e.right>right+1)wrapEl.scrollLeft+=(e.right-right)/k;else if(e.left<left-1)wrapEl.scrollLeft-=(left-e.left)/k;}
 const ARW={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,1],ArrowRight:[0,-1]};
 function keyEdit(e){e.stopPropagation();const inp=e.target;const mod=e.ctrlKey||e.metaKey;
  if(mod&&isK(e,'z')){e.preventDefault();cancel();toastX('ההקלדה בוטלה, והתא חזר למה שהיה');return;}
  if(mod&&isK(e,'y')){e.preventDefault();return;}
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
 function toastX(t){msg.textContent=t;clearTimeout(toastX.t);toastX.t=setTimeout(()=>{if(msg.textContent===t)msg.textContent='';},2200);}
 /* pointer: select, drag a range, insert a reference while writing a formula, or drag the fill handle */
 let drag=null;
 let lastDown=null,dblAt=-1e9;
 g.addEventListener('pointerdown',e=>{const hc=e.target.closest('th');closeMenu();closePop();
  /* the first press redraws the grid, so the browser's own dblclick may never arrive: two presses on the same cell count as one */
  const twice=k=>{const now=e.timeStamp,hit=lastDown&&lastDown.k===k&&now-lastDown.t<450&&Math.abs(e.clientX-lastDown.x)<8&&Math.abs(e.clientY-lastDown.y)<8;lastDown=hit?null:{k,t:now,x:e.clientX,y:e.clientY};return hit;};
  if(e.button===2){if(editing)commit(0,0);
   /* a right click keeps a selection it falls inside, and otherwise selects what it hits */
   if(hc){if(hc.classList.contains('xl-ch')){const c=+hc.dataset.c;if(!(fullCols()&&c>=c0()&&c<=c1())){sel={r:0,c};sel2={r:R-1,c};}}else if(hc.classList.contains('xl-rn')){const r=+hc.dataset.r;if(!(fullRows()&&r>=r0()&&r<=r1())){sel={r,c:0};sel2={r,c:C-1};}}}
   else{const cell=e.target.closest('td');if(cell){const p=parseAddr(cell.dataset.a);if(!inSel(p.r,p.c)){sel={...p};sel2={...p};}}}
   render();focusG();return;}
  if(hc&&!editing){e.preventDefault();
   if(hc.classList.contains('xl-ch')){const c=+hc.dataset.c;if(e.shiftKey){sel={r:0,c:sel.c};sel2={r:R-1,c};}else{sel={r:0,c};sel2={r:R-1,c};}drag={k:'col'};}
   else if(hc.classList.contains('xl-rn')){const r=+hc.dataset.r;if(e.shiftKey){sel={r:sel.r,c:0};sel2={r,c:C-1};}else{sel={r,c:0};sel2={r,c:C-1};}drag={k:'row'};}
   else{sel={r:0,c:0};sel2={r:R-1,c:C-1};}
   try{drag&&g.setPointerCapture(e.pointerId);}catch(_){}render();focusG();return;}
  const cell=e.target.closest('td');
  if(e.target.classList.contains('xl-fh')){e.preventDefault();if(twice('fh')){fillDownAuto();return;}drag={k:'fill',b:blk(),to:null};try{g.setPointerCapture(e.pointerId);}catch(_){}return;}
  if(!cell)return;const p=parseAddr(cell.dataset.a);
  if(editing&&editing.where==='cell'&&editing.a===cell.dataset.a)return;
  if(editing&&(pointable()||point)){e.preventDefault();insertRef(cell.dataset.a,!!point&&!pointable());drag={k:'ref',a:cell.dataset.a};try{g.setPointerCapture(e.pointerId);}catch(_){}return;}
  if(editing)commit(0,0);
  if(!e.shiftKey&&twice(cell.dataset.a)){e.preventDefault();sel={...p};sel2={...p};render();startEdit('',true);dblAt=e.timeStamp;return;}
  e.preventDefault();if(e.shiftKey){sel2={...p};}else{sel={...p};sel2={...p};}drag={k:'sel'};try{g.setPointerCapture(e.pointerId);}catch(_){}render();focusG();});
 g.addEventListener('pointermove',e=>{if(!drag)return;const el=document.elementFromPoint(e.clientX,e.clientY);
  if(drag.k==='col'||drag.k==='row'){const h=el&&el.closest&&el.closest(drag.k==='col'?'th.xl-ch':'th.xl-rn');if(!h||!g.contains(h))return;if(drag.k==='col')sel2={r:R-1,c:+h.dataset.c};else sel2={r:+h.dataset.r,c:C-1};render();return;}
  const cell=el&&el.closest&&el.closest('td');if(!cell||!g.contains(cell))return;const p=parseAddr(cell.dataset.a);
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
 /* fill a selected block (one cell or several) down/up or sideways, repeating the block like Excel; formats travel with it */
 function blk(){return{r0:r0(),r1:r1(),c0:c0(),c1:c1()};}
 const md=(a,n)=>((a%n)+n)%n;
 function fill(b,to,quiet){push();const h=b.r1-b.r0+1,w=b.c1-b.c0+1;
  for(let r=to.r0;r<=to.r1;r++)for(let c=to.c0;c<=to.c1;c++){if(r>=b.r0&&r<=b.r1&&c>=b.c0&&c<=b.c1)continue;
   const sr=to.v?b.r0+md(r-b.r0,h):r,sc=to.v?c:b.c0+md(c-b.c0,w);const src=addr(sr,sc),raw=S.raw[src],a=addr(r,c);
   S.set(a,raw==null?'':shift(raw,r-sr,c-sc));if(S.fmt[src])S.fmt[a]=S.fmt[src];else delete S.fmt[a];if(S.st[src])S.st[a]=S.st[src];else delete S.st[a];}
  sel={r:to.r0,c:to.c0};sel2={r:to.r1,c:to.c1};render();if(!quiet)toastX('הנוסחה שוכפלה, וההפניות התעדכנו בכל תא');changed();}
 function fillDownAuto(){const b=blk();let last=b.r1;for(let r=b.r1+1;r<R;r++){const nb=[b.c0-1,b.c1+1].some(c=>c>=0&&c<C&&S.raw[addr(r,c)]!=null);if(nb)last=r;else break;}
  if(last>b.r1)fill(b,{r0:b.r0,r1:last,c0:b.c0,c1:b.c1,v:1});dblAt=performance.now();}
 /* Ctrl+D copies the top row of the selection down (one cell: the cell above); Ctrl+R copies the first column across */
 function fillDir(down){const b=blk(),keep={s:{...sel},e:{...sel2}};
  if(down){if(b.r0===b.r1){if(b.r0===0)return;fill({r0:b.r0-1,r1:b.r0-1,c0:b.c0,c1:b.c1},{r0:b.r0-1,r1:b.r1,c0:b.c0,c1:b.c1,v:1},1);}else fill({r0:b.r0,r1:b.r0,c0:b.c0,c1:b.c1},{...b,v:1},1);}
  else{if(b.c0===b.c1){if(b.c0===0)return;fill({r0:b.r0,r1:b.r1,c0:b.c0-1,c1:b.c0-1},{r0:b.r0,r1:b.r1,c0:b.c0-1,c1:b.c1,v:0},1);}else fill({r0:b.r0,r1:b.r1,c0:b.c0,c1:b.c0},{...b,v:0},1);}
  sel=keep.s;sel2=keep.e;render();toastX(down?'מילוי למטה (Ctrl+D)':'מילוי הצידה (Ctrl+R)');}
 g.addEventListener('dblclick',e=>{if(Math.abs(e.timeStamp-dblAt)<700||editing)return;const pt0=document.elementFromPoint(e.clientX,e.clientY);if(e.target.classList.contains('xl-fh')||pt0&&pt0.classList&&pt0.classList.contains('xl-fh')){fillDownAuto();return;}
  const pt=document.elementFromPoint(e.clientX,e.clientY);const cell=e.target.closest('td')||(pt&&pt.closest&&pt.closest('td'));if(!cell||!g.contains(cell)||editing)return;sel=parseAddr(cell.dataset.a);sel2={...sel};startEdit('',true);});
 /* clipboard: the whole selected block is copied, cell by cell, with its formats */
 function copy(cut){const b=blk();CLIP={host,r0:b.r0,c0:b.c0,h:b.r1-b.r0+1,w:b.c1-b.c0+1,cells:[],cut};
  for(let r=b.r0;r<=b.r1;r++){const row=[];for(let c=b.c0;c<=b.c1;c++){const a=addr(r,c);row.push({raw:S.raw[a],fmt:S.fmt[a],st:S.st[a]});}CLIP.cells.push(row);}
  try{navigator.clipboard&&navigator.clipboard.writeText(CLIP.cells.map(row=>row.map(x=>x.raw==null?'':x.raw).join('\t')).join('\n')).catch(()=>{});}catch(_){}
  render();const n=CLIP.h*CLIP.w>1?` (${CLIP.h*CLIP.w} תאים)`:'';toastX(cut?'נגזר'+n+'. סמנו תא, והדביקו ב-Ctrl+V':'הועתק'+n+'. סמנו תא או טווח, והדביקו ב-Ctrl+V');}
 /* one target cell: the block lands from it. A larger target: the block repeats over it, as in Excel. A cut block moves as it is */
 function paste(){if(!CLIP||!CLIP.cells||CLIP.cells.every(row=>row.every(x=>x.raw==null&&!x.st&&!x.fmt))){toastX('אין מה להדביק. קודם העתיקו תא (Ctrl+C)');return;}push();
  const b=blk(),th=Math.max(CLIP.h,b.r1-b.r0+1),tw=Math.max(CLIP.w,b.c1-b.c0+1),done={};grow(b.r0+th-1,b.c0+tw-1);
  for(let i=0;i<th;i++)for(let j=0;j<tw;j++){const r=b.r0+i,c=b.c0+j;if(r>=R||c>=C)continue;const si=i%CLIP.h,sj=j%CLIP.w,src=CLIP.cells[si][sj],a=addr(r,c);done[a]=1;
   S.set(a,src.raw==null?'':CLIP.cut?src.raw:shift(src.raw,r-(CLIP.r0+si),c-(CLIP.c0+sj)));if(src.fmt)S.fmt[a]=src.fmt;else delete S.fmt[a];if(src.st)S.st[a]=src.st;else delete S.st[a];}
  if(CLIP.cut&&CLIP.host===host){for(let i=0;i<CLIP.h;i++)for(let j=0;j<CLIP.w;j++){const a=addr(CLIP.r0+i,CLIP.c0+j);if(done[a])continue;S.set(a,'');delete S.fmt[a];delete S.st[a];}CLIP=null;}
  sel={r:b.r0,c:b.c0};sel2={r:Math.min(R-1,b.r0+th-1),c:Math.min(C-1,b.c0+tw-1)};render();changed();}
 function clearSel(){let any=false;eachSel(a=>{if(S.raw[a]!=null)any=true;});if(!any)return;push();eachSel(a=>S.set(a,''));render();changed();}
 /* ---- formats ---- */
 function decs(a){const f=S.fmt[a]||'';const m=/^(pct|num|com)(\d)$/.exec(f);if(m)return [m[1],+m[2]];const t=display(S,a).t.replace(/[^\d.%]/g,'');const pc=f==='pct'||t.includes('%');const d=(t.split('.')[1]||'').replace('%','').length;return [pc?'pct':'num',d];}
 function fmtAll(fn){push();eachSel(a=>{const f=fn(a);if(f)S.fmt[a]=f;else delete S.fmt[a];});render();changed();}
 /* style objects are never changed in place, so a shallow snapshot is enough for undo */
 function styleAll(fn,each){push();eachSel((a,r,c)=>{const o={...(S.st[a]||{})};fn(o,a,r,c);Object.keys(o).forEach(k=>{if(o[k]==null||o[k]===false||o[k]==='')delete o[k];});if(Object.keys(o).length)S.st[a]=o;else delete S.st[a];});if(each)each();render();changed();}
 const actSt=()=>S.st[addr(sel.r,sel.c)]||{};
 function toggleSt(k){const on=!actSt()[k];styleAll(o=>{o[k]=on?1:null;});}
 function align(v){const on=actSt().al!==v;styleAll(o=>{o.al=on?v:null;});}
 function setSize(fs){styleAll(o=>{o.fs=fs===11?null:fs;});}
 function stepSize(d){const cur=actSt().fs||11;let i=SIZES.indexOf(cur);if(i<0)i=SIZES.findIndex(s=>s>cur);setSize(SIZES[Math.max(0,Math.min(SIZES.length-1,i+d))]);}
 let lastFill='#ffff00',lastFc='#c00000';
 function setFill(c){if(c)lastFill=c;styleAll(o=>{o.bg=c||null;});host.querySelectorAll('[data-x="fill"] .cb').forEach(x=>x.setAttribute('fill',lastFill));}
 function setFc(c){if(c)lastFc=c;styleAll(o=>{o.fc=c||null;});host.querySelectorAll('[data-x="fc"] .cb').forEach(x=>x.setAttribute('fill',lastFc));}
 function borders(kind){const b=blk();
  styleAll((o,a,r,c)=>{let s=kind==='none'?'':kind==='all'?'tblr':(o.bd||'');
   if(kind==='outer'){if(r===b.r0)s+='t';if(r===b.r1)s+='b';if(c===b.c0)s+='r';if(c===b.c1)s+='l';}
   if(kind==='bottom'&&r===b.r1)s+='b';
   o.bd=[...new Set(s)].join('')||null;},
   /* removing borders also removes the matching side of the neighbours around the block */
   kind==='none'?()=>{const strip=(r,c,side)=>{if(r<0||c<0)return;const a=addr(r,c),t=S.st[a];if(!t||!t.bd)return;const o={...t,bd:t.bd.replace(side,'')};if(!o.bd)delete o.bd;if(Object.keys(o).length)S.st[a]=o;else delete S.st[a];};
    for(let c=b.c0;c<=b.c1;c++){strip(b.r0-1,c,'b');strip(b.r1+1,c,'t');}for(let r=b.r0;r<=b.r1;r++){strip(r,b.c0-1,'l');strip(r,b.c1+1,'r');}}:null);}
 function autoSum(){const c=sel.c;let r=sel.r-1,top=-1;while(r>=0&&typeof S.val[addr(r,c)]==='number'){top=r;r--;}
  let f;if(top>=0)f=`=SUM(${addr(top,c)}:${addr(sel.r-1,c)})`;else{let cc=sel.c-1,st=-1;while(cc>=0&&typeof S.val[addr(sel.r,cc)]==='number'){st=cc;cc--;}f=st>=0?`=SUM(${addr(sel.r,st)}:${addr(sel.r,sel.c-1)})`:'=SUM()';}
  startEdit(f,false);const inp=curInput();if(f==='=SUM()')inp.setSelectionRange(5,5);}
 /* ---- inserting and deleting rows and columns ---- */
 function mapCells(x,mapA,re){if(x==null)return x;if(Array.isArray(x))return x.map(y=>mapCells(y,mapA,re)).filter(Boolean);const s=String(x);
  if(s.includes(':')){const f=re('='+s);return f.includes('#REF!')?null:f.slice(1);}return mapA(s);}
 function restructure(kind,at,n){if(editing)commit(0,0);if(n>0&&(kind==='row'?R+n>MAXR:C+n>MAXC)){toastX('הגיליון הגיע לגודל המרבי');return;}
  if(wt)closeSteps();push();
  const K=kind==='row'?'r':'c';
  const mapA=a=>{const p=parseAddr(String(a).replace(/\$/g,''));if(!p)return a;const v=remapIdx(p[K],at,n);if(v==null)return null;p[K]=v;return addr(p.r,p.c);};
  const re=f=>restruct(f,kind,at,n);
  const mapObj=(o,fv)=>{if(!o||typeof o!=='object')return o;const out={};Object.entries(o).forEach(([a,v])=>{const b=mapA(a);if(b)out[b]=fv?fv(v):v;});return out;};
  const refs0=Object.values(S.raw).filter(v=>v.includes('#REF!')).length;
  S.raw=mapObj(S.raw,re);S.fmt=mapObj(S.fmt);S.st=mapObj(S.st);base=mapObj(base,re);fmt0=mapObj(fmt0);
  ['targets','inputs','partial'].forEach(k=>{if(Array.isArray(cfg[k]))cfg[k]=cfg[k].map(mapA).filter(Boolean);});
  if(cfg.solution)cfg.solution=mapObj(cfg.solution,re);if(cfg.solFmt)cfg.solFmt=mapObj(cfg.solFmt);if(cfg.need&&typeof cfg.need==='object')cfg.need=mapObj(cfg.need);
  if(kind==='row'&&Array.isArray(cfg.headRows))cfg.headRows=cfg.headRows.map(r=>{const v=remapIdx(r-1,at,n);return v==null?null:v+1;}).filter(v=>v!=null);
  if(cfg.chart){const ch=JSON.parse(JSON.stringify(cfg.chart));const mr=p=>{if(!Array.isArray(p))return p;const f=mapCells(p[0]+':'+p[1],mapA,re);return f?f.split(':'):p;};ch.x=mr(ch.x);(ch.series||[]).forEach(s=>{s.y=mr(s.y);});cfg.chart=ch;}
  if(cfg.steps)cfg.steps=cfg.steps.map(st=>({...st,cells:mapCells(st.cells,mapA,re),items:(st.items||[]).map(([a,m])=>[mapA(a)||a,m]),...(st.formula?{formula:typeof st.formula==='object'?mapObj(st.formula,re):re(st.formula)}:{})}));
  if(n>0){if(kind==='row')setRC(R+n,C);else{W.splice(at,0,...Array(n).fill(W[at]||84));setRC(R,C+n);}}
  else if(kind==='col')W.splice(at,-n);
  if(CLIP&&CLIP.host===host)CLIP=null;marks={};grid();clampSel();render();
  const refs1=Object.values(S.raw).filter(v=>v.includes('#REF!')).length,cnt=Math.abs(n);
  const what=kind==='row'?(cnt>1?cnt+' שורות':'שורה'):(cnt>1?cnt+' עמודות':'עמודה');
  toastX(n>0?`נוספה ${what}. ההפניות בנוסחאות זזו איתה`:refs1>refs0?`נמחקה ${what}. נוסחה שהפנתה אליה מציגה #REF!`:`נמחקה ${what}. ההפניות בנוסחאות התעדכנו`);changed();}
 const insRows=()=>restructure('row',r0(),r1()-r0()+1),delRows=()=>restructure('row',r0(),-(r1()-r0()+1));
 const insCols=()=>restructure('col',c0(),c1()-c0()+1),delCols=()=>restructure('col',c0(),-(c1()-c0()+1));
 function insertSel(){if(fullCols())insCols();else insRows();}
 function deleteSel(){if(fullCols())delCols();else delRows();}
 /* ---- jumping with Ctrl+arrows: to the edge of the data block, or to the next filled cell ---- */
 const filled=(r,c)=>S.raw[addr(r,c)]!=null;
 function edge(p,dr,dc){let r=p.r,c=p.c;const inb=(r,c)=>r>=0&&r<R&&c>=0&&c<C;if(!inb(r+dr,c+dc))return {r,c};
  if(filled(r,c)&&filled(r+dr,c+dc)){while(inb(r+dr,c+dc)&&filled(r+dr,c+dc)){r+=dr;c+=dc;}return {r,c};}
  r+=dr;c+=dc;while(!filled(r,c)&&inb(r+dr,c+dc)){r+=dr;c+=dc;}return {r,c};}
 function lastUsed(){let lr=0,lc=0;Object.keys(S.raw).forEach(a=>{const p=parseAddr(a);if(p){lr=Math.max(lr,p.r);lc=Math.max(lc,p.c);}});return [lr,lc];}
 const pageRows=()=>{const tr=g.querySelector('tbody tr');return Math.max(1,Math.floor(wrapEl.clientHeight/(tr&&tr.offsetHeight||30))-2);};
 const gKey=e=>{if(editing)return;const k=e.key,code=e.code||'',mod=e.ctrlKey||e.metaKey,sh=e.shiftKey;
  const stop=()=>{e.preventDefault();e.stopPropagation();};
  if(k==='Escape'&&(!menu.hidden||!pop.hidden)){stop();closeMenu();closePop();return;}
  if(mod&&!e.altKey){
   if(isK(e,'z')){stop();if(sh)redo();else undo();return;}
   if(isK(e,'y')){stop();redo();return;}
   if(isK(e,'c')){stop();copy(false);return;}
   if(isK(e,'x')){stop();copy(true);return;}
   if(isK(e,'v')){stop();paste();return;}
   if(isK(e,'b')){stop();toggleSt('b');return;}
   if(isK(e,'i')){stop();toggleSt('i');return;}
   if(isK(e,'u')){stop();toggleSt('u');return;}
   if(isK(e,'a')){stop();sel={r:0,c:0};sel2={r:R-1,c:C-1};render();return;}
   if(isK(e,'d')){stop();fillDir(true);return;}
   if(isK(e,'r')){stop();fillDir(false);return;}
   if(code==='Backquote'||k==='`'||k===';'){stop();toggleF();return;}
   if(k==='+'||code==='NumpadAdd'||(sh&&(code==='Equal'||k==='='))){stop();insertSel();return;}
   if(k==='-'||code==='Minus'||code==='NumpadSubtract'){stop();deleteSel();return;}
   if(k===' '||code==='Space'){stop();if(sh){sel={r:0,c:0};sel2={r:R-1,c:C-1};}else{sel={r:0,c:sel.c};sel2={r:R-1,c:sel.c};}render();return;}
   if(k==='Home'){stop();go(0,0);return;}
   if(k==='End'){stop();const [lr,lc]=lastUsed();go(lr,lc);return;}
   if(ARW[k]){stop();const d=ARW[k];if(sh){const p=edge(sel2,d[0],d[1]);extendTo(p.r,p.c);}else{const p=edge(sel,d[0],d[1]);go(p.r,p.c);}return;}
   return;}
  if(e.altKey&&(k==='='||code==='Equal')){stop();autoSum();return;}
  if(sh&&(k===' '||code==='Space')){stop();sel={r:sel.r,c:0};sel2={r:sel.r,c:C-1};render();return;}
  if(ARW[k]){stop();const d=ARW[k];if(sh)extendTo(sel2.r+d[0],sel2.c+d[1]);else go(sel.r+d[0],sel.c+d[1]);return;}
  if(k==='Enter'||k==='Tab'){stop();const d=k==='Enter'?[sh?-1:1,0]:[0,sh?-1:1];go(sel.r+d[0],sel.c+d[1]);return;}
  if(k==='PageDown'||k==='PageUp'){stop();const n=pageRows()*(k==='PageDown'?1:-1);if(sh)extendTo(sel2.r+n,sel2.c);else go(sel.r+n,sel.c);return;}
  if(k==='Home'){stop();if(sh)extendTo(sel2.r,0);else go(sel.r,0);return;}
  if(k==='End'){stop();return;}
  if(k==='F2'){stop();startEdit('',true);return;}
  if(k==='ContextMenu'||(sh&&k==='F10')){stop();const el=td(addr(sel.r,sel.c));if(el){const r=el.getBoundingClientRect();openMenu(r.left+r.width/2,r.bottom,'cell');}return;}
  if(k==='Escape'){e.stopPropagation();if(CLIP&&CLIP.host===host){CLIP=null;render();}return;}
  if(k==='Delete'||k==='Backspace'){stop();clearSel();return;}
  if(k===' '||k.length===1&&!e.altKey){stop();startEdit(k===' '?'':k,false);return;}};
 g.addEventListener('keydown',gKey);sink.addEventListener('keydown',gKey);
 bar.addEventListener('focus',()=>{if(!editing){editing={a:addr(sel.r,sel.c),where:'bar',orig:S.raw[addr(sel.r,sel.c)]||'',mode:'edit'};point=null;onEditInput();}});
 bar.addEventListener('input',()=>{point=null;onEditInput();});bar.addEventListener('scroll',()=>{barLay.scrollLeft=bar.scrollLeft;});
 bar.addEventListener('keydown',keyEdit);
 bar.addEventListener('blur',()=>{if(editing&&editing.where==='bar')setTimeout(()=>{if(editing&&editing.where==='bar'&&document.activeElement!==bar)commit(0,0);},120);});
 function toggleF(){showF=!showF;const b=host.querySelector('[data-x="formulas"]');b&&b.classList.toggle('on',showF);render();}
 /* ---- zoom: the grid alone grows or shrinks, as Excel's slider at the bottom does ---- */
 function setZoom(z){Z=Math.max(.7,Math.min(1.6,Math.round(z*10)/10));host.style.setProperty('--z',String(Z));grid();render();zr.value=String(Math.round(Z*100));zv.textContent=Math.round(Z*100)+'%';host.classList.toggle('zoomed',Z!==1);fit();reveal(sel.r,sel.c);}
 zr.addEventListener('input',()=>setZoom(+zr.value/100));zr.addEventListener('change',focusG);
 wrapEl.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(Z+(e.deltaY<0?.1:-.1));},{passive:false});
 wrapEl.addEventListener('scroll',()=>{closeMenu();closePop();});
 /* ---- right-click menu ---- */
 const kScale=()=>host.getBoundingClientRect().width/(host.offsetWidth||1)||1;
 function placeAt(el,x,y,alignRight){const h=host.getBoundingClientRect(),k=kScale();el.hidden=false;const w=el.offsetWidth,hh=el.offsetHeight;
  let L=(x-h.left)/k-(alignRight?w:0),T=(y-h.top)/k;L=Math.max(4,Math.min(host.offsetWidth-w-4,L));if(T+hh>host.offsetHeight-4)T=Math.max(4,host.offsetHeight-hh-4);el.style.left=L+'px';el.style.top=T+'px';}
 function openMenu(x,y,kind){closePop();const nr=r1()-r0()+1,nc=c1()-c0()+1;
  const rowsL=nr>1?`${nr} שורות`:'שורה',colsL=nc>1?`${nc} עמודות`:'עמודה';
  const it=[['cut','גזירה','Ctrl+X',IC.cut],['copy','העתקה','Ctrl+C',IC.copy],['paste','הדבקה','Ctrl+V',''],'-'];
  if(kind==='row')it.push(['insR','הוספה','Ctrl++',IC.insR],['delR','מחיקה','Ctrl+-',IC.delR]);
  else if(kind==='col')it.push(['insC','הוספה','Ctrl++',IC.insC],['delC','מחיקה','Ctrl+-',IC.delC]);
  else it.push(['insR',`הוספת ${rowsL} מעל`,'Ctrl++',IC.insR],['insC',`הוספת ${colsL} מימין`,'',IC.insC],['delR',`מחיקת ${rowsL}`,'Ctrl+-',IC.delR],['delC',`מחיקת ${colsL}`,'',IC.delC]);
  it.push('-',['clear','ניקוי תוכן','Delete','']);
  menu.innerHTML=it.map(x=>x==='-'?'<div class="sep"></div>':`<button data-m="${x[0]}"${x[0]==='paste'&&!CLIP?' class="dim"':''}><span class="mi">${x[3]}</span><span class="ml">${x[1]}</span><span class="mk" dir="ltr">${x[2]}</span></button>`).join('');
  placeAt(menu,x,y,true);}
 function closeMenu(){if(!menu.hidden){menu.hidden=true;menu.innerHTML='';}}
 g.addEventListener('contextmenu',e=>{e.preventDefault();const t=e.target;const kind=t.closest('th.xl-rn')?'row':t.closest('th.xl-ch')?'col':'cell';openMenu(e.clientX,e.clientY,kind);});
 menu.addEventListener('pointerdown',e=>e.stopPropagation());
 menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.m;closeMenu();
  ({cut:()=>copy(true),copy:()=>copy(false),paste,insR:insRows,insC:insCols,delR:delRows,delC:delCols,clear:clearSel})[m]();focusG();});
 /* ---- color and border pickers ---- */
 let popFor=null;
 function openPop(btn,kind){if(popFor===kind&&!pop.hidden){closePop();return;}closeMenu();popFor=kind;let h='';
  if(kind==='bd')h=[['all','כל הגבולות'],['outer','גבולות חיצוניים'],['bottom','גבול תחתון'],['none','ללא גבולות']].map(([k,t])=>`<button class="pl" data-p="${k}">${IC.bd}<span>${t}</span></button>`).join('');
  else{const cols=kind==='fill'?FILLS:FONTS;h=`<div class="pt">${kind==='fill'?'צבע מילוי':'צבע גופן'}</div><div class="sw">${cols.map(c=>`<button data-p="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div><button class="pl" data-p="">${kind==='fill'?'ללא מילוי':'אוטומטי'}</button>`;}
  pop.innerHTML=h;const r=btn.getBoundingClientRect();placeAt(pop,r.right,r.bottom+2,true);}
 function closePop(){if(!pop.hidden){pop.hidden=true;pop.innerHTML='';popFor=null;}}
 pop.addEventListener('pointerdown',e=>{e.stopPropagation();if(editing)e.preventDefault();});
 pop.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.p,k=popFor;closePop();if(editing)commit(0,0);
  if(k==='bd')borders(v);else if(k==='fill')setFill(v);else if(k==='fc')setFc(v);focusG();});
 document.addEventListener('pointerdown',e=>{if(!host.contains(e.target)){closeMenu();closePop();}},true);
 sizeSel.addEventListener('mousedown',()=>{if(editing)commit(0,0);});
 sizeSel.addEventListener('change',()=>{setSize(+sizeSel.value);focusG();});
 host.querySelector('.xl-tabs').addEventListener('click',e=>{const t=e.target.closest('.xt');if(!t)return;if(!t.classList.contains('on')){toastX('בתרגול עובדים בכרטיסייה ״בית״');return;}ribbonSet=true;host.classList.toggle('xl-col');toastX(host.classList.contains('xl-col')?'רצועת הכלים כווצה. לחיצה על ״בית״ פותחת אותה':'רצועת הכלים פתוחה');fit();});
 const BTN='.xl-tools button,.xl-qat button,.xl-xv button,.xl-pr button,.xl-foot button';
 host.addEventListener('mousedown',e=>{const b=e.target.closest(BTN);if(b&&editing)e.preventDefault();});
 const onBtn=e=>{const b=e.target.closest(BTN);if(!b)return;const x=b.dataset.x;
  const fmtX=['bold','italic','under','alR','alC','alL','grow','shrink','bd','fill','fc','pct','comma','incd','decd','insR','insC','delR','delC'];
  if(editing&&fmtX.includes(x))commit(0,0);
  if(!/M$/.test(x||''))closePop();
  if(x==='undo')undo();if(x==='redo')redo();if(x==='enter')commit(0,0);if(x==='cancel')cancel();
  if(x==='copy')copy(false);if(x==='cut')copy(true);if(x==='paste')paste();
  if(x==='bold')toggleSt('b');if(x==='italic')toggleSt('i');if(x==='under')toggleSt('u');
  if(x==='alR')align('r');if(x==='alC')align('c');if(x==='alL')align('l');
  if(x==='grow')stepSize(1);if(x==='shrink')stepSize(-1);
  if(x==='bd')borders('all');if(x==='fill')setFill(lastFill);if(x==='fc')setFc(lastFc);
  if(x==='bdM'||x==='fillM'||x==='fcM'){openPop(b.parentElement,x.slice(0,-1));return;}
  if(x==='insR')insRows();if(x==='insC')insCols();if(x==='delR')delRows();if(x==='delC')delCols();
  if(x==='zin')setZoom(Z+.1);if(x==='zout')setZoom(Z-.1);
  if(x==='pct')fmtAll(a=>/^pct/.test(S.fmt[a]||'')?'':'pct');
  if(x==='comma')fmtAll(a=>'com2');
  if(x==='incd')fmtAll(a=>{const [t,d]=decs(a);return t+Math.min(6,d+1);});
  if(x==='decd')fmtAll(a=>{const [t,d]=decs(a);return t+Math.max(0,d-1);});
  if(x==='sum'){if(editing)commit(0,0);autoSum();}
  if(x==='formulas')toggleF();
  if(x==='steps')openSteps();
  if(x==='hint'&&fb){const i=hintN%cfg.hints.length;hintN++;fb.innerHTML=`<div class="xl-tip"><b>רמז ${i+1} מתוך ${cfg.hints.length}:</b> ${cfg.hints[i]}</div>`;}
  if(x==='remind'&&fb){fb.innerHTML=`<div class="xl-tip">${cfg.remind}</div>`;}
  if(x==='part'){push();cfg.partial.forEach(a=>{S.set(a,cfg.solution[a]);});render();if(fb)fb.innerHTML='<div class="xl-tip">השורה הראשונה מולאה. המשיכו מכאן: גררו את ידית המילוי או כתבו לבד. התחרטתם? Ctrl+Z.</div>';changed();}
  if(x==='reset'){if(editing)cancel();push();if(wt)closeSteps();setLay(JSON.parse(ORIG));W=W0.slice();grid();load();marks={};hintN=0;if(fb)fb.innerHTML='';sel={r:0,c:0};sel2={...sel};render();wrapEl.scrollTop=0;wrapEl.scrollLeft=0;toastX('הגיליון חזר להתחלה. Ctrl+Z מחזיר את מה שהיה');changed();}
  if(x==='solve'){const rows=[...new Set(cfg.targets.map(a=>parseAddr(a).r))].sort((p,q)=>p-q);const todo=rows.find(r=>cfg.targets.some(a=>parseAddr(a).r===r&&(S.raw[a]||'')!==cfg.solution[a]));
   if(todo==null){check(true);return;}push();const now=cfg.targets.filter(a=>parseAddr(a).r===todo);now.forEach(a=>S.set(a,cfg.solution[a]));Object.assign(S.fmt,cfg.solFmt||{});
   const left=rows.filter(r=>r>todo&&cfg.targets.some(a=>parseAddr(a).r===r&&(S.raw[a]||'')!==cfg.solution[a])).length;
   sel=parseAddr(now[0]);sel2={...sel};render();reveal(sel.r,sel.c);
   if(left){if(fb)fb.innerHTML=`<div class="xl-tip"><b>פתרון, צעד אחר צעד:</b> מולאה שורה ${todo+1}: ${now.map(a=>`<code class="xl" dir="ltr">${esc(a)}: ${esc(cfg.solution[a])}</code>`).join(' ')}. לחצו שוב לשורה הבאה (נשארו ${left}).</div>`;}
   else check(true);changed();}
  if(x==='check')check(false);
  if(!editing&&x!=='enter'&&x!=='cancel'&&x!=='steps')focusG();};
 host.addEventListener('click',onBtn);
 /* the practice panel and the feedback may be moved beside the sheet: they keep working */
 const prEl=$h('.xl-pr');prEl.addEventListener('click',e=>{if(!host.contains(prEl))onBtn(e);});
 prEl.addEventListener('mousedown',e=>{if(editing&&!host.contains(prEl))e.preventDefault();});
 /* ---- the guided walkthrough: one step at a time, each step paints its cells, explains them, and writes its formula ---- */
 function stepCells(st){const out=[];(Array.isArray(st.cells)?st.cells:[st.cells]).forEach(x=>{if(!x)return;const [a,b]=String(x).replace(/\$/g,'').toUpperCase().split(':');const A=parseAddr(a),B=b?parseAddr(b):A;if(!A||!B)return;
  for(let r=Math.min(A.r,B.r);r<=Math.max(A.r,B.r);r++)for(let c=Math.min(A.c,B.c);c<=Math.max(A.c,B.c);c++)out.push(addr(r,c));});return out;}
 function stepFormula(st,a,cells){if(st.formula!=null){if(typeof st.formula==='object')return st.formula[a];const p0=parseAddr(cells[0]),p=parseAddr(a);return shift(st.formula,p.r-p0.r,p.c-p0.c);}return cfg.solution?cfg.solution[a]:undefined;}
 /* the colors: the cells the step explains first, in their order, then any other cell its formula reads */
 function stepColors(st,cells){const col={};let n=0;(st.items||[]).forEach(([a])=>{const k=String(a).replace(/\$/g,'').toUpperCase();if(!(k in col))col[k]=RCS[n++%RCS.length];});
  cells.forEach(a=>refsOf(stepFormula(st,a,cells)||'').forEach(x=>{if(!(x.key in col))col[x.key]=RCS[n++%RCS.length];}));return col;}
 function markStep(st,cells,col){stepMark={};
  Object.entries(col).forEach(([key,c])=>{const [a,b]=key.split(':');const A=parseAddr(a),B=b?parseAddr(b):A;if(!A||!B)return;const a0=Math.min(A.r,B.r),a1=Math.max(A.r,B.r),b0=Math.min(A.c,B.c),b1=Math.max(A.c,B.c);
   for(let r=a0;r<=a1;r++)for(let cc=b0;cc<=b1;cc++){const ad=addr(r,cc);if(stepMark[ad])continue;stepMark[ad]={c,t:r===a0,b:r===a1,r:cc===b0,l:cc===b1};}});
  cells.forEach(a=>{stepMark[a]={...(stepMark[a]||{}),tg:1};});}
 const colorF=(f,col)=>{let h='',p=0;refsOf(f).forEach(x=>{h+=esc(f.slice(p,x.i))+`<span style="color:${col[x.key]||'#605e5c'};font-weight:700">${esc(f.substr(x.i,x.len))}</span>`;p=x.i+x.len;});return h+esc(f.slice(p));};
 let typT=[];
 function typeIn(cells){typT.forEach(clearInterval);typT=[];cells.forEach(a=>{const el=td(a),f=S.raw[a];if(!el||!f)return;
  const span=document.createElement('span');span.className='xl-typ';span.dir='ltr';el.textContent='';el.appendChild(span);el.classList.add('typing');
  const n=Math.min(f.length,16);let i=0;const t=setInterval(()=>{i++;span.textContent=f.slice(0,Math.ceil(f.length*i/n));if(i>=n){clearInterval(t);setTimeout(()=>{if(!typT.includes(t))return;render();const e2=td(a);if(e2){e2.classList.add('xl-pop');setTimeout(()=>e2.classList.remove('xl-pop'),900);}},260);}},32);typT.push(t);});}
 function goStep(i){const N=cfg.steps.length;i=Math.max(0,Math.min(N-1,i));if(editing)cancel();const fwd=!wt||i>wt.i;
  /* later steps are wiped first, then every step up to this one is written, in order */
  cfg.steps.forEach((st,k)=>{if(k>i)stepCells(st).forEach(a=>{if(stepFormula(st,a,stepCells(st))!=null)S.set(a,base[a]==null?'':base[a]);});});
  const fresh=[];cfg.steps.forEach((st,k)=>{if(k>i)return;const cells=stepCells(st);cells.forEach(a=>{const f=stepFormula(st,a,cells);if(f==null)return;if(S.raw[a]!==f){S.set(a,f);if(k===i)fresh.push(a);}});});
  wt.i=i;const st=cfg.steps[i],cells=stepCells(st),col=stepColors(st,cells);markStep(st,cells,col);
  if(cells.length){const p=parseAddr(cells[0]),q=parseAddr(cells[cells.length-1]);grow(q.r,q.c);sel={...p};sel2={...q};}
  render();if(cells.length)reveal(sel.r,sel.c);if(fwd&&fresh.length)typeIn(fresh);
  const fl=cells.map(a=>[a,stepFormula(st,a,cells)]).filter(x=>x[1]!=null);
  const items=(st.items||[]).map(([a,m])=>{const k=String(a).replace(/\$/g,'').toUpperCase();const d=k.includes(':')?{t:''}:display(S,k);return `<li><span class="xl-sw" style="background:${col[k]}"></span><code dir="ltr" style="color:${col[k]}">${esc(k)}</code><span class="xl-im">${m}</span>${d.t!==''?`<b dir="ltr">${esc(d.t)}</b>`:''}</li>`;}).join('');
  stpEl.innerHTML=`<div class="xl-sh"><b>שלב ${i+1} מתוך ${N}</b><span class="xl-dots">${cfg.steps.map((_,k)=>`<i class="${k<i?'done':k===i?'on':''}"></i>`).join('')}</span></div>`
   +`<div class="xl-stx">${st.text||''}</div>`
   +(fl.length?`<div class="xl-sf">${fl.slice(0,1).map(([a,f])=>`<code dir="ltr"><span class="xl-sa">${a}</span> ${colorF(f,col)}</code>`).join('')}${fl.length>1?`<span class="xl-more">הנוסחה נגררת גם ל-<span dir="ltr">${fl[1][0]}${fl.length>2?':'+fl[fl.length-1][0]:''}</span>, וההפניות זזות איתה</span>`:''}</div>`:'')
   +(items?`<ul class="xl-si">${items}</ul>`:'')
   +`<div class="xl-sb"><button data-s="prev"${i===0?' disabled':''}>▶ הקודם</button><button data-s="next" class="xl-go">${i===N-1?'סיום ✔':'הבא ◀'}</button><button data-s="close">סגירה</button></div>`;
  changed();}
 function openSteps(){if(!stpEl||!cfg.steps||!cfg.steps.length)return;if(editing)cancel();
  if(!wt){push();wt={i:-1};}stpEl.hidden=false;if(stpEl.parentElement)stpEl.parentElement.classList.add('stp-on');goStep(Math.max(0,wt.i));}
 function closeSteps(){typT.forEach(clearInterval);typT=[];wt=null;stepMark={};if(stpEl){stpEl.hidden=true;stpEl.innerHTML='';if(stpEl.parentElement)stpEl.parentElement.classList.remove('stp-on');}}
 function finishSteps(){/* the last step leaves the sheet solved: any target no step wrote is filled from the solution, then checked */
  if(cfg.targets&&cfg.solution){cfg.targets.forEach(a=>{if(cfg.solution[a]!=null&&(S.raw[a]||'')!==cfg.solution[a])S.set(a,cfg.solution[a]);});Object.assign(S.fmt,cfg.solFmt||{});}
  closeSteps();render();if(cfg.targets)check(true);else changed();}
 if(stpEl){stpEl.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
  stpEl.addEventListener('click',e=>{const b=e.target.closest('button[data-s]');if(!b||!wt)return;const s=b.dataset.s;
   if(s==='next'){if(wt.i>=cfg.steps.length-1)finishSteps();else goStep(wt.i+1);}else if(s==='prev')goStep(wt.i-1);else if(s==='close'){closeSteps();render();}focusG();});}
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
  if(all&&!silent)host.dataset.solved='1';changed();}
 render();
 return {sheet:S,render,fit,select:(a)=>{const p=parseAddr(a);if(!p)return;grow(p.r,p.c);sel=p;sel2={...sel};render();reveal(p.r,p.c);},put:(a,v)=>{push();S.set(a,v);render();changed();},get:a=>S.val[a],raw:a=>S.raw[a],check,reset:()=>host.querySelector('[data-x="reset"]').click(),showFormulas:v=>{if(showF!==!!v)toggleF();},undo,redo,
  fmtSel:fn=>{eachSel(a=>{const f=fn(S.fmt[a]||'',S.val[a],display(S,a).t);if(f)S.fmt[a]=f;else delete S.fmt[a];});render();},
  fmtAt:a=>S.fmt[a]||'',styleAt:a=>S.st[a]||{},active:()=>addr(sel.r,sel.c),onSel:fn=>{cfg.onSelect=fn;},
  selectRange:(a,b)=>{const p=parseAddr(a),q=parseAddr(b||a);if(!p||!q)return;sel=p;sel2=q;render();},
  insertRows:(at,n)=>restructure('row',at,n||1),deleteRows:(at,n)=>restructure('row',at,-(n||1)),insertCols:(at,n)=>restructure('col',at,n||1),deleteCols:(at,n)=>restructure('col',at,-(n||1)),
  zoom:z=>{if(z!=null)setZoom(z);return Z;},layout:()=>cfg,
  steps:{open:openSteps,go:i=>{if(!wt)openSteps();goStep(i);},next:()=>{if(!wt)openSteps();else if(wt.i>=cfg.steps.length-1)finishSteps();else goStep(wt.i+1);},prev:()=>{if(wt)goStep(wt.i-1);},close:()=>{closeSteps();render();},index:()=>wt?wt.i:-1}};}
return {mount,shift,restruct,Sheet,addr,parseAddr,colName,tokenize,parse};
})();
