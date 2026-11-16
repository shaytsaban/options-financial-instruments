/* ===== trading simulator v2: account tiles, a movable index, an options board, an order ticket with a live preview,
   positions / resting orders / action log, click-to-explain on every component, guided tasks, settlement at expiry ===== */
(function () {
  const root = document.getElementById('sim1'); if (!root) return;
  const M = 50, K = [4200, 4250, 4300, 4350, 4400], S0 = 4290.15, SIG = 165, CR = 0.1, RNG = 400, EXP = '29.11.2026';
  const Q0 = { C: [[128, 132], [92, 95], [58, 60], [34, 36], [18, 20]], P: [[30, 33], [45, 48], [66, 69], [95, 98], [130, 134]] };
  const SZ = { bid: [12, 20, 31], ask: [7, 15, 24] }, TY = ['LMT', 'FOK', 'IOC'];
  /* ---------- formatting ---------- */
  const fx = (n, d) => { const r = +(+n).toFixed(d); return (r < 0 ? '−' : '') + Math.abs(r).toLocaleString('en-US', { maximumFractionDigits: d }); };
  const f = n => fx(n, 1), p2 = n => fx(n, 2);
  const L = s => `<span dir="ltr">${s}</span>`, sh = n => `${L(f(n))} ש״ח`, sg = n => (n > 0 ? '+' : '') + f(n);
  const kOf = k => +k.slice(1), isC = k => k[0] === 'C';
  const nm = k => (isC(k) ? 'Call ' : 'Put ') + kOf(k).toLocaleString('en-US');
  const ks = k => (+k).toLocaleString('en-US');
  /* ---------- a simple model price (Bachelier), used only to shift the quotes when the index moves ---------- */
  const erf = x => { const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
  const bach = (s, k) => { const d = (s - k) / SIG; return (s - k) * 0.5 * (1 + erf(d / Math.SQRT2)) + SIG * Math.exp(-d * d / 2) / Math.sqrt(2 * Math.PI); };
  const model = (c, s, k) => c ? bach(s, k) : bach(s, k) - (s - k);
  const intr = (k, s) => Math.max(isC(k) ? s - kOf(k) : kOf(k) - s, 0);
  /* ---------- state ---------- */
  let S, book, cash, pos, rest, sel, msg, real, log, nlog, closed, result, btab, stab, exp;
  const done = {};
  const TASKS = [
    ['t1', 'קנו Call 4,300 אחת בפקודת LMT.'],
    ['t2', 'שלחו FOK לקניית 20 Call 4,300 בהגבלת שער 60, וראו שהיא מתבטלת כולה.'],
    ['t3', 'שלחו אותה פקודה כ-IOC: חלק מתבצע מיד, והיתרה מתבטלת.'],
    ['t4', 'השאירו פקודת LMT ממתינה (קנייה במחיר נמוך מההיצע), ובטלו אותה.'],
    ['t5', 'כתבו Put 4,200 אחת, וקראו את דרישת הביטחונות.'],
    ['t6', 'העלו את המדד ב-50 נקודות, ובדקו מה קרה לרווח שלא מומש.'],
    ['t7', 'סגרו פוזיציה אחת, וקראו את הרווח שמומש.'],
    ['t8', 'בצעו פקיעה במדד הנוכחי, וקראו את טבלת התוצאות.']];
  function quotes() {
    book = {};
    K.forEach((k, i) => ['C', 'P'].forEach(t => {
      const c = t === 'C', d = Math.round(model(c, S, k) - model(c, S0, k)), b = Math.max(1, Q0[t][i][0] + d), a = Math.max(b + 1, Q0[t][i][1] + d);
      book[t + k] = { bid: [0, 1, 2].map(j => ({ p: b - j, q: SZ.bid[j] })).filter(l => l.p >= 1), ask: [0, 1, 2].map(j => ({ p: a + j, q: SZ.ask[j] })) };
    }));
  }
  function init() {
    S = S0; quotes(); cash = 100000; pos = {}; rest = []; sel = null; real = 0; log = []; nlog = 0; closed = false; result = null; btab = 'pos'; stab = 'tasks'; exp = null;
    msg = { c: 'info', t: 'לחצו על מחיר בלוח: מחיר היצע (Ask) פותח פקודת קנייה, ומחיר ביקוש (Bid) פותח פקודת מכירה. לחיצה על כל רכיב שמסומן בקו מנוקד מציגה הסבר.' };
    draw(); return out({ ok: true });
  }
  const best = (k, s) => book[k][s].find(l => l.q > 0);
  const reqOf = (k, q) => q < 0 ? -q * CR * kOf(k) * M : 0;
  const need = () => Object.entries(pos).reduce((a, [k, p]) => a + reqOf(k, p.q), 0);
  const markOf = (k, q) => { const s = q > 0 ? 'bid' : 'ask', b = best(k, s) || book[k][s][book[k][s].length - 1]; return b ? b.p : 0; };
  const unreal = () => Object.entries(pos).reduce((a, [k, p]) => a + (markOf(k, p.q) - p.cost / p.q) * p.q * M, 0);
  const posVal = () => Object.entries(pos).reduce((a, [k, p]) => a + markOf(k, p.q) * p.q * M, 0);
  const be = (k, avg) => isC(k) ? kOf(k) + avg : kOf(k) - avg;
  const snap = () => Object.fromEntries(Object.entries(pos).map(([k, p]) => { const m = markOf(k, p.q), avg = p.cost / p.q; return [k, { q: p.q, avg: +avg.toFixed(2), mark: m, pnl: +((m - avg) * p.q * M).toFixed(2), be: +be(k, avg).toFixed(2) }]; }));
  const out = x => Object.assign({ index: S, cash, need: need(), surplus: cash - need(), real, unreal: +unreal().toFixed(2), value: posVal(), pos: snap(), rest: rest.map(r => Object.assign({}, r)), closed }, x);
  function add(c, kind, t, w) { msg = { n: ++nlog, c, kind, t, w: w || '' }; log.unshift(msg); return msg; }
  /* ---------- matching ---------- */
  function match(k, buy, qty, lim) {
    const side = buy ? 'ask' : 'bid', lv = book[k][side].filter(l => l.q > 0 && (buy ? l.p <= lim : l.p >= lim)), avail = lv.reduce((a, l) => a + l.q, 0);
    let left = qty; const fills = [];
    for (const l of lv) { if (!left) break; const x = Math.min(left, l.q); fills.push({ p: l.p, q: x }); left -= x; }
    return { side, avail, fills, left, got: qty - left, val: fills.reduce((a, x) => a + x.p * x.q, 0) * M };
  }
  /* what the trade would do to cash and to the collateral requirement, before it is accepted */
  function check(k, buy, got, val) {
    const held = pos[k] ? pos[k].q : 0, after = held + (buy ? got : -got), reqAfter = need() - reqOf(k, held) + reqOf(k, after), cashAfter = cash + (buy ? -val : val);
    const sur = cashAfter - reqAfter, bad = got > 0 && sur < 0 && sur < cash - need();
    return { held, after, reqAfter, cashAfter, bad, why: !bad ? '' : cashAfter < 0 ? 'cash' : after < 0 && !buy ? 'write' : 'coll' };
  }
  function rejText(k, c, val) {
    if (c.why === 'cash') return `הפקודה נדחתה: אין מספיק מזומן. העסקה עולה ${sh(val)}, והמזומן בחשבון ${sh(cash)}.`;
    if (c.why === 'write') return `הפקודה נדחתה: מכירה של אופציה שאינה בידיכם היא כתיבה, והיא דורשת ביטחונות. דרישת הביטחונות אחרי העסקה ${sh(c.reqAfter)}, ובחשבון יהיו רק ${sh(c.cashAfter)}.`;
    return `הפקודה נדחתה: אחרי העסקה יישארו בחשבון ${sh(c.cashAfter)}, פחות מדרישת הביטחונות על האופציות שכתבתם, ${sh(c.reqAfter)}.`;
  }
  function apply(k, dq, price) {
    const p = pos[k] || { q: 0, cost: 0 }; let c = 0, pnl = 0;
    if (p.q === 0 || Math.sign(p.q) === Math.sign(dq)) { p.cost += dq * price; p.q += dq; }
    else {
      const avg = p.cost / p.q; c = Math.min(Math.abs(p.q), Math.abs(dq));
      pnl = +((price - avg) * c * Math.sign(p.q) * M).toFixed(2); real = +(real + pnl).toFixed(2); p.q += dq;
      p.cost = Math.abs(dq) > c ? price * p.q : avg * p.q;
    }
    if (p.q === 0) delete pos[k]; else pos[k] = p;
    return { c, pnl };
  }
  function commit(k, buy, m) {
    m.fills.forEach(x => { book[k][m.side].find(y => y.p === x.p).q -= x.q; });
    const a = apply(k, buy ? m.got : -m.got, m.val / M / m.got); cash += buy ? -m.val : m.val;
    if (a.c) done.t7 = 1;
    if (!buy && k === 'P4200' && pos[k] && pos[k].q < 0) done.t5 = 1;
    return a;
  }
  function fillText(k, buy, m, c, a) {
    const avg = m.val / M / m.got, where = m.fills.map(x => `${x.q} ב-${x.p}`).join(', ');
    let t = (m.got === 1 ? `${buy ? 'נקנתה' : 'נמכרה'} אופציית ${nm(k)} אחת, במחיר ${m.fills[0].p}.` : `${buy ? 'נקנו' : 'נמכרו'} ${m.got} אופציות ${nm(k)}: ${where}.`)
      + ` ${buy ? 'עלות' : 'תקבול'}: ${sh(m.val)}` + (m.fills.length > 1 ? ` (מחיר ממוצע ${p2(avg)}).` : '.');
    if (a.c) t += ` ${a.c === 1 ? 'נסגרה אופציה אחת' : `נסגרו ${a.c} אופציות`}: ${a.pnl < 0 ? 'הפסד' : 'רווח'} שמומש ${sh(Math.abs(a.pnl))}.`;
    if (a.c && m.got > a.c) t += ` היתרה, ${m.got - a.c}, פתחה פוזיציית ${buy ? 'קנייה (Long)' : 'כתיבה (Short)'} חדשה.`;
    if (!buy && c.after < 0) t += ` זו כתיבה: דרישת הביטחונות עכשיו ${sh(need())}.`;
    return t;
  }
  /* one order against the book. returns what happened, so the same function serves the screen and the tests */
  function order(o) {
    const k = o.key, buy = o.side === 'buy', qty = Math.floor(+o.qty), lim = +o.price, type = TY.includes(o.type) ? o.type : 'LMT';
    const fail = t => { add('bad', 'דחייה', t); draw(); return out({ ok: false, status: 'rejected', msg: msg.t, fills: [], got: 0, left: 0 }); };
    if (closed) return fail('המסחר נסגר: הסדרה פקעה. לחצו על איפוס כדי להתחיל מחדש.');
    if (!book[k]) return fail('האופציה לא נמצאה בלוח.');
    if (!(qty > 0)) return fail('הכמות חייבת להיות מספר שלם וחיובי.');
    if (!(lim > 0)) return fail('יש להזין מחיר. בשוק הנגזרים בתל אביב אין פקודת שוק: כל פקודה נושאת הגבלת שער.');
    const m = match(k, buy, qty, lim), opp = buy ? 'מוכר' : 'קונה', lab = `${type}, ${buy ? 'קנייה' : 'מכירה'} של ${qty} ${nm(k)} בהגבלת שער ${lim}`;
    const fin = (status, c, kind, t, w, a) => { add(c, kind, t, w); if (m.got) btab = 'pos'; else if (status === 'resting') btab = 'rest'; draw(); return out({ ok: true, status, fills: m.got && status !== 'cancelled' ? m.fills : [], got: status === 'cancelled' ? 0 : m.got, left: status === 'cancelled' ? qty : m.left, avg: m.got && status !== 'cancelled' ? +(m.val / M / m.got).toFixed(4) : 0, closedQty: a ? a.c : 0, realized: a ? a.pnl : 0, msg: msg.t }); };
    if (type === 'FOK' && m.avail < qty) {
      done.t2 = 1;
      return fin('cancelled', 'warn', 'ביטול', `FOK: בספר יש רק ${m.avail} יחידות במחיר ${lim} או במחיר טוב ממנו, ונדרשו ${qty}. הפקודה בוטלה כולה, ושום דבר לא בוצע.`, `${lab}. פקודת FOK מתבצעת רק אם כל הכמות זמינה מיד.`);
    }
    const c = check(k, buy, m.got, m.val);
    if (c.bad) return fail(rejText(k, c, m.val));
    if (!m.got) {
      if (type === 'LMT') { rest.push({ k, buy, q: qty, p: lim }); return fin('resting', 'info', 'ממתינה', `LMT: אין כרגע ${opp} במחיר ${lim} או במחיר טוב ממנו. הפקודה ממתינה בספר הפקודות עד סוף יום המסחר.`, `${lab}. פקודת LMT שלא בוצעה נשארת בספר, ותתבצע אם המחיר יגיע אליה.`); }
      return fin('cancelled', 'warn', 'ביטול', `IOC: אין כרגע ${opp} במחיר ${lim} או במחיר טוב ממנו. הפקודה בוטלה.`, `${lab}. פקודת IOC אינה ממתינה בספר.`);
    }
    const a = commit(k, buy, m); let t = fillText(k, buy, m, c, a), w = `${lab}. בספר ${buy ? 'היו מוכרים במחיר שאינו גבוה מהגבלת השער' : 'היו קונים במחיר שאינו נמוך מהגבלת השער'}.`;
    if (m.left) {
      if (type === 'LMT') { rest.push({ k, buy, q: m.left, p: lim }); t += ` יתרת ${m.left} יחידות ממתינה בספר במחיר ${lim}.`; w += ' היתרה לא מצאה צד נגדי במחיר ההגבלה, ולכן היא ממתינה.'; }
      else { t += ` IOC: יתרת ${m.left} יחידות בוטלה.`; w += ' פקודת IOC מבצעת מה שאפשר מיד, ומבטלת את היתרה.'; done.t3 = 1; }
    }
    if (buy && k === 'C4300' && type === 'LMT') done.t1 = 1;
    return fin(m.left ? 'partial' : 'filled', 'ok', 'ביצוע', t, w, a);
  }
  /* resting LMT orders that became marketable after an index move */
  function sweep() {
    const res = [], keep = [];
    rest.forEach(r => {
      const m = match(r.k, r.buy, r.q, r.p); if (!m.got) { keep.push(r); return; }
      const c = check(r.k, r.buy, m.got, m.val), lab = `פקודת LMT ממתינה: ${r.buy ? 'קנייה' : 'מכירה'} של ${r.q} ${nm(r.k)} בהגבלת שער ${r.p}`;
      if (c.bad) { add('bad', 'ביטול', `${lab}. המחיר הגיע אליה, אבל היא בוטלה. ${rejText(r.k, c, m.val).replace('הפקודה נדחתה: ', '')}`); res.push({ key: r.k, side: r.buy ? 'buy' : 'sell', status: 'cancelled', fills: [], got: 0, left: r.q }); return; }
      const a = commit(r.k, r.buy, m); let t = fillText(r.k, r.buy, m, c, a);
      if (m.left) { t += ` יתרת ${m.left} יחידות ממשיכה להמתין.`; keep.push(Object.assign(r, { q: m.left })); }
      add('ok', 'ביצוע', t, `${lab}. אחרי תזוזת המדד, ${r.buy ? 'ההיצע ירד אל הגבלת השער' : 'הביקוש עלה אל הגבלת השער'}, ולכן הפקודה בוצעה.`);
      res.push({ key: r.k, side: r.buy ? 'buy' : 'sell', status: m.left ? 'partial' : 'filled', fills: m.fills, got: m.got, left: m.left, realized: a.pnl });
    });
    rest = keep; return res;
  }
  function move(d) {
    d = +d;
    if (closed) { add('bad', 'דחייה', 'המסחר נסגר: הסדרה פקעה. לחצו על איפוס כדי להתחיל מחדש.'); draw(); return out({ ok: false, msg: msg.t }); }
    const to = +(S + d).toFixed(2);
    if (!d || Math.abs(to - S0) > RNG + 1e-9) { add('bad', 'דחייה', `המדד לא זז: הסימולטור מוגבל לטווח של ${RNG} נקודות מכל צד של ${p2(S0)}.`); draw(); return out({ ok: false, msg: msg.t }); }
    const u0 = unreal(), had = Object.keys(pos).length > 0, from = S; S = to; quotes(); const u1 = unreal();
    let t = `המדד ${d > 0 ? 'עלה' : 'ירד'} ב-${p2(Math.abs(d))} נקודות, מ-${p2(from)} ל-${p2(S)}. מחירי ה-Call ${d > 0 ? 'עלו' : 'ירדו'}, ומחירי ה-Put ${d > 0 ? 'ירדו' : 'עלו'}.`;
    if (had) t += ` הרווח שלא מומש: ${sh(u0)} לפני התזוזה, ${sh(u1)} אחריה.`;
    add('info', 'מדד', t, 'Call מרוויחה מעלייה במדד ו-Put מרוויחה מירידה. לכן קונה Call וכותב Put מרוויחים כשהמדד עולה, וקונה Put וכותב Call מרוויחים כשהוא יורד.');
    if (had && d === 50) done.t6 = 1;
    const head = msg, filled = sweep();
    if (filled.length) { btab = 'pos'; msg = { c: 'ok', t: head.t + ' ' + log[0].t }; }
    draw(); return out({ ok: true, d, from, unrealBefore: +u0.toFixed(2), unrealAfter: +u1.toFixed(2), filled, msg: msg.t });
  }
  function expire() {
    if (closed) { add('bad', 'דחייה', 'הסדרה כבר פקעה. לחצו על איפוס כדי להתחיל מחדש.'); draw(); return out({ ok: false, msg: msg.t }); }
    const nr = rest.length, rows = Object.entries(pos).map(([k, p]) => { const v = intr(k, S), avg = p.cost / p.q; return { key: k, q: p.q, avg: +avg.toFixed(2), intrinsic: +v.toFixed(2), payoff: +(v * M * p.q).toFixed(2), premium: +(-avg * M * p.q).toFixed(2), pnl: +((v - avg) * M * p.q).toFixed(2) }; });
    const pay = rows.reduce((a, r) => a + r.payoff, 0), tot = rows.reduce((a, r) => a + r.pnl, 0), freed = need();
    cash = +(cash + pay).toFixed(2); real = +(real + tot).toFixed(2); pos = {}; rest = []; sel = null; closed = true; result = { index: S, rows, pay, tot, real }; btab = 'res'; done.t8 = 1;
    add('warn', 'פקיעה', `הסדרה פקעה במדד ${p2(S)}. ` + (rows.length ? `${rows.length === 1 ? 'פוזיציה אחת סולקה' : rows.length + ' פוזיציות סולקו'} לפי הערך הפנימי: ${pay < 0 ? 'שילמתם' : 'קיבלתם'} ${sh(Math.abs(pay))}, והתוצאה מהפוזיציות האלה ${tot < 0 ? 'הפסד' : 'רווח'} של ${sh(Math.abs(tot))}.` : 'לא היו פוזיציות פתוחות.') + (freed ? ` דרישת הביטחונות, ${sh(freed)}, שוחררה.` : '') + (nr ? ` ${nr === 1 ? 'פקודה ממתינה אחת בוטלה' : nr + ' פקודות ממתינות בוטלו'}.` : '') + ' המסחר נסגר עד איפוס.',
      'בפקיעה Call שווה max(S − K, 0) ו-Put שווה max(K − S, 0). הקונה מקבל את הסכום הזה, והכותב משלם אותו. הסילוק כספי.');
    draw(); return out({ ok: true, rows, payoff: pay, pnl: tot, msg: msg.t });
  }
  function cancel(i) {
    const r = rest[+i]; if (!r) return out({ ok: false, msg: 'אין פקודה כזו.' });
    rest.splice(+i, 1); done.t4 = 1;
    add('info', 'ביטול', `הפקודה הממתינה בוטלה: ${r.buy ? 'קנייה' : 'מכירה'} של ${r.q} ${nm(r.k)} בהגבלת שער ${r.p}.`, 'פקודה שממתינה בספר אפשר לבטל כל עוד לא בוצעה. שום כסף לא עבר.');
    draw(); return out({ ok: true, cancelled: r, msg: msg.t });
  }
  /* ---------- explanations: one definition and one example with the numbers on the screen ---------- */
  const lv = (k, s) => book[k][s].filter(l => l.q > 0);
  const X = {
    cash: () => ['מזומן', 'הכסף הפנוי בחשבון. קנייה מקטינה אותו בפרמיה ששולמה, ומכירה מגדילה אותו בפרמיה שהתקבלה.', `המזומן עכשיו ${sh(cash)}. קנייה של Call 4,300 אחת במחיר 60 מקטינה אותו ב-${L('60 × 50 = 3,000')} ש״ח.`],
    val: () => { const e = Object.entries(pos)[0]; return ['שווי הפוזיציות', 'הסכום שיתקבל, או שישולם, אם כל הפוזיציות ייסגרו עכשיו. פוזיציית קנייה נסגרת במחיר הביקוש, ופוזיציית כתיבה נסגרת במחיר ההיצע.', e ? `${nm(e[0])}, כמות ${L(sg(e[1].q))}, מחיר סגירה ${markOf(e[0], e[1].q)}: ${L(`${markOf(e[0], e[1].q)} × 50 × ${fx(e[1].q, 0)} = ${f(markOf(e[0], e[1].q) * M * e[1].q)}`)} ש״ח. סך כל הפוזיציות: ${sh(posVal())}.` : `אין כרגע פוזיציות, ולכן השווי 0. אחרי קנייה של Call 4,300 אחת, השווי יהיה ${L(`${markOf('C4300', 1)} × 50 = ${f(markOf('C4300', 1) * M)}`)} ש״ח, לפי הביקוש.`]; },
    req: () => ['דרישת ביטחונות', 'סכום שכותב אופציה חייב להחזיק בחשבון, כדי להבטיח שיעמוד בהתחייבותו. בסימולטור: 10% × מחיר המימוש × 50 לכל אופציה שנכתבה. זו הפשטה לצורכי הכיתה: בבורסה הדרישה מחושבת לפי תרחישים.', `כתיבה של Put 4,200 אחת: ${L('10% × 4,200 × 50 = 21,000')} ש״ח. הדרישה עכשיו: ${sh(need())}.`],
    sur: () => ['עודף ביטחונות', 'המזומן פחות דרישת הביטחונות. פקודה שתוריד את העודף אל מתחת לאפס נדחית.', `עכשיו: ${L(`${f(cash)} − ${f(need())} = ${f(cash - need())}`)} ש״ח.`],
    real: () => ['רווח שמומש', 'רווח או הפסד מפוזיציות שכבר נסגרו. הוא סופי, ואינו משתנה עוד עם השוק.', `קונים ב-60 ומוכרים ב-58: ${L('(58 − 60) × 50 = −100')} ש״ח. עד עכשיו מומשו בחשבון ${sh(real)}.`],
    unreal: () => { const e = Object.entries(pos)[0]; return ['רווח שלא מומש', 'הרווח או ההפסד שייווצר אם הפוזיציות הפתוחות ייסגרו עכשיו. הוא משתנה עם כל תזוזה במחירים.', e ? `${nm(e[0])}, כמות ${L(sg(e[1].q))}: ${L(`(${markOf(e[0], e[1].q)} − ${p2(e[1].cost / e[1].q)}) × 50 × ${fx(e[1].q, 0)} = ${f((markOf(e[0], e[1].q) - e[1].cost / e[1].q) * M * e[1].q)}`)} ש״ח. סך הכול: ${sh(unreal())}.` : `אין כרגע פוזיציות. מי שקונה Call 4,300 ב-60 כשהביקוש 58 רואה מיד ${L('(58 − 60) × 50 = −100')} ש״ח: המרווח בין ביקוש להיצע הוא עלות.`]; },
    idx: () => ['מדד ת״א 35', 'נכס הבסיס של האופציות בלוח. שווי כל אופציה בפקיעה נקבע לפי רמת המדד באותו יום.', `המדד עכשיו ${p2(S)}. Call 4,300 שווה בפקיעה ${p2(intr('C4300', S))} נקודות, ו-Put 4,300 שווה ${p2(intr('P4300', S))} נקודות.`],
    exp: () => ['מועד הפקיעה', 'היום האחרון בחיי האופציה. האופציות על המדד אירופאיות: המימוש רק בפקיעה, בסילוק כספי.', `כל האופציות בלוח פוקעות ב-${EXP}. עד אז אפשר לקנות ולמכור אותן, ואחרי הפקיעה הן אינן קיימות.`],
    mult: () => ['מכפיל', 'הסכום בשקלים שכל נקודת מדד שווה. המחירים בלוח הם בנקודות, ולכן מכפילים ב-50 כדי לעבור לשקלים.', `פרמיה של 60 נקודות: ${L('60 × 50 = 3,000')} ש״ח לאופציה אחת.`],
    move: () => ['הזזת המדד', 'כפתורים שמשנים את רמת המדד, כדי לראות איך מחירי האופציות מגיבים. כשהמדד עולה, Call מתייקרת ו-Put מוזלת.', `לחיצה על ${L('+50')} תעלה את המדד מ-${p2(S)} ל-${p2(S + 50)}. פקודות LMT ממתינות שהמחיר הגיע אליהן יתבצעו.`],
    settle: () => ['פקיעה במדד הנוכחי', 'סוגרת את הסדרה ברמת המדד שעל המסך. כל פוזיציה מסולקת לפי הערך הפנימי: Call שווה max(S − K, 0), ו-Put שווה max(K − S, 0).', `במדד ${p2(S)}: Call 4,200 שווה ${p2(intr('C4200', S))} נקודות, כלומר ${sh(intr('C4200', S) * M)} לאופציה. Put 4,200 שווה ${p2(intr('P4200', S))}.`],
    call: () => ['Call, אופציית רכש', 'הזכות לקנות את נכס הבסיס במחיר המימוש. קונה Call מרוויח כשהמדד עולה.', `Call 4,300 בפקיעה במדד 4,400: ${L('(4,400 − 4,300) × 50 = 5,000')} ש״ח. במדד 4,300 או פחות: 0.`],
    put: () => ['Put, אופציית מכר', 'הזכות למכור את נכס הבסיס במחיר המימוש. קונה Put מרוויח כשהמדד יורד.', `Put 4,300 בפקיעה במדד 4,200: ${L('(4,300 − 4,200) × 50 = 5,000')} ש״ח. במדד 4,300 או יותר: 0.`],
    strike: k => { k = +k || 4300; const c = intr('C' + k, S), p = intr('P' + k, S); return ['מחיר המימוש (K)', 'רמת המדד שביחס אליה מחושב התקבול בפקיעה. כל שורה בלוח היא מחיר מימוש אחד: Call משמאל, ו-Put מימין.', `מחיר מימוש ${ks(k)}, והמדד ${p2(S)}: ` + (c > 0 ? `ה-Call בתוך הכסף ב-${p2(c)} נקודות, וה-Put מחוץ לכסף.` : p > 0 ? `ה-Put בתוך הכסף ב-${p2(p)} נקודות, וה-Call מחוץ לכסף.` : 'שתי האופציות בדיוק בכסף.')]; },
    bid: k => { k = book[k] ? k : 'C4300'; const b = best(k, 'bid'); return ['ביקוש (Bid)', 'המחיר הגבוה ביותר שקונה מוכן לשלם עכשיו. מי שמוכר מיד, מקבל את מחיר הביקוש.', b ? `ב-${nm(k)} הביקוש ${b.p}: מכירה של אופציה אחת מכניסה ${L(`${b.p} × 50 = ${f(b.p * M)}`)} ש״ח. לחיצה על המחיר פותחת פקודת מכירה.` : `ב-${nm(k)} אין כרגע קונים בספר.`]; },
    ask: k => { k = book[k] ? k : 'C4300'; const b = best(k, 'ask'); return ['היצע (Ask)', 'המחיר הנמוך ביותר שמוכר דורש עכשיו. מי שקונה מיד, משלם את מחיר ההיצע.', b ? `ב-${nm(k)} ההיצע ${b.p}: קנייה של אופציה אחת עולה ${L(`${b.p} × 50 = ${f(b.p * M)}`)} ש״ח. לחיצה על המחיר פותחת פקודת קנייה.` : `ב-${nm(k)} אין כרגע מוכרים בספר.`]; },
    qty: (k, s) => { k = book[k] ? k : 'C4300'; s = s === 'bid' ? 'bid' : 'ask'; const l = lv(k, s), w = s === 'ask' ? 'בהיצע' : 'בביקוש'; return ['כמות במחיר', 'מספר האופציות שמחכות בספר הפקודות במחיר הזה. פקודה גדולה מהכמות הזו תתבצע במחיר הזה רק בחלקה.', l.length ? `ב-${nm(k)} מחכות ${l[0].q} אופציות ${w} ${l[0].p}.` + (l.length > 1 ? ` אחריהן בספר: ${l.slice(1).map(x => `${x.q} ב-${x.p}`).join(', ')}.` : '') : `ב-${nm(k)} לא נשארה כמות ${w}. הזזת המדד מרעננת את הספר.`]; },
    badge: () => ['הפוזיציה שלכם', 'מספר האופציות שבידיכם מכל אופציה. מספר חיובי הוא קנייה (Long), ומספר שלילי הוא כתיבה (Short).', `${L('+2')} ליד Call 4,300: אתם מחזיקים שתי אופציות. ${L('−1')}: כתבתם אופציה אחת. עכשיו פתוחות ${Object.keys(pos).length} פוזיציות.`],
    side: () => ['פעולה', 'קנייה או מכירה. מכירה של אופציה שאינה בידיכם היא כתיבה (Short), והיא דורשת ביטחונות.', `מכירה של Put 4,200 אחת בלי להחזיק אותה: דרישת ביטחונות של ${L('10% × 4,200 × 50 = 21,000')} ש״ח.`],
    tqty: () => ['כמות בפקודה', 'מספר האופציות בפקודה. כל אופציה היא על 50 יחידות מדד.', sel ? `${sel.qty} אופציות במחיר ${sel.price}: ${L(`${sel.price} × 50 × ${sel.qty} = ${f(sel.price * M * sel.qty)}`)} ש״ח.` : `2 אופציות במחיר 60: ${L('60 × 50 × 2 = 6,000')} ש״ח.`],
    type: () => { const a = lv('C4300', 'ask'), q = a.length ? a[0].q : 0, p = a.length ? a[0].p : 60; return ['סוג הפקודה', 'קובע מה קורה לכמות שאי אפשר לבצע מיד. בשוק הנגזרים בתל אביב אין פקודת שוק: כל פקודה נושאת הגבלת שער.', `קנייה של 20 Call 4,300 בהגבלת שער ${p}, כשבהיצע מחכות ${q}: LMT קונה ${q}, ו-${20 - q} ממתינות. FOK מתבטלת כולה. IOC קונה ${q}, ו-${20 - q} מתבטלות.`]; },
    LMT: () => { const a = lv('C4300', 'ask'), q = a.length ? a[0].q : 0, p = a.length ? a[0].p : 60; return ['LMT, הגבלת שער (Limit)', 'מתבצעת רק במחיר שנקבע, או במחיר טוב ממנו. מה שלא בוצע נשאר בספר הפקודות, ומחכה עד סוף יום המסחר.', `קנייה של 20 Call 4,300 בהגבלת שער ${p}: ${q} נקנות מיד, ו-${20 - q} ממתינות בספר במחיר ${p}.`]; },
    FOK: () => { const a = lv('C4300', 'ask'), q = a.length ? a[0].q : 0, p = a.length ? a[0].p : 60; return ['FOK, הכול או כלום (Fill or Kill)', 'מתבצעת רק אם כל הכמות זמינה מיד, במחיר שנקבע או במחיר טוב ממנו. אחרת כל הפקודה מתבטלת.', `קנייה של 20 Call 4,300 בהגבלת שער ${p}: זמינות רק ${q}, ולכן שום דבר לא נקנה, והפקודה מתבטלת.`]; },
    IOC: () => { const a = lv('C4300', 'ask'), q = a.length ? a[0].q : 0, p = a.length ? a[0].p : 60; return ['IOC, מיד או ביטול (Immediate or Cancel)', 'מתבצעת מיד בכמות שזמינה במחיר שנקבע. היתרה מתבטלת, ואינה מחכה בספר.', `קנייה של 20 Call 4,300 בהגבלת שער ${p}: ${q} נקנות מיד, ו-${20 - q} מתבטלות.`]; },
    price: () => { const p = sel ? sel.price : 60, b = !sel || sel.buy; return ['הגבלת שער', 'המחיר הגרוע ביותר שאתם מוכנים לקבל, בנקודות. קונה לא ישלם יותר ממנה, ומוכר לא יקבל פחות ממנה.', b ? `קנייה בהגבלת שער ${p}: תתבצע ב-${p} או בפחות. היצע של ${p + 1} לא ייגע בפקודה.` : `מכירה בהגבלת שער ${p}: תתבצע ב-${p} או ביותר. ביקוש של ${p - 1} לא ייגע בפקודה.`]; },
    pvval: () => { const v = pv(); return ['שווי העסקה', 'מחיר × מכפיל × כמות, לפי הגבלת השער שהוזנה. אם הפקודה תתבצע במחיר טוב יותר, השווי ישתנה בהתאם.', v ? `${L(`${sel.price} × 50 × ${sel.qty} = ${f(v.val)}`)} ש״ח.` : `Call 4,300 אחת ב-60: ${L('60 × 50 × 1 = 3,000')} ש״ח.`]; },
    pvcash: () => { const v = pv(); return ['מזומן אחרי', 'יתרת המזומן אם כל הפקודה תתבצע במחיר ההגבלה. קנייה מקטינה את המזומן, ומכירה מגדילה אותו.', v ? `${L(`${f(cash)} ${sel.buy ? '−' : '+'} ${f(v.val)} = ${f(v.cashAfter)}`)} ש״ח.` : `מזומן 100,000, וקנייה ב-3,000: ${L('100,000 − 3,000 = 97,000')} ש״ח.`]; },
    pvreq: () => { const v = pv(); return ['דרישת ביטחונות אחרי', 'דרישת הביטחונות הכוללת אם כל הפקודה תתבצע. היא גדלה רק כשהפקודה פותחת או מגדילה כתיבה.', v ? `אחרי הפקודה: ${sh(v.reqAfter)}, לעומת ${sh(need())} עכשיו. עודף הביטחונות יהיה ${sh(v.cashAfter - v.reqAfter)}.` : `כתיבה של Call 4,300 אחת: ${L('10% × 4,300 × 50 = 21,500')} ש״ח.`]; },
    pvmax: () => { const v = pv(), w = v && v.after < 0 && !sel.buy; return [w ? 'הפסד הכותב' : 'הפסד מרבי', 'קונה אופציה יכול להפסיד לכל היותר את הפרמיה ששילם. אצל כותב, ההפסד אינו מוגבל בפרמיה שקיבל: הוא גדל ככל שהמדד נע נגדו.', w ? `כתיבה של ${nm(sel.key)} ב-${sel.price}: הפרמיה היא ${sh(sel.price * M)} לאופציה. ` + (isC(sel.key) ? `בפקיעה במדד ${ks(kOf(sel.key) + 200)} הכותב משלם ${L('200 × 50 = 10,000')} ש״ח לאופציה.` : `בפקיעה במדד ${ks(kOf(sel.key) - 200)} הכותב משלם ${L('200 × 50 = 10,000')} ש״ח לאופציה.`) : v && sel.buy ? `קנייה של ${sel.qty} ${nm(sel.key)} ב-${sel.price}: ההפסד המרבי ${L(`${sel.price} × 50 × ${sel.qty} = ${f(v.val)}`)} ש״ח.` : `קנייה של Call 4,300 אחת ב-60: ההפסד המרבי ${L('60 × 50 = 3,000')} ש״ח.`]; },
    copt: () => ['אופציה', 'סוג האופציה (Call או Put) ומחיר המימוש שלה. כל האופציות בלוח על מדד ת״א 35, לפקיעה אחת.', `Call 4,300: הזכות לקנות את המדד ב-4,300 בתאריך ${EXP}.`],
    cside: () => ['פוזיציה', 'קנייה (Long): אתם מחזיקים את האופציה, ושילמתם פרמיה. כתיבה (Short): מכרתם אופציה שלא החזקתם, קיבלתם פרמיה, ונטלתם התחייבות.', 'קונה Call 4,300 ב-60 משלם 3,000 ש״ח, וזה ההפסד המרבי שלו. כותב אותה אופציה מקבל 3,000 ש״ח, וזה הרווח המרבי שלו.'],
    cq: () => ['כמות', 'מספר האופציות בפוזיציה. הסימן פלוס מציין קנייה, והסימן מינוס מציין כתיבה.', `${L('+2')}: שתי אופציות בקנייה. כל נקודה במחיר האופציה שווה ${L('50 × 2 = 100')} ש״ח.`],
    cavg: () => ['מחיר ממוצע', 'הפרמיה הממוצעת, בנקודות, שבה נפתחה הפוזיציה. כשקונים בכמה מחירים, זה ממוצע משוקלל לפי הכמות.', `7 אופציות ב-60 ו-13 ב-61: ${L('(7 × 60 + 13 × 61) ÷ 20 = 60.65')} נקודות.`],
    cmark: () => ['מחיר סגירה', 'המחיר שבו אפשר לסגור את הפוזיציה עכשיו. קנייה נסגרת במכירה, במחיר הביקוש. כתיבה נסגרת בקנייה, במחיר ההיצע.', `ב-Call 4,300 עכשיו: מחזיק ימכור ב-${markOf('C4300', 1)}, וכותב יקנה בחזרה ב-${markOf('C4300', -1)}.`],
    cpnl: () => ['רווח / הפסד', 'הרווח שלא מומש בפוזיציה, בשקלים: (מחיר סגירה − מחיר ממוצע) × 50 × כמות. בכתיבה הכמות שלילית, ולכן ירידת מחיר היא רווח.', `קנייה של 2 ב-60, מחיר סגירה 58: ${L('(58 − 60) × 50 × 2 = −200')} ש״ח.`],
    cbe: () => ['נקודת איזון', 'רמת המדד בפקיעה שבה הפוזיציה אינה מרוויחה ואינה מפסידה. ב-Call: מחיר המימוש ועוד הפרמיה. ב-Put: מחיר המימוש פחות הפרמיה.', `Call 4,300 שנקנתה ב-60: ${L('4,300 + 60 = 4,360')}. Put 4,200 שנכתבה ב-30: ${L('4,200 − 30 = 4,170')}.`],
    cclose: () => ['סגירה', 'פותחת פקודה הפוכה לפוזיציה, באותה כמות, במחיר הסגירה הנוכחי. אחרי הביצוע, הרווח או ההפסד עוברים לרווח שמומש.', 'פוזיציית קנייה של 2 Call 4,300: הכפתור פותח פקודת מכירה של 2 במחיר הביקוש.'],
    crest: () => ['פקודות ממתינות', 'פקודות LMT שלא בוצעו, או בוצעו רק בחלקן, ומחכות בספר הפקודות. הן יתבצעו אם המחיר יגיע להגבלת השער, ואפשר לבטל אותן.', 'קנייה של Call 4,300 בהגבלת שער 55, כשההיצע 60: הפקודה ממתינה. אם המדד ירד וההיצע יגיע ל-55, היא תתבצע.'],
    rpay: () => ['סילוק בפקיעה', 'התקבול או התשלום בפקיעה: הערך הפנימי × 50 × כמות. קונה מקבל את הסכום, וכותב משלם אותו.', `Call 4,200 בפקיעה במדד ${p2(S)}: ${L(`${p2(intr('C4200', S))} × 50 = ${f(intr('C4200', S) * M)}`)} ש״ח לאופציה.`],
    rprem: () => ['פרמיה', 'הסכום ששולם בפתיחת פוזיציית קנייה (במינוס), או שהתקבל בפתיחת כתיבה (בפלוס).', `קנייה של Call 4,300 אחת ב-60: ${L('−3,000')} ש״ח. כתיבה של Put 4,200 אחת ב-30: ${L('+1,500')} ש״ח.`],
    rpnl: () => ['רווח / הפסד בפקיעה', 'התקבול או התשלום בפקיעה, ועוד הפרמיה שהתקבלה או פחות הפרמיה ששולמה.', `Call 4,300 שנקנתה ב-60, ופקעה במדד 4,400: ${L('(100 − 60) × 50 = 2,000')} ש״ח.`]
  };
  function posX(k) {
    const p = pos[k]; if (!p) return { t: nm(k), d: 'הפוזיציה הזו כבר נסגרה.', li: [] };
    const q = Math.abs(p.q), avg = p.cost / p.q, mk = markOf(k, p.q), kk = kOf(k), c = isC(k), b = be(k, avg), pnl = (mk - avg) * p.q * M, qq = q > 1 ? ` × ${q}` : '', res = `כלומר ${pnl < 0 ? 'הפסד' : 'רווח'} של ${sh(Math.abs(pnl))}`, qn = q === 1 ? `${nm(k)} אחת` : `${q} ${nm(k)}`;
    if (p.q > 0) return { t: `קנייה (Long) של ${qn}`, d: `אתם מחזיקים את הזכות ${c ? 'לקנות' : 'למכור'} את המדד ב-${ks(kk)} בפקיעה.`, li: [
      `<b>שילמתם:</b> פרמיה ממוצעת של ${p2(avg)} נקודות, ${L(`${p2(avg)} × 50${qq} = ${f(avg * M * q)}`)} ש״ח.`,
      `<b>הפסד מרבי:</b> הפרמיה ששולמה, ${sh(avg * M * q)}. כך יקרה אם בפקיעה המדד ${c ? 'לא יהיה מעל' : 'לא יהיה מתחת ל-'}${c ? ' ' : ''}${ks(kk)}.`,
      `<b>נקודת איזון:</b> ${L(`${ks(kk)} ${c ? '+' : '−'} ${p2(avg)} = ${p2(b)}`)}. ${c ? 'מעל הרמה' : 'מתחת לרמה'} הזו בפקיעה, הפוזיציה מרוויחה.`,
      `<b>סגירה עכשיו:</b> מכירה בביקוש ${mk} תכניס ${L(`${mk} × 50${qq} = ${f(mk * M * q)}`)} ש״ח, ${res}.`] };
    return { t: `כתיבה (Short) של ${qn}`, d: `התחייבתם לשלם לקונה את הערך הפנימי בפקיעה, אם המדד יהיה ${c ? 'מעל' : 'מתחת ל-'}${c ? ' ' : ''}${ks(kk)}.`, li: [
      `<b>קיבלתם:</b> פרמיה ממוצעת של ${p2(avg)} נקודות, ${L(`${p2(avg)} × 50${qq} = ${f(avg * M * q)}`)} ש״ח. זה הרווח המרבי.`,
      `<b>הפסד:</b> אינו מוגבל בפרמיה. כל נקודה שהמדד ${c ? 'עולה מעל' : 'יורד מתחת ל-'}${c ? ' ' : ''}${p2(b)} בפקיעה עולה ${sh(M * q)}.`,
      `<b>ביטחונות:</b> ${L(`10% × ${ks(kk)} × 50${qq} = ${f(reqOf(k, p.q))}`)} ש״ח, עד שהפוזיציה תיסגר.`,
      `<b>נקודת איזון:</b> ${L(`${ks(kk)} ${c ? '+' : '−'} ${p2(avg)} = ${p2(b)}`)}.`,
      `<b>סגירה עכשיו:</b> קנייה בהיצע ${mk} תעלה ${L(`${mk} × 50${qq} = ${f(mk * M * q)}`)} ש״ח, ${res}.`] };
  }
  /* ---------- drawing ---------- */
  function pv() {
    if (!sel) return null; const q = Math.floor(+sel.qty) || 0, p = +sel.price || 0, val = q * p * M, held = pos[sel.key] ? pos[sel.key].q : 0, after = held + (sel.buy ? q : -q);
    const reqAfter = need() - reqOf(sel.key, held) + reqOf(sel.key, after), cashAfter = cash + (sel.buy ? -val : val);
    return { q, p, val, held, after, reqAfter, cashAfter, bad: q > 0 && cashAfter - reqAfter < 0 && cashAfter - reqAfter < cash - need() };
  }
  function pvHtml() {
    const v = pv(); let last;
    if (sel.buy && v.held < 0) last = `<span>סוגרת כתיבה</span><b dir="ltr">${Math.min(v.q, -v.held)}</b>`;
    else if (sel.buy) last = `<span>הפסד מרבי</span><b dir="ltr">${f(v.val)} ₪</b>`;
    else if (v.after < 0) last = '<span>הפסד</span><b class="tdn">לא מוגבל בפרמיה</b>';
    else last = `<span>סוגרת קנייה</span><b dir="ltr">${v.q}</b>`;
    return `<div class="sx-e" data-e="pvval"><span>שווי העסקה</span><b dir="ltr">${f(v.val)} ₪</b></div><div class="sx-e" data-e="pvcash"><span>מזומן אחרי</span><b dir="ltr"${v.cashAfter < 0 ? ' class="tdn"' : ''}>${f(v.cashAfter)} ₪</b></div>`
      + `<div class="sx-e" data-e="pvreq"><span>ביטחונות אחרי</span><b dir="ltr"${v.bad ? ' class="tdn"' : ''}>${f(v.reqAfter)} ₪</b></div><div class="sx-e${!sel.buy && v.after < 0 ? ' sx-wr' : ''}" data-e="pvmax">${last}</div>`;
  }
  const cls = n => n < 0 ? 'tdn' : n > 0 ? 'up' : '';
  function draw() {
    const cell = (k, s) => { const b = best(k, s); return `<td class="sx-q ${s}${sel && sel.key === k && sel.buy === (s === 'ask') ? ' on' : ''}" data-k="${k}" data-s="${s}" title="${s === 'ask' ? 'פקודת קנייה' : 'פקודת מכירה'}"><b>${b ? b.p : '·'}</b><i class="sx-e" data-e="qty" data-k="${k}" data-s="${s}">${b ? b.q : ''}</i></td>`; };
    const bdg = k => `<td class="sx-pb">${pos[k] ? `<i class="sx-e ${pos[k].q > 0 ? 'lg' : 'sr'}" data-e="badge" dir="ltr">${sg(pos[k].q)}</i>` : ''}</td>`;
    const atm = K.reduce((a, k) => Math.abs(k - S) < Math.abs(a - S) ? k : a, K[0]);
    const rows = K.map(k => `<tr${k === atm ? ' class="atm"' : ''}>${bdg('C' + k)}${cell('C' + k, 'bid')}${cell('C' + k, 'ask')}<th class="sx-e" data-e="strike" data-k="${k}">${ks(k)}</th>${cell('P' + k, 'bid')}${cell('P' + k, 'ask')}${bdg('P' + k)}</tr>`).join('');
    const board = `<table class="sx-ch"><colgroup><col class="cb"><col><col><col class="ck"><col><col><col class="cb"></colgroup><tr class="g"><th colspan="3" class="sx-e" data-e="call">Call</th><th rowspan="2" class="sx-e" data-e="strike">מחיר מימוש</th><th colspan="3" class="sx-e" data-e="put">Put</th></tr><tr class="c"><th class="sx-e" data-e="badge">שלכם</th><th class="sx-e bid" data-e="bid">ביקוש Bid</th><th class="sx-e ask" data-e="ask">היצע Ask</th><th class="sx-e bid" data-e="bid" data-k="P4300">ביקוש Bid</th><th class="sx-e ask" data-e="ask" data-k="P4300">היצע Ask</th><th class="sx-e" data-e="badge">שלכם</th></tr>${rows}</table>`;
    let tk;
    if (closed) tk = '<div class="sx-th">חלון פקודה</div><div class="sx-hint">הסדרה פקעה, והמסחר נסגר.<br>תוצאות הפקיעה מוצגות בטבלה למטה.<br>לחצו על <b>איפוס</b> כדי להתחיל מחדש.</div>';
    else if (!sel) tk = '<div class="sx-th">חלון פקודה</div><div class="sx-hint">לחצו על מחיר בלוח כדי לפתוח פקודה:<br><b class="ask">היצע (Ask)</b> פותח פקודת קנייה<br><b class="bid">ביקוש (Bid)</b> פותח פקודת מכירה</div>';
    else tk = `<div class="sx-th ${sel.buy ? 'buy' : 'sell'}">${sel.buy ? 'פקודת קנייה' : 'פקודת מכירה'} · TA35 ${nm(sel.key)}<button class="sx-x" data-a="shut" title="סגירת החלון">×</button></div>
      <div class="sx-f"><span class="sx-e" data-e="side">פעולה</span><span class="sx-seg"><button data-sd="buy" class="${sel.buy ? 'on buy' : ''}">קנייה</button><button data-sd="sell" class="${sel.buy ? '' : 'on sell'}">מכירה</button></span><span class="sx-e" data-e="tqty">כמות</span><input data-f="qty" type="number" min="1" step="1" value="${sel.qty}"></div>
      <div class="sx-f"><span class="sx-e" data-e="type">סוג</span><span class="sx-seg" dir="ltr">${TY.map(x => `<button data-ty="${x}" class="${sel.type === x ? 'on' : ''}">${x}</button>`).join('')}</span><span class="sx-e" data-e="price">הגבלת שער</span><input data-f="price" type="number" min="1" step="1" value="${sel.price}"></div>
      <div class="sx-pv">${pvHtml()}</div>
      <button class="sx-send ${sel.buy ? 'buy' : 'sell'}" data-a="send">שליחת פקודת ${sel.buy ? 'קנייה' : 'מכירה'} · ${sel.type}</button>`;
    /* bottom panel */
    const sn = snap(), np = Object.keys(sn).length, th = (e, t) => `<th class="sx-e" data-e="${e}">${t}</th>`;
    let bot;
    if (btab === 'res' && result) {
      bot = `<table class="sx-tb"><thead><tr>${th('copt', 'אופציה')}${th('cside', 'פוזיציה')}${th('cq', 'כמות')}${th('settle', 'ערך פנימי')}${th('cavg', 'פרמיה (נק׳)')}${th('rpay', 'סילוק (₪)')}${th('rprem', 'פרמיה (₪)')}${th('rpnl', 'רווח / הפסד (₪)')}</tr></thead><tbody>`
        + (result.rows.map(r => `<tr><td>${nm(r.key)}</td><td>${r.q > 0 ? 'קנייה (Long)' : 'כתיבה (Short)'}</td><td dir="ltr">${sg(r.q)}</td><td dir="ltr">${p2(r.intrinsic)}</td><td dir="ltr">${p2(r.avg)}</td><td dir="ltr" class="${cls(r.payoff)}">${sg(r.payoff)}</td><td dir="ltr" class="${cls(r.premium)}">${sg(r.premium)}</td><td dir="ltr" class="${cls(r.pnl)}"><b>${sg(r.pnl)}</b></td></tr>`).join('') || '<tr class="empty"><td colspan="8">בפקיעה לא היו פוזיציות פתוחות</td></tr>')
        + `</tbody><tfoot><tr><td colspan="5">פקיעה במדד ${p2(result.index)} · רווח שמומש בחשבון כולו: <b dir="ltr" class="${cls(result.real)}">${sg(result.real)} ₪</b></td><td dir="ltr" class="${cls(result.pay)}">${sg(result.pay)}</td><td></td><td dir="ltr" class="${cls(result.tot)}"><b>${sg(result.tot)}</b></td></tr></tfoot></table>`;
    } else if (btab === 'rest') {
      bot = `<table class="sx-tb"><thead><tr><th>פעולה</th>${th('copt', 'אופציה')}${th('tqty', 'כמות')}${th('LMT', 'סוג')}${th('price', 'הגבלת שער')}<th>${'המחיר בלוח עכשיו'}</th>${th('crest', 'מה זה?')}</tr></thead><tbody>`
        + (rest.map((r, i) => { const b = best(r.k, r.buy ? 'ask' : 'bid'); return `<tr><td class="${r.buy ? 'up' : 'tdn'}">${r.buy ? 'קנייה' : 'מכירה'}</td><td>${nm(r.k)}</td><td dir="ltr">${r.q}</td><td dir="ltr">LMT</td><td dir="ltr">${r.p}</td><td>${r.buy ? 'היצע' : 'ביקוש'} ${b ? b.p : '·'}</td><td><button class="sx-bx" data-x="${i}">ביטול</button></td></tr>`; }).join('') || '<tr class="empty"><td colspan="7">אין פקודות ממתינות. פקודת LMT שלא מוצאת צד נגדי במחיר ההגבלה תופיע כאן.</td></tr>')
        + '</tbody></table>';
    } else if (btab === 'log') {
      bot = '<div class="sx-log">' + (log.map(l => `<div class="sx-lg ${l.c}"><b dir="ltr">${l.n}</b><em>${l.kind}</em><p>${l.t}${l.w ? ` <span><b>למה:</b> ${l.w}</span>` : ''}</p></div>`).join('') || '<div class="sx-lg0">היומן ריק. כל פקודה, ביטול, דחייה ותזוזת מדד יירשמו כאן, עם ההסבר.</div>') + '</div>';
    } else {
      bot = `<table class="sx-tb"><thead><tr>${th('copt', 'אופציה')}${th('cside', 'פוזיציה')}${th('cq', 'כמות')}${th('cavg', 'מחיר ממוצע')}${th('cmark', 'מחיר סגירה')}${th('cpnl', 'רווח / הפסד (₪)')}${th('cbe', 'נקודת איזון')}${th('cclose', 'סגירה')}</tr></thead><tbody>`
        + (Object.entries(sn).map(([k, p]) => `<tr class="sx-pr${exp && exp[0] === 'pos' && exp[1] === k ? ' on' : ''}" data-pk="${k}" title="לחיצה מסבירה את הפוזיציה"><td>${nm(k)}</td><td class="${p.q > 0 ? 'lg' : 'sr'}">${p.q > 0 ? 'קנייה (Long)' : 'כתיבה (Short)'}</td><td dir="ltr">${sg(p.q)}</td><td dir="ltr">${p2(p.avg)}</td><td dir="ltr">${p.mark}</td><td dir="ltr" class="${cls(p.pnl)}"><b>${sg(p.pnl)}</b></td><td dir="ltr">${p2(p.be)}</td><td><button class="sx-bx" data-cl="${k}">סגירה</button></td></tr>`).join('') || `<tr class="empty"><td colspan="8">${closed ? 'כל הפוזיציות סולקו בפקיעה' : 'אין פוזיציות פתוחות. אחרי ביצוע פקודה, הפוזיציה תופיע כאן, ולחיצה על השורה תסביר אותה.'}</td></tr>`)
        + '</tbody></table>';
    }
    const tb = (id, t) => `<button data-bt="${id}" class="${btab === id ? 'on' : ''}">${t}</button>`;
    /* side panel: tasks, or the explanation of whatever was clicked */
    const nd = TASKS.filter(t => done[t[0]]).length; let side;
    if (stab === 'tasks') side = `<div class="sx-tl">${TASKS.map((t, i) => `<div class="sx-tsk${done[t[0]] ? ' ok' : ''}"><b>${done[t[0]] ? '✓' : i + 1}</b><p>${t[1]}</p></div>`).join('')}</div>`;
    else if (!exp) side = '<div class="sx-x0">לחצו על כל רכיב שמסומן בקו מנוקד: אריח בחשבון, כותרת בלוח, כמות, שדה בחלון הפקודה, עמודה בטבלה או שורת פוזיציה. כאן יופיעו ההגדרה ודוגמה עם המספרים שעל המסך.</div>';
    else if (exp[0] === 'pos') { const x = posX(exp[1]); side = `<div class="sx-xt">${x.t}</div><p class="sx-xd">${x.d}</p><ul class="sx-xl">${x.li.map(l => `<li>${l}</li>`).join('')}</ul>`; }
    else { const x = X[exp[0]](exp[1], exp[2]); side = `<div class="sx-xt">${x[0]}</div><p class="sx-xd">${x[1]}</p><div class="sx-xx"><b>דוגמה:</b> ${x[2]}</div>`; }
    const dS = +(S - S0).toFixed(2), tile = (e, t, v, c) => `<div class="sx-tile sx-e" data-e="${e}"><span>${t}</span><b dir="ltr" class="${c || ''}">${f(v)} ₪</b></div>`;
    root.innerHTML = `<div class="sx-bar"><span class="sx-logo">◆ TradeDesk<small>סימולטור</small></span>${tile('cash', 'מזומן', cash)}${tile('val', 'שווי פוזיציות', posVal())}${tile('req', 'דרישת ביטחונות', need())}${tile('sur', 'עודף ביטחונות', cash - need())}${tile('real', 'רווח שמומש', real, cls(real))}${tile('unreal', 'רווח שלא מומש', unreal(), cls(unreal()))}<button class="sx-rst" data-a="reset">איפוס</button></div>
      <div class="sx-ix"><span class="sx-e" data-e="idx">מדד ת״א 35 <b dir="ltr">${p2(S)}</b></span>${dS ? `<em class="${cls(dS)}" dir="ltr">${dS > 0 ? '▲' : '▼'} ${sg(dS)}</em>` : ''}<span class="sep"></span><span class="sx-e" data-e="exp">פקיעה <b>${EXP}</b></span><span class="sep"></span><span class="sx-e" data-e="mult">מכפיל <b>${M} ₪</b> לנקודה</span><span class="sx-mv"><span class="sx-e" data-e="move">הזזת המדד</span><span dir="ltr">${[-50, -10, 10, 50].map(d => `<button data-mv="${d}" class="${d < 0 ? 'm' : 'p'}"${closed ? ' disabled' : ''}>${sg(d)}</button>`).join('')}</span></span><span class="sx-st"><button class="sx-set" data-a="expire"${closed ? ' disabled' : ''}>פקיעה במדד הנוכחי</button><i class="sx-e sx-qm" data-e="settle">?</i></span></div>
      <div class="sx-body"><div class="sx-left"><div class="sx-top">${board}<div class="sx-tk">${tk}</div></div>
      <div class="sx-msg ${msg.c}">${msg.n ? `<b dir="ltr">${msg.n}</b>` : ''}<p>${msg.t}</p></div>
      <div class="sx-bot"><div class="sx-tabs">${tb('pos', `פוזיציות (${np})`)}${tb('rest', `פקודות ממתינות (${rest.length})`)}${tb('log', `יומן פעולות (${log.length})`)}${result ? tb('res', 'תוצאות הפקיעה') : ''}</div><div class="sx-pane">${bot}</div></div></div>
      <div class="sx-side"><div class="sx-tabs"><button data-st="tasks" class="${stab === 'tasks' ? 'on' : ''}">משימות (${nd}/${TASKS.length})</button><button data-st="exp" class="${stab === 'exp' ? 'on' : ''}">מה זה?</button></div><div class="sx-sp">${side}</div></div></div>`;
    if (exp && stab === 'exp' && exp[0] !== 'pos') root.querySelectorAll(`[data-e="${exp[0]}"]`).forEach(el => { if ((el.dataset.k || '') === (exp[3] || '') && (el.dataset.s || '') === (exp[4] || '')) el.classList.add('sx-on'); });
  }
  /* ---------- events ---------- */
  const open = (k, buy, qty, price) => { sel = { key: k, buy, qty, type: 'LMT', price }; };
  root.addEventListener('click', e => {
    e.stopPropagation();
    const T = e.target, q = s => T.closest(s); let el;
    if ((el = q('[data-a]'))) {
      const a = el.dataset.a;
      if (a === 'reset') init();
      else if (a === 'expire') expire();
      else if (a === 'shut') { sel = null; draw(); }
      else if (a === 'send' && sel) order({ key: sel.key, side: sel.buy ? 'buy' : 'sell', qty: sel.qty, type: sel.type, price: sel.price });
    }
    else if ((el = q('[data-bt]'))) { btab = el.dataset.bt; draw(); }
    else if ((el = q('[data-st]'))) { stab = el.dataset.st; draw(); }
    else if ((el = q('[data-mv]'))) move(+el.dataset.mv);
    else if ((el = q('[data-x]'))) cancel(+el.dataset.x);
    else if ((el = q('[data-cl]'))) { const k = el.dataset.cl, p = pos[k]; if (p) { open(k, p.q < 0, Math.abs(p.q), markOf(k, p.q)); exp = ['pos', k]; draw(); } }
    else if ((el = q('[data-sd]')) && sel) { sel.buy = el.dataset.sd === 'buy'; draw(); }
    else if ((el = q('[data-ty]')) && sel) { sel.type = el.dataset.ty; exp = [sel.type, '', '', '', '']; stab = 'exp'; draw(); }
    else if ((el = q('.sx-e'))) { exp = [el.dataset.e, el.dataset.k, el.dataset.s, el.dataset.k || '', el.dataset.s || '']; stab = 'exp'; draw(); }
    else if ((el = q('td.sx-q')) && !closed) { const k = el.dataset.k, s = el.dataset.s, b = best(k, s) || book[k][s][book[k][s].length - 1]; open(k, s === 'ask', 1, b ? b.p : 1); exp = [s, k, '', '-', '-']; draw(); }
    else if ((el = q('tr[data-pk]'))) { exp = ['pos', el.dataset.pk]; stab = 'exp'; draw(); }
  });
  const field = e => { const k = e.target.dataset.f; if (!k || !sel) return false; sel[k] = +e.target.value; return true; };
  root.addEventListener('input', e => { if (field(e)) { const p = root.querySelector('.sx-pv'); if (p) p.innerHTML = pvHtml(); } });
  root.addEventListener('change', e => { if (field(e)) draw(); });
  ['keydown', 'keyup', 'keypress'].forEach(ev => root.addEventListener(ev, e => {
    e.stopPropagation();
    if (ev === 'keydown' && e.key === 'Enter' && e.target.dataset && e.target.dataset.f && sel) { field(e); order({ key: sel.key, side: sel.buy ? 'buy' : 'sell', qty: sel.qty, type: sel.type, price: sel.price }); }
  }));
  window.__sim = { order, init, move, expire, cancel, state: () => out({ log: log.map(l => Object.assign({}, l)), tasks: Object.assign({}, done), result }), explain: (k, a, b) => k === 'pos' ? posX(a) : X[k](a, b) };
  init();
})();
