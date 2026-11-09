# Shared by lessons 2 and 3: the whole-slide worked exercise.


def _E_SOLVE(sid, title, h, story, parts, hints, remind, steps, giv):
    """SOLVE, laid out for the whole slide: the givens in a labelled table beside the formulas,
    each sub-question beside its row of the solution. steps: (what we compute, formula, substitution, result).
    The solution rows stay blurred until "פתרון מלא" opens them one by one, so the layout does not jump."""
    L = 'אבגדהו'
    if MODE == 'pdf':
        SOLVE(sid, title, h, story, parts, hints, remind,
              [f'<b>{L[i]}. {w}:</b> {f}. הצבה: ${s}$. תוצאה: {r}.' for i, (w, f, s, r) in enumerate(steps)])
        SL[-1]['body'] = SL[-1]['body'].replace('</p><ol>', '</p>' + TABLE([a for a, b in giv], [[b for a, b in giv]]) + '<ol>', 1)
        return
    NACT[0] += 1
    gv = ('<table class="tbl2 e-giv"><tr>' + ''.join(f'<th>{TX(a)}</th>' for a, b in giv) + '</tr><tr>'
          + ''.join(f'<td>{TX(b)}</td>' for a, b in giv) + '</tr></table>')
    ps = ''.join(f'<label class="svp" data-a="{a}" data-tol="{t}"><span>{TX(l)}</span><input dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="תשובה לסעיף {L[i]}"></label>' for i, (l, a, t) in enumerate(parts))
    ss = ''.join(f'<div class="svs"><b class="e-k">{TX(L[i] + ". " + w)}</b><span class="e-f"><span>{TX(f)}</span><span class="e-s">{TX("$= " + s + "$")}</span></span><b class="e-v">{TX(r)}</b></div>' for i, (w, f, s, r) in enumerate(steps))
    cfgd = dict(hints=[TX(x) for x in hints], remind=TX(remind))
    btn = lambda c, t: f'<button class="abtn ghost {c}">{t}</button>'
    S(sid, title, h,
      f'<div class="act sv e-sv" id="{sid}-w" data-cfg="{_cfg(cfgd)}"><div class="tasktxt">{TX(story)}</div>'
      f'<div class="e-top">{gv}<div class="sv-fm"><b>📐 הנוסחאות לתרגיל:</b> {TX(remind)}</div></div>'
      f'<div class="e-pair"><div class="svps"><div class="e-hd">הסעיפים, והתשובה שלכם</div>{ps}</div>'
      f'<div class="svsol"><div class="e-hd e-sh"><span>מה מחשבים</span><span>נוסחה, ואז הצבה</span><span>תוצאה</span></div>{ss}</div></div>'
      f'<div class="e-foot"><div class="actbar">{CHK}{btn("hnt", "💡 רמז")}{btn("rmd", "📐 תזכורת נוסחה")}{btn("prt", "פתרון חלקי")}{btn("ful", "פתרון מלא")}{RST}</div>'
      f'<div class="fbbar">הקלידו את התשובות, ולחצו ״בדיקה״. הפסד כותבים כמספר שלילי.</div></div></div>',
      kick=f'חלק {CUR[0]} · תרגיל')


