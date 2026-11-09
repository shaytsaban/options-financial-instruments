# Lesson content, shared by the deck and the summary. Executed with MODE = 'deck' or 'pdf'.
from lib import *
import json, html as _html

COURSE = 'אופציות ומכשירים פיננסיים'
COURSE_FULL = 'אופציות ומכשירים פיננסיים מתוחכמים'
LESSON = globals().get('LESSON', 1)
TOTAL_PARTS = {1: 4, 2: 6}[LESSON]
# per lesson: deck title, subtitle, chips, cover line and the next meeting
LMETA = {
 1: dict(date='2.11.2026', h1=('למה צריך', 'מכשירים מתוחכמים?'), title='למה צריך מכשירים מתוחכמים',
         sub='נגזרים, חשיפה, וחוזה אקדמה (Forward) צעד אחר צעד.', chip='מקרים שלמים: מתי לגדר',
         cover='נגזרים, חשיפה, חשיפה נטו, חוזה אקדמה וחוזה עתידי, עם תרגול מסכם.',
         next_h='אופציות', next_t='אופציות רכש (Call) ומכר (Put), השחקנים, הבורסות ומקרה בוחן בגידור דלק. קריאה: Hull, פרק 1, החלקים על אופציות.'),
 2: dict(date='9.11.2026', h1=('אבני הבניין:', 'אופציות, שחקנים ושווקים'), title='אופציות, שחקנים ושווקים',
         sub='Call ו-Put צעד אחר צעד, מגדרים וספקולנטים, הבורסות, ומקרה בוחן: גידור דלק בחברת תעופה.', chip='מקרה בוחן: דלק סילוני',
         cover='אופציות, מכפיל, אירופאית ואמריקאית, עסקת החלפה, שחקנים, בורסות ומקרה בוחן בגידור דלק.',
         next_h='חוזים עתידיים', next_t='חוזה אקדמה מול חוזה עתידי, מנגנון הביטחונות לעומק, סוגי חוזים, וגידור מטבע אצל יצואן ישראלי. קריאה: Hull, פרק 2.')}[LESSON]
SL = []            # every slide, in order
CUR = [None]       # current part number
NACT = [0]


def S(sid, title, h, body, kick=None, cls='', kind='slide'):
    if kick and kick.startswith('חלק None'):
        kick = 'לפני שמתחילים · חימום'
    SL.append(dict(id=sid, title=title, h=h, body=link_terms(body), kick=kick, cls=cls, kind=kind, part=CUR[0]))


def ST(n, html, tag='div', cls=''):
    return f'<{tag} class="st {cls}" data-n="{n * 10}">{html}</{tag}>'


def DEF(name, text, demo, n=0, trm=None, cls=''):
    """One definition with its small numeric demonstration."""
    hd = f'[[{trm}|{name}]]' if trm else name
    inner = f'<b class="dn">{TX(hd)}</b><p>{TX(text)}</p><div class="demo"><b>דוגמה:</b> {TX(demo)}</div>'
    return ST(n, inner, cls='card def ' + cls) if n else f'<div class="card def {cls}">{inner}</div>'


def BAND(kind, text, n=0):
    lab = {'dg': 'דגש', 'trap': 'המלכודת', 'note': 'הערה'}.get(kind, '')
    inner = (f'<b>{lab}:</b> ' if lab else '') + TX(text)
    return ST(n, inner, cls='band ' + kind) if n else f'<div class="band {kind}">{inner}</div>'


def TABLE(head, rows, cls=''):
    h = ''.join(f'<th>{TX(x)}</th>' for x in head)
    b = ''.join('<tr>' + ''.join(f'<td>{TX(c)}</td>' for c in r) + '</tr>' for r in rows)
    return f'<table class="tbl2 {cls}"><tr>{h}</tr>{b}</table>'


def mc(qid, q, opts, a, why, rot=True, rem=''):
    # options are written with the right answer first; a fixed rotation per question places it
    r = sum(map(ord, qid)) % len(opts) if rot else 0
    opts = opts[r:] + opts[:r]
    a = (a - r) % len(opts)
    o = ''
    for i, t in enumerate(opts):
        mark = ' correct' if MODE == 'pdf' and i == a else ''
        o += f'<button class="o{mark}" data-i="{i}">{"אבגדה"[i]}. {TX(t)}</button>'
    r = f'<div class="rem"><b>📐 נוסחה:</b> {TX(rem)}</div>' if rem else ''
    return f'<div class="mc" data-a="{a}" id="{qid}"><div class="q">{TX(q)}</div>{r}{o}<div class="w"><b>הסבר:</b> {TX(why)}</div></div>'


def TABLES(head, rows, cls='', start=1):
    """A table whose rows appear one click at a time."""
    h = ''.join(f'<th>{TX(x)}</th>' for x in head)
    b = ''.join(ST(start + i, ''.join(f'<td>{TX(c)}</td>' for c in r), 'tr') for i, r in enumerate(rows))
    return f'<table class="tbl2 {cls}"><tr>{h}</tr>{b}</table>'


def MEME(face, top, bottom, n=0):
    """An original meme in the classic format: a picture, a line above it and a punchline below."""
    svg = f'<svg viewBox="0 0 120 120" dir="ltr" role="img" aria-hidden="true">{TOONS[face]}</svg>'
    inner = f'<div class="mm-t">{TX(top)}</div>{svg}<div class="mm-b">{TX(bottom)}</div>'
    return ST(n, inner, cls='toon meme') if n else f'<div class="toon meme">{inner}</div>'


def MORE(label, body):
    """A red line to click when there is no room on the slide for the full explanation."""
    if MODE == 'pdf':
        return f'<div class="band note"><b>{TX(label)}</b> {body}</div>'
    return f'<details class="more"><summary>{TX(label)}</summary><div class="more-b">{body}</div></details>'


def MCS(sid, title, h, items):
    S(sid, title, h, f'<div class="mcrow n{len(items)}">' + ''.join(items) + '</div>', kick=f'חלק {CUR[0]} · בדיקת הבנה')


def opener(n, title, q, learn, mins, note=''):
    CUR[0] = n
    SL.append(dict(id=f'p-{n}', title=f'פתיחת חלק {n}: {title}', h=title, kind='opener', part=n, q=q, learn=learn, mins=mins, note=note, cls='', kick=None, body=''))


def calc(cid, title, h, intro, fields, pdfx):
    if MODE == 'pdf':
        S('c-' + cid, title, h, f'<div class="calcp"><b>מחשבון במצגת.</b> {TX(intro)} <b>דוגמה:</b> {TX(pdfx)}</div>', kind='calcp')
        return
    NACT[0] += 1
    fs = ''.join(f'<label class="cf"><span>{TX(f[1])}</span><input data-k="{f[0]}" value="{f[2]}" dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false"></label>' for f in fields)
    S('c-' + cid, title, h, f'<div class="calc" data-calc="{cid}"><div class="cin"><p class="cint">{TX(intro)}</p><div class="cfs">{fs}</div></div><div class="cout" id="out-{cid}"></div></div>', kick=f'חלק {CUR[0]} · מחשבון')


def _solitems(items, start=1):
    out, n = [], start
    for it in items:
        if it.startswith('=!'):
            out.append(ST(n, M(it[2:]), cls='eq fit').replace('class="st eq fit"', 'class="st eq fit" dir="ltr"'))
        elif it.startswith('='):
            out.append(ST(n, M(it[1:]), cls='eq').replace('class="st eq"', 'class="st eq" dir="ltr"'))
        else:
            out.append(ST(n, TX(it), 'p', 'sp'))
        n += 1
    return ''.join(out), n


def Q(sid, tag, title, stem, sol, ans, note=None, extra=None):
    """A worked question: the question beside its solution, the solution revealed click by click."""
    note = note or []
    head = f'{tag}: {title}'
    stem_html = ''.join(f'<p>{TX(x)}</p>' for x in stem)
    s1, n = _solitems(sol)
    if MODE == 'pdf':
        b = f'<div class="qstem">{stem_html}</div>{extra or ""}<div class="sol">{s1}</div><div class="band ans"><b>תשובה:</b> {TX(ans)}</div>' + ''.join(BAND(a, t) for a, t in note)
        S(sid, head, head, b, kind='q')
        return
    end = ST(n, f'<b>תשובה:</b> {TX(ans)}', cls='band ans') + ''.join(BAND(a, t, n + 1 + i) for i, (a, t) in enumerate(note))
    body = f'<div class="qg"><div class="qr"><div class="card qstem">{stem_html}</div>{extra or ""}</div><div class="solw">{s1}{end}</div></div>'
    S(sid, head, head, body, kick=f'חלק {CUR[0]} · {tag}', cls='qslide')


def CAP(t):
    return f'<p class="cap">{TX(t)}</p>'


def rcard(n, t, d, m, go):
    return f'<button class="rcard" data-go="{go}"><div class="n">{n}</div><b>{t}</b><span>{TX(d)}</span><em>{m}</em></button>'


def XL(f):
    """An Excel formula. ¤ stands for the dollar sign, which the text markup reserves for math."""
    return f'<code class="xl" dir="ltr">{f}</code>'


# ---------------------------------------------------------------- activities
def _cfg(d):
    return _html.escape(json.dumps(d, ensure_ascii=False), quote=True)


def _bar(*btns):
    return '<div class="actbar">' + ''.join(btns) + '</div>'


CHK = '<button class="abtn chk">בדיקה</button>'
NXT = '<button class="abtn ghost nxt" disabled>המשך</button>'
RST = '<button class="abtn ghost rst">איפוס</button>'


def SORTER(aid, title, h, task, options, rows):
    """Each row gets one right answer out of options. rows: (text, answer index, why)."""
    if MODE == 'pdf':
        t = ''.join(f'<tr><td>{TX(a)}</td><td><b>{options[b]}</b></td><td>{TX(c)}</td></tr>' for a, b, c in rows)
        S(aid, title, h, f'<p>{TX(task)}</p><table class="tbl2"><tr><th>מצב</th><th>תשובה</th><th>נימוק</th></tr>{t}</table>')
        return
    NACT[0] += 1
    r = ''
    for a, b, c in rows:
        bs = ''.join(f'<button class="so" data-i="{i}">{o}</button>' for i, o in enumerate(options))
        r += f'<tr class="srow" data-a="{b}" data-w="{_html.escape(TX(c), quote=True)}"><td>{TX(a)}</td><td>{bs}</td></tr>'
    body = (f'<div class="act sorter" id="{aid}-w"><div class="tasktxt"><b>המשימה:</b> {TX(task)}</div><table class="stbl">{r}</table>'
            f'<div class="fbbar">בחרו תשובה בכל שורה.</div><div class="actbar">{RST}<span class="score">0 / {len(rows)}</span></div></div>')
    S(aid, title, h, body, kick=f'חלק {CUR[0]} · פעילות')


def NUMQ(qid, q, ans, tol, unit, why, hint):
    """A checked numeric question, to place inside a slide body."""
    if MODE == 'pdf':
        return f'<div class="calcp"><b>בדיקה עצמית.</b> {TX(q)} <b>תשובה:</b> <span class="n">{f'{ans:,}'.replace('-', '−')}</span> {TX(unit)}. {TX(why)}</div>'
    NACT[0] += 1
    return (f'<div class="act numq" id="{qid}" data-a="{ans}" data-tol="{tol}" data-w="{_html.escape(TX(why), quote=True)}" data-h="{_html.escape(TX(hint), quote=True)}"><div class="q">{TX(q)}</div>'
            f'<div class="numrow"><input dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="תשובה"><span>{TX(unit)}</span>{CHK}</div><div class="fbbar">הקלידו מספר ולחצו ״בדיקה״.</div></div>')


def _txc(s):
    return TX(s)


# ---------------------------------------------------------------- cartoons with a punchline
TOONS = {
 'barrel': '<rect x="28" y="20" width="64" height="88" rx="14" fill="#8a5a2b"/><rect x="24" y="38" width="72" height="7" rx="3" fill="#5b3a1a"/><rect x="24" y="84" width="72" height="7" rx="3" fill="#5b3a1a"/><circle cx="48" cy="58" r="6" fill="#fff"/><circle cx="72" cy="58" r="6" fill="#fff"/><circle cx="49" cy="59" r="3" fill="#111"/><circle cx="73" cy="59" r="3" fill="#111"/><path d="M46 72q14 11 28 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M40 20l40 0-6-12-28 0z" fill="#1b2d55"/>',
 'plane': '<path d="M12 62q2-14 22-16l58-4q14 0 18 10-4 10-18 12l-58 4q-20 0-22-6z" fill="#e8eefb" stroke="#1b2d55" stroke-width="3"/><path d="M56 62l-20 34h14l28-36z" fill="#27447f"/><path d="M24 46l-10-22h10l16 20z" fill="#ff6a4d"/><circle cx="88" cy="50" r="5" fill="#111"/><path d="M80 60q8 6 16 1" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/><path d="M104 28q6 9 0 13q-6-4 0-13z" fill="#58b8e0"/>',
 'seesaw': '<path d="M60 74l-14 26h28z" fill="#1b2d55"/><line x1="10" y1="88" x2="110" y2="52" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><circle cx="22" cy="68" r="13" fill="#ffd37a"/><circle cx="98" cy="34" r="13" fill="#7fe3d6"/><path d="M16 73q6-6 12 0" fill="none" stroke="#111" stroke-width="2.5"/><path d="M92 36q6 6 12 0" fill="none" stroke="#111" stroke-width="2.5"/><circle cx="18" cy="65" r="2" fill="#111"/><circle cx="26" cy="65" r="2" fill="#111"/><circle cx="94" cy="31" r="2" fill="#111"/><circle cx="102" cy="31" r="2" fill="#111"/>',
 'umbrella': '<path d="M14 58q46-56 92 0z" fill="#ff6a4d"/><line x1="60" y1="58" x2="60" y2="100" stroke="#1b2d55" stroke-width="5"/><path d="M60 100q0 10-10 8" fill="none" stroke="#1b2d55" stroke-width="5" stroke-linecap="round"/><path d="M26 12q4 6 0 9q-4-3 0-9zM60 4q4 6 0 9q-4-3 0-9zM94 12q4 6 0 9q-4-3 0-9z" fill="#58b8e0"/>',
 'lever': '<path d="M46 86l-13 22h26z" fill="#1b2d55"/><line x1="4" y1="50" x2="116" y2="92" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/><ellipse cx="18" cy="38" rx="17" ry="15" fill="#8a93aa"/><circle cx="104" cy="74" r="9" fill="#ffd37a" stroke="#a86703" stroke-width="2"/><text x="104" y="79" text-anchor="middle" font-size="20" font-weight="800" fill="#a86703">₪</text>',
 'dice': '<rect x="14" y="30" width="60" height="60" rx="12" fill="#fff" stroke="#1b2d55" stroke-width="4" transform="rotate(-12 44 60)"/><circle cx="32" cy="48" r="5" fill="#ff6a4d"/><circle cx="56" cy="44" r="5" fill="#ff6a4d"/><circle cx="44" cy="62" r="5" fill="#ff6a4d"/><circle cx="34" cy="78" r="5" fill="#ff6a4d"/><circle cx="58" cy="74" r="5" fill="#ff6a4d"/><rect x="66" y="58" width="42" height="42" rx="9" fill="#ffd37a" stroke="#1b2d55" stroke-width="4" transform="rotate(14 87 79)"/><circle cx="87" cy="79" r="5" fill="#1b2d55"/>',
 'sweat': '<circle cx="58" cy="62" r="40" fill="#ffd37a"/><circle cx="44" cy="54" r="5" fill="#111"/><circle cx="72" cy="54" r="5" fill="#111"/><path d="M42 80q16-12 32 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/><path d="M102 30q8 12 0 17q-8-5 0-17z" fill="#58b8e0"/><text x="16" y="28" font-size="28" font-weight="800" fill="#107c41">$</text>',
 'hands': '<rect x="36" y="14" width="48" height="58" rx="5" fill="#fff" stroke="#1b2d55" stroke-width="3"/><line x1="44" y1="28" x2="76" y2="28" stroke="#8a93aa" stroke-width="3"/><line x1="44" y1="38" x2="76" y2="38" stroke="#8a93aa" stroke-width="3"/><line x1="44" y1="48" x2="66" y2="48" stroke="#8a93aa" stroke-width="3"/><path d="M6 84l30-4 24 12 24-12 30 4v16H6z" fill="#27447f"/><path d="M42 82q18-12 36 0q-6 14-18 14t-18-14z" fill="#ffd37a" stroke="#a86703" stroke-width="2"/>',
 'ref': '<circle cx="60" cy="38" r="26" fill="#ffd37a"/><circle cx="50" cy="34" r="4" fill="#111"/><circle cx="70" cy="34" r="4" fill="#111"/><path d="M48 48q12 8 24 0" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/><path d="M26 112q0-46 34-46t34 46z" fill="#fff" stroke="#111" stroke-width="3"/><path d="M42 72v40M60 66v46M78 72v40" stroke="#111" stroke-width="6"/><circle cx="98" cy="52" r="8" fill="#ff6a4d"/>',
 'hourglass': '<path d="M30 14h60v8q0 22-22 38q22 16 22 38v8H30v-8q0-22 22-38Q30 44 30 22z" fill="#eef2ff" stroke="#1b2d55" stroke-width="4"/><path d="M42 26h36q-4 16-18 26q-14-10-18-26z" fill="#ffd37a"/><path d="M38 100q6-22 22-30q16 8 22 30z" fill="#ffd37a"/>',
 'wheat': '<rect x="20" y="56" width="80" height="50" fill="#e8eefb" stroke="#1b2d55" stroke-width="3"/><path d="M14 56l46-30 46 30z" fill="#27447f"/><path d="M36 64v36M60 64v36M84 64v36" stroke="#1b2d55" stroke-width="5"/><path d="M104 12v50M104 22l-9-7M104 22l9-7M104 34l-9-7M104 34l9-7M104 46l-9-7M104 46l9-7" stroke="#e8960c" stroke-width="4" stroke-linecap="round"/>',
 'robot': '<rect x="22" y="26" width="76" height="72" rx="14" fill="#217346"/><text x="60" y="58" text-anchor="middle" font-size="24" font-weight="800" fill="#fff">fx</text><circle cx="44" cy="70" r="6" fill="#fff"/><circle cx="76" cy="70" r="6" fill="#fff"/><circle cx="45" cy="71" r="3" fill="#111"/><circle cx="77" cy="71" r="3" fill="#111"/><path d="M46 84q14 9 28 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><line x1="60" y1="26" x2="60" y2="10" stroke="#217346" stroke-width="4"/><circle cx="60" cy="8" r="5" fill="#ff6a4d"/>',
 'cool': '<circle cx="60" cy="62" r="40" fill="#ffd37a"/><path d="M26 50h68v6q-2 14-16 14t-16-12h-4q-2 12-16 12t-16-14z" fill="#16213a"/><path d="M44 84q16 12 32 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>',
 'shock': '<circle cx="60" cy="62" r="40" fill="#ffd37a"/><circle cx="45" cy="52" r="8" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="75" cy="52" r="8" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="45" cy="52" r="3" fill="#111"/><circle cx="75" cy="52" r="3" fill="#111"/><ellipse cx="60" cy="84" rx="9" ry="12" fill="#5b1a1a"/><path d="M98 22l6-12M106 34l12-4M90 14l0-12" stroke="#e0454f" stroke-width="4" stroke-linecap="round"/>',
 'sleep': '<circle cx="58" cy="64" r="40" fill="#ffd37a"/><path d="M38 58q7 6 14 0M64 58q7 6 14 0" fill="none" stroke="#111" stroke-width="3.5" stroke-linecap="round"/><path d="M48 82q10 6 20 0" fill="none" stroke="#111" stroke-width="3.5" stroke-linecap="round"/><text x="84" y="34" font-size="30" font-weight="800" fill="#27447f">z</text><text x="100" y="16" font-size="26" font-weight="800" fill="#27447f">z</text>',
 'voucher': '<rect x="10" y="36" width="100" height="52" rx="8" fill="#fff0d2" stroke="#a86703" stroke-width="3"/><line x1="78" y1="36" x2="78" y2="88" stroke="#a86703" stroke-width="3" stroke-dasharray="4 4"/><path d="M22 62l34-8-6 8 6 8z" fill="#27447f"/><text x="94" y="68" text-anchor="middle" font-size="18" font-weight="800" fill="#a86703">₪</text>',
}


def TOON(key, punch, n=0):
    """A small cartoon with a punchline, in the empty corner of a slide."""
    svg = f'<svg viewBox="0 0 120 120" dir="ltr" role="img" aria-hidden="true">{TOONS[key]}</svg>'
    return ST(n, f'{svg}<div class="bub">{TX(punch)}</div>', cls='toon') if n else f'<div class="toon">{svg}<div class="bub">{TX(punch)}</div></div>'


# ---------------------------------------------------------------- embedded Excel
_REF = re.compile(r'\$?([A-Z])\$?(\d+)')


def xl_eval(data, sol):
    """Evaluate the solution in Python: used in the PDF, and as an independent check of each exercise."""
    def val(a, seen=()):
        raw = sol.get(a, data.get(a))
        if raw is None: return 0
        raw = str(raw)
        if raw.startswith('='):
            e = raw[1:].replace('^', '**').replace('MAX', 'max').replace('MIN', 'min').replace('ABS', 'abs')
            e = _REF.sub(lambda m: f'({val(m.group(1) + m.group(2))})', e)
            return eval(e)
        try: return float(raw.replace('%', '')) / (100 if '%' in raw else 1)
        except ValueError: return raw
    return {a: val(a) for a in sol}


def _fmtv(v):
    if isinstance(v, str): return v
    v = round(v, 4)
    return f'$-{abs(v):,g}$'.replace('e+', 'e') if v < 0 else f'{v:,.10g}'


def XLS(sid, title, h, task, data, sol, widths, head, rows=None, cols=None, hints=None, remind=None, partial=None, chart=None, values=False, show=None, done='', extra=''):
    """A question with an embedded sheet. data: given cells; sol: target cell -> formula; chart: drawn from the student's cells."""
    vals = xl_eval(data, sol)
    targets = list(sol)
    rs = rows or max(int(re.sub('[A-Z]', '', a)) for a in list(data) + targets)
    cs = cols or max(ord(a[0]) - 64 for a in list(data) + targets)
    if MODE == 'pdf':
        L = [chr(65 + i) for i in range(cs)]
        t = ''
        for r in range(1, rs + 1):
            cells = []
            for c in L:
                a = f'{c}{r}'
                x = vals[a] if a in vals else data.get(a, '')
                cells.append(_fmtv(x) if a in vals or isinstance(x, (int, float)) else str(x))
            if any(cells):
                tag = 'th' if r in head else 'td'
                t += '<tr>' + ''.join(f'<{tag}>{TX(x)}</{tag}>' for x in cells) + '</tr>'
        f1 = next(iter(sol.values()))
        fm = f'<p>נוסחה לדוגמה בתא {next(iter(sol))}: ' + XL(f1.replace('$', '¤')) + '</p>'
        S(sid, title, h, f'<p class="qstem">{TX(task)}</p><table class="tbl2">{t}</table>{fm}')
        return
    NACT[0] += 1
    cfgd = dict(rows=rs, cols=cs, widths=widths, data={k: str(v) for k, v in data.items()}, targets=targets, solution=sol, headRows=head, inputs=[], hints=[TX(x) for x in (hints or ['קראו שוב את כותרת העמודה, וכתבו את החישוב במילים לפני הנוסחה.'])], remind=TX(remind or ''), partial=partial or targets[:1], values=values, done=TX(done))
    if not remind: cfgd.pop('remind')
    # rates and prices with a fraction show two decimals, as they are written in the question (3.60, not 3.6)
    cfgd['fmt'] = {k: 'num2' for k, v in data.items() if isinstance(v, float) and not v.is_integer() and abs(v) < 1000}
    side = ''
    if chart:
        cfgd['chart'] = chart
        side = f'<svg class="xlc" viewBox="0 0 {chart.get("W", 470)} {chart.get("H", 330)}" role="img" aria-label="תרשים"></svg>'
    body = f'<div class="act xlq" id="{sid}-x" data-cfg="{_cfg(cfgd)}"><div class="tasktxt">{TX(task)}</div><div class="xlrow{"" if chart else " solo"}"><div class="sheet"></div><div class="xlside">{side}</div></div>{extra}</div>'
    S(sid, title, h, body, kick=f'חלק {CUR[0]} · אקסל בתוך השקף')


def PCH(x, series, xt=None, yt=None, x0=None, x1=None, y0=-40, y1=40, xl='מחיר בפקיעה ($S_{T}$)'.replace('$', '').replace('_{T}', '_T'), yl='ש״ח'):
    xs0 = x0 if x0 is not None else x[0]
    return dict(x=x, x0=xs0, x1=x1, y0=y0, y1=y1, xt=xt, yt=yt, xl=xl, yl=yl, series=series)


def SOLVE(sid, title, h, story, parts, hints, remind, steps):
    """A math exercise: parts (label, answer, tolerance). Buttons give a hint, a reminder, a partial or a full solution."""
    if MODE == 'pdf':
        p = ''.join(f'<li>{TX(l)} <b>{_fmtv(float(a)) if not isinstance(a, str) else a}</b></li>' for l, a, t in parts)
        S(sid, title, h, f'<p class="qstem">{TX(story)}</p><ol>{p}</ol>' + ''.join(f'<p>{TX(x)}</p>' for x in steps))
        return
    NACT[0] += 1
    ps = ''.join(f'<label class="svp" data-a="{a}" data-tol="{t}"><span>{TX(l)}</span><input dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false"></label>' for l, a, t in parts)
    ss = ''.join(f'<div class="svs">{TX(x)}</div>' for x in steps)
    cfgd = dict(hints=[TX(x) for x in hints], remind=TX(remind))
    btn = lambda c, t: f'<button class="abtn ghost {c}">{t}</button>'
    S(sid, title, h, f'<div class="act sv" id="{sid}-w" data-cfg="{_cfg(cfgd)}"><div class="tasktxt">{TX(story)}</div><div class="sv-fm"><b>📐 הנוסחאות לתרגיל:</b> {TX(remind)}</div><div class="svps">{ps}</div><div class="actbar">{CHK}{btn("hnt", "💡 רמז")}{btn("rmd", "📐 תזכורת נוסחה")}{btn("prt", "פתרון חלקי")}{btn("ful", "פתרון מלא")}{RST}</div><div class="fbbar">הקלידו את התשובות, ולחצו ״בדיקה״. הפסד כותבים כמספר שלילי.</div><div class="svsol">{ss}</div></div>', kick=f'חלק {CUR[0]} · תרגיל')


def CASE(sid, title, story, qtext, opts, a, why, steps, toon=None):
    """One situation on its own slide: a question, then a multi step explanation revealed by clicks."""
    q = mc(sid + '-q', qtext, opts, a, why, rot=False)
    st = ''.join(ST(i + 1, TX(x), 'p', 'sp') for i, x in enumerate(steps))
    S(sid, title, title, f'<div class="qg"><div class="qr"><div class="card qstem"><p>{TX(story)}</p></div>{q}</div><div class="solw card">{st}</div></div>', kick=f'חלק {CUR[0]} · מקרה', cls='qslide')


def STEPS(chart, items, cls=''):
    """A chart built click by click beside its explanation. items: prose or '=' + math, in click order."""
    return f'<div class="qg"><div class="card chartw">{chart}</div><div class="rl">{items}</div></div>'


def RL(items, start=1):
    out = ''
    for i, x in enumerate(items):
        n = start + i
        if isinstance(x, tuple):
            n, x = x
        out += ST(n, M(x[1:]), cls='eq').replace('class="st eq"', 'class="st eq" dir="ltr"') if x.startswith('=') else ST(n, TX(x), 'p', 'sp')
    return out


exec(R('content_g.py'))
for _f in {1: ['content_b1.py', 'content_b1b.py', 'content_e1.py', 'content_e2.py'], 2: ['content_l2.py', 'content_b2a.py', 'content_b2b.py', 'content_c1.py', 'content_c2.py', 'content_d.py']}[LESSON]:
    exec(R(_f))
