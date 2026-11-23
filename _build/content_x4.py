# Shared by lessons 4 and 5 (the exam-level review): question card + large sheet, the concise slide, the theoretical item, chart steps.
XINFO = True
_col = lambda c, r0, n: [f'{c}{r0 + i}' for i in range(n)]
_REQL = 'אבגדהו'


def QC(tag, story, reqs, opts=None):
    """The question card beside the sheet: the story one sentence per line, the data, and the numbered requirements."""
    st = ''.join(f'<p>{TX(x)}</p>' for x in story)
    tb = ''
    if opts:
        tb = '<table class="xq-t"><tr><th>סוג</th><th>מחיר מימוש</th><th>פרמיה</th></tr>' + ''.join(f'<tr><td dir="ltr">{a}</td><td>{TX(str(b))}</td><td>{TX(str(c))}</td></tr>' for a, b, c in opts) + '</table>'
    rq = ''.join(f'<li data-req="{i + 1}"><b>({i + 1})</b> {TX(x)}</li>' for i, x in enumerate(reqs))
    return f'<b class="xq-tag">{TX(tag)}</b>{st}{tb}<b class="xq-n">נדרש:</b><ul class="xq-r">{rq}</ul>'


def EX(sid, title, h, q, data, sol, widths, head, steps, rows=None, cols=None, demo=False, kick=None, hints=None, remind=None, partial=None, need=None, anim=None, chart_at=None, fmt=None, done=''):
    """An exam-style question: the card, and a sheet that takes most of the slide.
    steps: (cells, text, [(cell, meaning)], extra). extra: req (requirement to light), formula (text typed into cells), ch (a chart step).
    demo: the deck's clicks drive the steps, one click one step, with a floating bubble."""
    vals = xl_eval(data, sol)
    targets = list(sol)
    cells = list(data) + targets
    rs = rows or max(int(re.sub('[A-Z]', '', a)) for a in cells)
    cs = cols or max(ord(a[0]) - 64 for a in cells)
    if MODE == 'pdf':
        L = [chr(65 + i) for i in range(cs)]
        t = ''
        typed = {}
        for st in steps:
            if len(st) > 3: typed.update(st[3].get('formula') or {})
        for r in range(1, rs + 1):
            row = []
            for c in L:
                a = f'{c}{r}'
                x = vals[a] if a in vals else data.get(a, typed.get(a, ''))
                if isinstance(x, str) and x.startswith('='): x = xl_eval(data, {a: x})[a]
                row.append(_fmtv(x) if isinstance(x, (int, float)) else str(x))
            if any(row):
                tag = 'th' if r in head else 'td'
                t += '<tr>' + ''.join(f'<{tag}>{TX(x)}</{tag}>' for x in row) + '</tr>'
        sx = ''.join(f'<li>{TX(s[1])}</li>' for s in steps)
        S(sid, title, h, f'<div class="qstem">{q}</div><table class="tbl2">{t}</table><p><b>דרך הפתרון:</b></p><ol>{sx}</ol>')
        return
    NACT[0] += 1
    cfgd = dict(rows=rs, cols=cs, widths=widths, data={k: str(v) for k, v in data.items()}, targets=targets, solution=sol, headRows=head, inputs=[],
                hints=[TX(x) for x in (hints or ['כתבו קודם את משוואת הרווח במילים, ורק אחר כך את הנוסחה.'])], partial=partial or targets[:1], values=True, done=TX(done))
    if remind: cfgd['remind'] = TX(remind)
    inf, sts = {}, []
    for st in steps:
        cl = st[0] if isinstance(st[0], list) else [st[0]]
        items = st[2] if len(st) > 2 else []
        ex = dict(st[3]) if len(st) > 3 else {}
        for a, m in items: inf.setdefault(a, TX(m))
        for a in cl:
            if a in sol:
                col, row = a[0], int(a[1:])
                hd = next((data.get(f'{col}{r}') for r in sorted(head, reverse=True) if r < row and isinstance(data.get(f'{col}{r}'), str)), None)
                lab = data.get(f'A{row}') if col == 'B' and isinstance(data.get(f'A{row}'), str) else (hd or 'תא לחישוב')
                inf[a] = dict(w=TX(f'תא צהוב. כאן מחשבים: {lab}.'), h=TX(st[1]))
        if 'formula' in ex:      # text typed by the step, beside any solution formula of the same step
            ex['formula'] = {**{a: sol[a] for a in cl if a in sol}, **ex['formula']}
        sts.append(dict(cells=cl, text=TX(st[1]), items=[[a, TX(m)] for a, m in items], **ex))
    cfgd['info'] = inf
    cfgd['steps'] = sts
    cfgd['fmt'] = {k: 'num2' for k, v in data.items() if isinstance(v, float) and abs(v) < 1000}
    if fmt: cfgd['fmt'].update(fmt)
    if need: cfgd['needChart'] = need
    if anim: cfgd['anim'] = anim
    if chart_at: cfgd['chartAt'] = chart_at
    stubs = ''.join(f'<i class="st dstep" data-n="{(i + 1) * 10}"></i>' for i in range(len(steps))) if demo else ''
    start = '<div class="xe-go">▶ הפתרון נבנה קליק אחר קליק. לחצו ״הבא״.</div>' if demo else ''
    body = (f'<div class="act xlq xe{" dm" if demo else ""}" id="{sid}-x" data-cfg="{_cfg(cfgd)}"{" data-demo" if demo else ""}><div class="xe-q">{q}{start}</div>'
            f'<div class="xlrow solo"><div class="sheet"></div><div class="xlside"></div></div>{stubs}</div>')
    S(sid, title, h, body, kick=kick or f'חלק {CUR[0]} · {"פותרים יחד, קליק אחר קליק" if demo else "נסו לבד, באקסל"}', cls='xes')


def ANIM(data, sol, rg, widths, head, rows, cols, at=None, only=None, marks=None, fmt=None):
    """The table of a question, solved, for the "animation in Excel" screen."""
    v = xl_eval(data, sol)
    d = {}
    for k, x in data.items():
        if isinstance(x, str) and x.startswith('='): x = xl_eval(data, {k: x})[k]
        d[k] = str(x)
    for k, x in v.items(): d[k] = str(round(x, 6)) if isinstance(x, float) else str(x)
    o = dict(rows=rows, cols=cols, widths=widths, data=d, head=head, rg=rg)
    if at: o['at'] = at
    if only: o['only'] = only
    if marks: o['marks'] = marks
    if fmt: o['fmt'] = fmt
    return o


def MINI(sid, n, title, h, flow, forms, tips):
    """Before a question style: the work process as an animated strip, a mini formula sheet, short tips. Three clicks."""
    if MODE == 'pdf':
        S(sid, title, h, '<p><b>תהליך העבודה:</b> ' + ' ← '.join(TX(x) for x in flow) + '</p>' + TABLE(['מה', 'נוסחה'], forms) + '<ul>' + ''.join(f'<li>{TX(t)}</li>' for t in tips) + '</ul>')
        return
    fl = '<div class="wf">' + ''.join(f'<span class="wf-s" style="--i:{i}"><b>{i + 1}</b><em>{TX(x)}</em></span>' for i, x in enumerate(flow)) + '</div>'
    fm = ''.join(f'<div class="mf-r"><span>{TX(l)}</span><em>{TX(f)}</em></div>' for l, f in forms)
    tp = ''.join(f'<li>{TX(t)}</li>' for t in tips)
    S(sid, title, h, ST(1, '<b class="mini-t">תהליך העבודה</b>' + fl, cls='mini-w') + '<div class="mini-g">'
      + ST(2, '<b class="mini-t">📐 מיני דף נוסחאות</b>' + fm, cls='mini-c mf') + ST(3, '<b class="mini-t">💡 שלושה טיפים</b><ul>' + tp + '</ul>', cls='mini-c mt') + '</div>',
      kick=f'חלק {n} · העיקר בשקף אחד', cls='minis')


def THEORY(sid, n, title, h, q, lines, keys, trap, foot=None, meme=None):
    """The theoretical item of the question: the answer in three short lines, what the grader looks for, and the trap."""
    if MODE == 'pdf':
        S(sid, title, h, f'<p class="qstem">{TX(q)}</p><ul>' + ''.join(f'<li><b>{TX(a)}:</b> {TX(b)}</li>' for a, b in lines) + '</ul>' + BAND('trap', trap) + (f'<p>{TX(foot)}</p>' if foot else ''))
        return
    ls = ''.join(ST(i + 1, f'<b>{i + 1}</b><div><strong>{TX(a)}</strong><span>{TX(b)}</span></div>', cls='th-l') for i, (a, b) in enumerate(lines))
    k = len(lines)
    S(sid, title, h, f'<div class="th-q"><b>הסעיף התיאורטי</b>{TX(q)}</div><div class="th-g"><div class="th-a">{ls}</div><div class="th-s">'
      + ST(k + 1, '<b>מה הבודק מחפש</b><div class="th-ch">' + ''.join(f'<span>{TX(x)}</span>' for x in keys) + '</div>', cls='th-k')
      + ST(k + 2, '<b>⚠️ המלכודת</b><span>' + TX(trap) + '</span>', cls='th-k trap') + (MEME(meme[0], meme[1], meme[2], k + 3) if meme else '') + '</div></div>' + (ST(k + 3, TX(foot), cls='th-f') if foot else ''),
      kick=f'חלק {n} · המענה התיאורטי', cls='ths')


CHS = lambda rg: (rg, 'התרשים, צעד 1: מסמנים את הטבלה, כולל שורת הכותרות. ממנה אקסל לוקח את השמות.', [], dict(ch='select', formula={}))
CHR = lambda rg: ([], 'צעד 2: הכרטיסייה ״הוספה״ (Insert), ואז ״תרשימים מומלצים״ (Recommended Charts). אקסל מציע כמה תרשימים. הראשון, עמודות, אינו מה שביקשו.', [], dict(ch='rec', rg=rg))
CHP = lambda rg: ([], 'צעד 3: בוחרים בתרשים קו (Line). בדוגמה רואים את הקו השבור של הרווח. לוחצים ״אישור״.', [], dict(ch='pick', pick='line', rg=rg))
