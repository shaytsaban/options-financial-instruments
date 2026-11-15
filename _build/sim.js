/* ===== trading simulator: an options board, an order window, matching by order type, positions and collateral ===== */
(function () {
  const root = document.getElementById('sim1'); if (!root) return;
  const M = 50, K = [4200, 4250, 4300, 4350, 4400], INDEX = 4290.15;
  const Q = { C: [[128, 132], [92, 95], [58, 60], [34, 36], [18, 20]], P: [[30, 33], [45, 48], [66, 69], [95, 98], [130, 134]] };
  const SZ = { bid: [12, 20, 31], ask: [7, 15, 24] };
  const nm = k => (k[0] === 'C' ? 'Call ' : 'Put ') + (+k.slice(1)).toLocaleString('en-US');
  const f = n => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US');
  const L = n => `<span dir="ltr">${f(n)}</span>`;
  let book, cash, pos, rest, sel, msg, real;
  function init() {
    book = {}; K.forEach((k, i) => ['C', 'P'].forEach(t => { const [b, a] = Q[t][i]; book[t + k] = { bid: [0, 1, 2].map(j => ({ p: b - j, q: SZ.bid[j] })), ask: [0, 1, 2].map(j => ({ p: a + j, q: SZ.ask[j] })) }; }));
    cash = 100000; pos = {}; rest = []; sel = null; real = 0;
    msg = { c: 'info', t: 'לחצו על מחיר בלוח: לחיצה על היצע פותחת פקודת קנייה, ולחיצה על ביקוש פותחת פקודת מכירה.' }; draw();
  }
  const best = (k, s) => book[k][s].find(l => l.q > 0);
  const need = () => Object.entries(pos).reduce((a, [k, p]) => a + (p.q < 0 ? -p.q * 0.1 * +k.slice(1) * M : 0), 0);
  /* one order against the book. returns what happened, so the same function serves the screen and the tests */
  function order(o) {
    const k = o.key, buy = o.side === 'buy', qty = Math.floor(+o.qty), lim = +o.price, type = o.type;
    if (!book[k]) return fail('האופציה לא נמצאה בלוח.');
    if (!(qty > 0)) return fail('הכמות חייבת להיות מספר שלם וחיובי.');
    if (!(lim > 0)) return fail('יש להזין מחיר. בשוק הנגזרים בתל אביב אין פקודת שוק: כל פקודה נושאת הגבלת שער.');
    const side = buy ? 'ask' : 'bid', ok = l => l.q > 0 && (buy ? l.p <= lim : l.p >= lim);
    const lv = book[k][side].filter(ok), avail = lv.reduce((a, l) => a + l.q, 0);
    if (type === 'FOK' && avail < qty) return done(k, buy, qty, lim, type, [], qty, `FOK: בספר יש רק ${avail} יחידות במחיר ${lim} או טוב ממנו, ונדרשו ${qty}. הפקודה בוטלה כולה, ושום דבר לא בוצע.`);
    /* what the trade would do to cash and to the collateral requirement, before it is accepted */
    let left = qty, fills = [];
    for (const l of lv) { if (!left) break; const x = Math.min(left, l.q); fills.push({ p: l.p, q: x }); left -= x; }
    const got = qty - left, val = fills.reduce((a, x) => a + x.p * x.q, 0) * M;
    const held = pos[k] ? pos[k].q : 0, after = held + (buy ? got : -got);
    const reqAfter = need() - (held < 0 ? -held * 0.1 * +k.slice(1) * M : 0) + (after < 0 ? -after * 0.1 * +k.slice(1) * M : 0);
    const cashAfter = cash + (buy ? -val : val);
    if (got && cashAfter < 0) return fail(`אין מספיק כסף: העסקה עולה ${f(val)} ₪, והיתרה ${f(cash)} ₪. הפקודה נדחתה.`);
    if (got && after < 0 && cashAfter < reqAfter) return fail(`הפקודה נדחתה: מכירה של אופציה שאינה בידיכם היא כתיבה, ודורשת ביטחונות. דרישת הביטחונות אחרי העסקה ${f(reqAfter)} ₪, ובחשבון יהיו רק ${f(cashAfter)} ₪.`);
    fills.forEach(x => { const l = book[k][side].find(y => y.p === x.p); l.q -= x.q; });
    if (got) apply(k, buy ? got : -got, val / M / got);
    cash = cashAfter;
    let t;
    const avg = got ? val / M / got : 0, where = fills.map(x => `${x.q} ב-${x.p}`).join(', ');
    if (!got) t = type === 'LMT' ? `LMT: אין כרגע ${buy ? 'מוכר' : 'קונה'} במחיר ${lim} או טוב ממנו. הפקודה ממתינה בספר הפקודות עד סוף יום המסחר.` : `IOC: אין כרגע ${buy ? 'מוכר' : 'קונה'} במחיר ${lim} או טוב ממנו. הפקודה בוטלה.`;
    else {
      t = (got === 1 ? `${buy ? 'נקנתה' : 'נמכרה'} אופציית ${nm(k)} אחת, במחיר ${fills[0].p}.` : `${buy ? 'נקנו' : 'נמכרו'} ${got} אופציות ${nm(k)}: ${where}.`) + ` ${buy ? 'עלות' : 'תקבול'}: ${f(val)} ₪` + (fills.length > 1 ? ` (מחיר ממוצע ${avg.toFixed(2)}).` : '.');
      if (left) t += type === 'LMT' ? ` יתרת ${left} יחידות ממתינה בספר במחיר ${lim}.` : ` IOC: יתרת ${left} יחידות בוטלה.`;
      if (!buy && after < 0) t += ` זו כתיבה: דרישת הביטחונות עכשיו ${f(need())} ₪.`;
    }
    if (left && type === 'LMT') rest.push({ k, buy, q: left, p: lim });
    return done(k, buy, qty, lim, type, fills, left, t, got ? 'ok' : 'info');
  }
  function apply(k, dq, price) {
    const p = pos[k] || { q: 0, cost: 0 };
    if (p.q === 0 || Math.sign(p.q) === Math.sign(dq)) { p.cost += dq * price; p.q += dq; }
    else {
      const avg = p.cost / p.q, c = Math.min(Math.abs(p.q), Math.abs(dq));
      real += (price - avg) * c * Math.sign(p.q) * M; p.q += dq;
      p.cost = Math.abs(dq) > c ? price * p.q : avg * p.q;
    }
    if (p.q === 0) delete pos[k]; else pos[k] = p;
  }
  function fail(t) { msg = { c: 'bad', t }; draw(); return { ok: false, msg: t, cash, pos: snap() }; }
  function done(k, buy, qty, lim, type, fills, left, t, c) { msg = { c: c || 'warn', t }; draw(); return { ok: true, fills, left, msg: t, cash, need: need(), real, pos: snap() }; }
  const mark = (k, q) => { const b = best(k, q > 0 ? 'bid' : 'ask'); return b ? b.p : null; };
  const snap = () => Object.fromEntries(Object.entries(pos).map(([k, p]) => { const m = mark(k, p.q); return [k, { q: p.q, avg: +(p.cost / p.q).toFixed(2), mark: m, pnl: m == null ? null : (m - p.cost / p.q) * p.q * M }]; }));
  function draw() {
    const cell = (k, s) => { const b = best(k, s); return `<td class="${s} cl${sel && sel.key === k && sel.s === s ? ' on' : ''}" data-k="${k}" data-s="${s}" title="${s === 'ask' ? 'קנייה' : 'מכירה'}">${b ? b.p : '·'}<small>${b ? b.q : ''}</small></td>`; };
    const rows = K.map(k => `<tr${k === 4300 ? ' class="atm"' : ''}>${cell('C' + k, 'bid')}${cell('C' + k, 'ask')}<th>${k.toLocaleString('en-US')}</th>${cell('P' + k, 'bid')}${cell('P' + k, 'ask')}</tr>`).join('');
    const S = snap(), ps = Object.entries(S).map(([k, p]) => `<tr><td>${nm(k)}</td><td>${p.q > 0 ? 'קנייה (Long)' : 'כתיבה (Short)'}</td><td dir="ltr">${p.q > 0 ? '+' : '−'}${Math.abs(p.q)}</td><td dir="ltr">${p.avg}</td><td dir="ltr">${p.mark == null ? '·' : p.mark}</td><td class="${p.pnl < 0 ? 'tdn' : 'up'}">${p.pnl == null ? '·' : L(p.pnl)}</td></tr>`).join('') || '<tr class="empty"><td colspan="6">אין פוזיציות פתוחות</td></tr>';
    const rs = rest.map((r, i) => `<span class="rs">${r.buy ? 'קנייה' : 'מכירה'} ${r.q} ${nm(r.k)} ב-${r.p} <button data-x="${i}">ביטול</button></span>`).join('') || '<span class="rs0">אין פקודות ממתינות</span>';
    const tk = sel ? `<div class="t-ph ${sel.buy ? 'buy' : 'sell'}">${sel.buy ? 'פקודת קנייה' : 'פקודת מכירה'} · TA35 ${nm(sel.key)}</div>
      <label><span>פעולה</span><select data-f="side"><option value="buy"${sel.buy ? ' selected' : ''}>קנייה</option><option value="sell"${sel.buy ? '' : ' selected'}>מכירה</option></select></label>
      <label><span>כמות (אופציות)</span><input data-f="qty" type="number" min="1" value="${sel.qty}"></label>
      <label><span>סוג פקודה</span><select data-f="type">${['LMT', 'FOK', 'IOC'].map(x => `<option${sel.type === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <label><span>הגבלת שער (נקודות)</span><input data-f="price" type="number" min="1" value="${sel.price}"></label>
      <div class="est">שווי העסקה: <b dir="ltr">${f(sel.qty * sel.price * M)} ₪</b> <small>(${sel.qty} × ${sel.price} × ${M})</small></div>
      <button class="send ${sel.buy ? 'buy' : 'sell'}" data-go="1">שליחת פקודה</button>` : '<div class="t-ph">חלון פקודה</div><div class="t-hint">לחצו על מחיר בלוח כדי לפתוח פקודה</div>';
    root.innerHTML = `<div class="t-bar"><span class="t-logo">◆ TradeDesk</span><span class="t-tab on">לוח אופציות</span><span class="t-acc">מזומן: <b dir="ltr">${f(cash)} ₪</b></span><span class="t-acc">דרישת ביטחונות: <b dir="ltr">${f(need())} ₪</b></span><span class="t-acc">רווח שמומש: <b dir="ltr">${f(real)} ₪</b></span><button class="rst" data-r="1">איפוס</button><span class="t-demo">סימולטור</span></div>
      <div class="t-ix"><span>מדד ת״א 35</span><b>${INDEX.toLocaleString('en-US')}</b><span class="sep"></span><span>פקיעה: <b>29.11.2026</b></span><span class="sep"></span><span>מכפיל: <b>${M} ₪</b> לנקודה</span><span class="sep"></span><span>המספר הקטן בכל תא: הכמות במחיר הזה</span></div>
      <div class="s-main"><table class="s-ch"><tr class="g"><th colspan="2">Call</th><th></th><th colspan="2">Put</th></tr><tr class="c"><th>ביקוש (Bid)</th><th>היצע (Ask)</th><th>מחיר מימוש</th><th>ביקוש (Bid)</th><th>היצע (Ask)</th></tr>${rows}</table>
      <div class="s-tk">${tk}</div></div>
      <div class="s-msg ${msg.c}">${msg.t}</div>
      <div class="s-bot"><table class="t-ps"><tr><th>אופציה</th><th>פוזיציה</th><th>כמות</th><th>מחיר ממוצע</th><th>מחיר לסגירה</th><th>רווח / הפסד (₪)</th></tr>${ps}</table><div class="s-rest"><b>ממתינות:</b> ${rs}</div></div>`;
  }
  root.addEventListener('click', e => {
    const c = e.target.closest('td.cl'), x = e.target.closest('[data-x]');
    if (c) { const b = best(c.dataset.k, c.dataset.s); sel = { key: c.dataset.k, s: c.dataset.s, buy: c.dataset.s === 'ask', qty: 1, type: 'LMT', price: b ? b.p : 1 }; draw(); }
    else if (x) { rest.splice(+x.dataset.x, 1); msg = { c: 'info', t: 'הפקודה הממתינה בוטלה.' }; draw(); }
    else if (e.target.closest('[data-r]')) init();
    else if (e.target.closest('[data-go]') && sel) order({ key: sel.key, side: sel.buy ? 'buy' : 'sell', qty: sel.qty, type: sel.type, price: sel.price });
  });
  root.addEventListener('change', e => { const k = e.target.dataset.f; if (!k || !sel) return; if (k === 'side') sel.buy = e.target.value === 'buy'; else if (k === 'type') sel.type = e.target.value; else sel[k] = +e.target.value; draw(); });
  ['keydown', 'keyup', 'keypress'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
  window.__sim = { order, init, state: () => ({ cash, need: need(), real, pos: snap(), rest: rest.slice() }) };
  init();
})();
