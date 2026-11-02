# Lesson content, shared by the deck and the summary. Executed with MODE = 'deck' or 'pdf'.
from lib import *
import json, html as _html

COURSE = 'אופציות ומכשירים פיננסיים'
COURSE_FULL = 'אופציות ומכשירים פיננסיים מתוחכמים'
TOTAL_PARTS = 7
SL = []            # every slide, in order
CUR = [None]       # current part number
NACT = [0]


def S(sid, title, h, body, kick=None, cls='', kind='slide'):
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


def mc(qid, q, opts, a, why):
    # options are written with the right answer first; a fixed rotation per question places it
    r = sum(map(ord, qid)) % len(opts)
    opts = opts[r:] + opts[:r]
    a = (a - r) % len(opts)
    o = ''
    for i, t in enumerate(opts):
        mark = ' correct' if MODE == 'pdf' and i == a else ''
        o += f'<button class="o{mark}" data-i="{i}">{"אבגדה"[i]}. {TX(t)}</button>'
    return f'<div class="mc" data-a="{a}" id="{qid}"><div class="q">{TX(q)}</div>{o}<div class="w"><b>הסבר:</b> {TX(why)}</div></div>'


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
        return f'<div class="calcp"><b>בדיקה עצמית.</b> {TX(q)} <b>תשובה:</b> <span class="n">{ans:,}</span> {TX(unit)}. {TX(why)}</div>'
    NACT[0] += 1
    return (f'<div class="act numq" id="{qid}" data-a="{ans}" data-tol="{tol}" data-w="{_html.escape(TX(why), quote=True)}" data-h="{_html.escape(TX(hint), quote=True)}"><div class="q">{TX(q)}</div>'
            f'<div class="numrow"><input dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="תשובה"><span>{TX(unit)}</span>{CHK}</div><div class="fbbar">הקלידו מספר ולחצו ״בדיקה״.</div></div>')


def _txc(s):
    return TX(s)


exec(R('content_b.py'))
exec(R('content_c.py'))
exec(R('content_d.py'))
