# Lesson 4 workbooks, in the format of the exam: one sheet per question, the question at the top, the solution under it.
# Run: python3 build_xlsx4.py
#   exam-review-4.xlsx / exam-review-4-solutions.xlsx      the five questions solved in class (sub-slides merged per question)
#   self-practice-4.xlsx / self-practice-4-solutions.xlsx  the four "try alone" questions and the six self-practice questions
#   exam-review-5, self-practice-5 (and solutions): the same for lesson 5 (content_l5.py, content_l5h.py)
# Every text, number and formula is read from content_l4.py (its EX and THEORY calls), so the workbooks follow the deck.
# Only the layout is defined here: which source cell lands where. Formulas are translated to the new addresses.
# The solutions are recalculated with LibreOffice and checked twice: against a Python evaluation of the source formulas,
# and against a list of key answers typed by hand. A finished file is replaced only when its content changed.
import ast, builtins, math, os, re, shutil, subprocess, sys, tempfile, zipfile
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import LineChart, Reference
from openpyxl.worksheet.properties import PageSetupProperties

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, '..', 'materials')
SOFFICE = shutil.which('soffice') or '/Applications/LibreOffice.app/Contents/MacOS/soffice'
NAVY, YEL, GIV, QBL, SUBF, NOTEF = '1B2D55', 'FFF4C2', 'EEF2FF', 'E6F0FA', 'D9E2F3', 'F3F5F9'
thin = Side(style='thin', color='B8BFCC'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
COLS = 'ABCDEFGHIJKL'; WID = [30, 16, 16, 16, 16, 3, 11, 11, 11, 11, 11, 11]
RH, CH_ROWS = 20, 12          # row height in points; rows kept for a chart
NOTE = 'כל הנתונים בגיליון להמחשה בלבד, ואינם מחירי שוק.'
SUBLINE = 'המסלול האקדמי של המכללה למנהל · ד״ר שי צבאן · סמסטר א׳ תשפ״ז'
FORBID = re.compile('[—–‒―־…]|\\.\\.\\.')
REF = re.compile(r'(\$?)([A-Z])(\$?)(\d+)')
FMT = {'num2': '0.00', 'num1': '0.0', 'com0': '#,##0', 'pct2': '0.00%'}
HOWTO = ('select', 'rec', 'pick', 'selser', 'del')


# ---------------------------------------------------------------- the source: content_l4.py
def load_content():
    """Run content_l4.py with stand-ins for the deck helpers, and keep what EX and THEORY were called with."""
    tree = ast.parse('\n'.join(open(os.path.join(H, f), encoding='utf-8').read() for f in ('content_x4.py', 'content_l4.py', 'content_l5.py', 'content_l5h.py')))
    tree.body = [n for n in tree.body if not (isinstance(n, ast.FunctionDef) and n.name in ('QC', 'EX', 'THEORY', 'ANIM', 'MINI'))]
    exs, ths = {}, {}

    class NS(dict):
        def __missing__(self, k):
            if hasattr(builtins, k): raise KeyError(k)
            return lambda *a, **kw: ''

    def QC(tag, story, reqs, opts=None): return dict(tag=tag, story=list(story), reqs=list(reqs), opts=opts)

    def EX(sid, title, h, q, data, sol, widths, head, steps, **kw):
        st = []
        for s in steps:
            cl = s[0] if isinstance(s[0], list) else [s[0]]
            st.append(dict(cells=list(cl), text=s[1], ex=dict(s[3]) if len(s) > 3 else {}))
        exs[sid] = dict(sid=sid, title=title, q=q, data=dict(data), sol=dict(sol), steps=st, fmt=dict(kw.get('fmt') or {}))

    def THEORY(sid, n, title, h, q, lines, keys, trap, foot=None, meme=None): ths[sid] = dict(q=q, lines=list(lines))

    ns = NS(QC=QC, EX=EX, THEORY=THEORY, TX=lambda x: x, F=lambda x: x, MODE='deck', SL=[], CUR=[0], NACT=[0], re=re,
            ANIM=lambda *a, **k: {}, MINI=lambda *a, **k: None)
    exec(compile(tree, 'content_l4.py', 'exec'), ns)
    return exs, ths, {k: ns[k] for k in ('_NEWS', '_NEWS6')}, {1: 'יישום בסיסי', 2: 'חישובים וחילוצים', 3: 'הכותב'}


def clean(t):
    """Deck text to plain text: no math markers, no HTML. Each calculation is wrapped in a left-to-right embedding (U+202A, U+202C)."""
    t = re.sub(r'\$([^$]*)\$', '\u202a\\1\u202c', str(t).replace('S_{T}', 'St'))   # a calculation reads left to right inside the Hebrew line
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t.replace('$', ''))).strip()


def ev(data, sol):
    """The source formulas, evaluated in Python on the source grid: the expected value of every answer cell."""
    memo = {}

    def val(a):
        if a not in memo:
            raw = sol.get(a, data.get(a))
            if isinstance(raw, str) and raw.startswith('='):
                e = REF.sub(lambda m: f'({val(m.group(2) + m.group(4))!r})', raw[1:]).replace('MAX', 'max').replace('MIN', 'min')
                memo[a] = eval(e, {'max': max, 'min': min, '__builtins__': {}})
            else: memo[a] = 0 if raw is None else raw
        return memo[a]
    return {a: val(a) for a in list(sol) + [k for k, v in data.items() if isinstance(v, str) and v.startswith('=')]}


EXS, THS, NEWS, ROUTE = load_content()
EV = {k: ev(x['data'], x['sol']) for k, x in EXS.items()}
for _x in EXS.values():   # text typed by a step: an answer in words (St ≥ 85) or the equation beside a result
    _x['typed'] = {a: t for s in _x['steps'] for a, t in (s['ex'].get('formula') or {}).items() if not str(t).startswith('=')}


# ---------------------------------------------------------------- the layout: which source cell lands where
def D(ex, rows, extra=(), sub=False): return dict(op='D', ex=ex, rows=list(rows), extra=list(extra), sub=sub)
def SEC(ex): return dict(op='SEC', ex=ex)
def SUB(text): return dict(op='SUB', text=text)
def T(ex, cols, hdr, r0, r1, chart=None, over=None, title=None, more=None): return dict(op='T', ex=ex, cols=cols, hdr=hdr, r0=r0, r1=r1, chart=chart, over=over or {}, title=title, more=more)
def KV(ex, targets, head=None, extra=(), chart=None): return dict(op='KV', ex=ex, targets=list(targets), head=head, extra=list(extra), chart=chart)   # chart: (question of the table, series, title), drawn beside the answers
def TH(tid): return dict(op='TH', tid=tid)
def WA(head, text): return dict(op='WA', head=head, text=text)   # an answer in words that no sheet step holds
def W(ex, req, step=-1): return dict(op='W', ex=ex, req=req, step=step)
def col(c, a, b): return [f'{c}{r}' for r in range(a, b + 1)]
def side(ex, c):   # the answers a question keeps beside its table, in one column: read from the source, top to bottom
    return sorted({a for a in list(EXS[ex]['sol']) + list(EXS[ex]['typed']) if a[0] == c}, key=lambda a: int(a[1:]))


T_TOTAL, T_BOTH = 'הרווח הכולל בפקיעה', 'הקונה והכותב: רווח או הפסד בפקיעה'


def one_option(ex, r1):   # the shape of x1, x3 and hp1: two scenarios, a table with a chart, break-even and an edge, a written item
    return [D(ex, [2, 3]), SUB('סעיף א'), T(ex, 'ABC', 5, 6, 7, over={'A5': 'תרחיש'}), SUB('סעיף ב'), T(ex, 'EF', 5, 6, r1, chart=['F']), KV(ex, ['B10', 'B11'], head='A9'), W(ex, 3)]


CLASS = [
    dict(name='שאלה 1', part=1, exs=['d1a', 'd1b', 'd1c'], theory='t1',
         ops=[D('d1a', [2, 3], extra=[0]), SEC('d1a'), T('d1a', 'ABCD', 5, 6, 7, over={'A5': 'תרחיש'}), SEC('d1b'), T('d1b', 'AB', 5, 6, 14, chart=['B']),
              SEC('d1c'), KV('d1c', col('B', 6, 10)), TH('t1')]),
    dict(name='שאלה 2', part=2, exs=['d2a', 'd2b'],
         ops=[D('d2a', [2, 3], sub=True), D('d2b', [2, 3, 4, 5], sub=True), SEC('d2a'), KV('d2a', ['B6', 'B7'], head='A5'), KV('d2a', col('B', 10, 14), head='A9'),
              SEC('d2b'), KV('d2b', col('B', 8, 12))]),
    dict(name='שאלה 3', part=3, exs=['d3a', 'd3b'], theory='t3',
         ops=[D('d3a', [2, 3]), SEC('d3a'), T('d3a', 'ABC', 5, 6, 14, chart=['B', 'C'], title=T_BOTH), SEC('d3b'), KV('d3b', col('B', 6, 10), head='A5'), TH('t3')]),
]
T_THREE = 'רווח או הפסד למניה: שלוש חלופות'
_A6 = 'קריאה ראשונה: החברה תזכה, והמניה תזנק. קריאה מנוגדת: החברה תפסיד, והמניה תצנח, כמו במכרז הקודם. שתיהן צופות תנועה חדה, וחלוקות רק על הכיוון. מגדרת: קרן הפנסיה, שמחזיקה במניה ומקטינה סיכון קיים. ספקולנטים: מי שמהמרים על הכיוון בלי להחזיק במניה.'
CLASS5 = [
    dict(name='שאלה 1', title='שאלה 1: כמה אופציות יחד, קונים בלבד', exs=['d4a', 'd4b'],
         ops=[D('d4a', [2, 3, 4, 5, 6]), SEC('d4a'), T('d4a', 'ABCD', 8, 9, 16), SEC('d4b'), KV('d4b', side('d4b', 'E'), chart=('d4a', ['D'], T_TOTAL))]),
    dict(name='שאלה 2', title='שאלה 2: קונים וכותבים יחד', exs=['d4c', 'd4d'], theory='t4',
         ops=[D('d4c', [2, 3, 4, 5]), SEC('d4c'), T('d4c', 'ABCD', 7, 8, 14), SEC('d4d'), KV('d4d', side('d4d', 'E'), chart=('d4c', ['D'], T_TOTAL)), TH('t4')]),
    dict(name='שאלה 3', title='שאלה 3: חילוץ על מדד, קונים וכותבים', exs=['d4e'], ops=[D('d4e', [2, 3, 4, 5, 6, 7]), KV('d4e', col('B', 10, 17), head='A9')]),
    dict(name='שאלה 4', title='שאלה 4: נתונים חיים, Call מול Forward', exs=['d5a', 'd5b'], theory='t5', news='_NEWS', alias={('d5b', 'B5'): ('d5a', 'B10')},
         ops=[D('d5a', [2, 3, 4, 5, 6]), D('d5b', [3]), SEC('d5a'), KV('d5a', col('B', 9, 13), extra=[0]), SEC('d5b'), T('d5b', 'ABCD', 7, 8, 10), TH('t5')]),
    dict(name='שאלה 5', title='שאלה 5: אותו Put, שני אנשים', exs=['d5d'],
         ops=[D('d5d', [2, 3, 4, 5, 6, 7]), KV('d5d', ['E2'], head='D1'), T('d5d', 'ABCDE', 9, 10, 14), KV('d5d', ['E3', 'E4'])]),
    dict(name='שאלה 6', title='שאלה 6: שאלה מלאה, מהקטע ועד ההמלצה', exs=['d6a', 'd6b'], theory='t6', news='_NEWS6',
         pre=('סעיף א', 'שתי הקריאות המנוגדות בקטע. מי בקטע מגדר, ומי ספקולנט?'),
         ops=[D('d6a', [2, 3, 4, 5, 6, 7]), dict(op='BAND', text='סעיף א'), WA('שתי הקריאות המנוגדות בקטע, ומי מגדר ומי ספקולנט', _A6),
              SEC('d6a'), KV('d6a', col('B', 10, 14), extra=[0]), SEC('d6b'), T('d6b', 'ABCD', 9, 10, 16, chart=['B', 'C', 'D'], title=T_THREE), KV('d6b', ['E2', 'E3', 'E4', 'E5'], head='D1'), TH('t6')]),
]
SELF = [
    dict(name='נסו לבד 1', exs=['x1'], ops=one_option('x1', 14)),
    dict(name='נסו לבד 2', exs=['x2'], ops=[D('x2', [2, 3, 4, 5]), KV('x2', col('B', 8, 14), head='A7')]),
    dict(name='נסו לבד 3', exs=['x3'], ops=one_option('x3', 14)),
    dict(name='תרגול 1', exs=['hp1'], ops=one_option('hp1', 12)),
    dict(name='תרגול 2', exs=['hp2'], ops=[D('hp2', [2, 3]), KV('hp2', col('B', 6, 11), head='A5')]),
    dict(name='תרגול 3', exs=['hp3'], ops=[D('hp3', [2, 3, 4, 5]), KV('hp3', col('B', 8, 14), head='A7')]),
    dict(name='תרגול 4', exs=['hp4'], ops=[D('hp4', [2, 3]), T('hp4', 'ABC', 5, 6, 13, chart=['B', 'C'], title=T_BOTH, more='רווח מרבי של הכותב: 4'), KV('hp4', side('hp4', 'F'), head='E1'), W('hp4', 3)]),
    dict(name='תרגול 5', exs=['hp7'], ops=[D('hp7', [2, 3]), SUB('סעיף א'), T('hp7', 'ABC', 5, 6, 7, over={'A5': 'תרחיש'}), SUB('סעיף ב'), T('hp7', 'EF', 5, 6, 12, chart=['F']), KV('hp7', ['B10', 'B11', 'B12'], head='A9'), W('hp7', 3)]),
    dict(name='תרגול 6', exs=['hp8'], ops=[D('hp8', [2, 3, 4, 5]), KV('hp8', col('B', 8, 14), head='A7')]),
]
SELF5 = [
    dict(name='נסו לבד 1', exs=['x4'], ops=[D('x4', [2, 3, 4, 5, 6]), T('x4', 'ABCD', 8, 9, 15, chart=['D'], title=T_TOTAL), KV('x4', side('x4', 'E'), head='D1')]),
    dict(name='נסו לבד 2', exs=['x4b'], ops=[D('x4b', [2, 3, 4, 5]), T('x4b', 'ABCD', 7, 8, 14, chart=['D'], title=T_TOTAL), KV('x4b', side('x4b', 'E'), head='D1')]),
    dict(name='נסו לבד 3', exs=['x5'], ops=[D('x5', [2, 3, 4, 5, 6]), KV('x5', side('x5', 'E'), head='D1'), T('x5', 'ABCD', 8, 9, 11), W('x5', 3)]),
    dict(name='תרגול 1', exs=['hp5'], ops=[D('hp5', [2, 3, 4]), T('hp5', 'ABCD', 6, 7, 15, chart=['D'], title=T_TOTAL), KV('hp5', side('hp5', 'E'), head='D1')]),
    dict(name='תרגול 2', exs=['hp9'], ops=[D('hp9', [2, 3, 4, 5, 6]), T('hp9', 'ABCD', 8, 9, 15, chart=['D'], title=T_TOTAL), KV('hp9', side('hp9', 'E'), head='D1')]),
    dict(name='תרגול 3', exs=['hp10'], ops=[D('hp10', [2, 3, 4, 5, 6, 7]), KV('hp10', col('B', 10, 18), head='A9')]),
    dict(name='תרגול 4', exs=['hp6'], ops=[D('hp6', [2, 3, 4, 5, 6, 7, 8]), KV('hp6', ['E2', 'E3', 'E4', 'E5', 'E6'], head='D1'), T('hp6', 'ABCDE', 10, 11, 13), W('hp6', 4)]),
    dict(name='תרגול 5', exs=['hp11'], ops=[D('hp11', [2, 3, 4, 5, 6, 7]), KV('hp11', ['E2', 'E3', 'E4', 'E5'], head='D1'), T('hp11', 'ABCD', 9, 10, 16, chart=['B', 'C', 'D'], title=T_THREE), W('hp11', 4)]),
]
for _s in CLASS: _s['title'] = f"{_s['name']}: {ROUTE[_s['part']]}"
for _s in SELF + SELF5: _s['title'] = EXS[_s['exs'][0]]['title']
BOOKS = [dict(n=4, pr='exam-review-4.xlsx', so='exam-review-4-solutions.xlsx', sheets=CLASS, what=('קובץ השאלות של המפגש', 'פתרונות לשאלות המפגש')),
         dict(n=4, pr='self-practice-4.xlsx', so='self-practice-4-solutions.xlsx', sheets=SELF, what=('קובץ התרגול העצמי', 'פתרונות לתרגול העצמי')),
         dict(n=5, pr='exam-review-5.xlsx', so='exam-review-5-solutions.xlsx', sheets=CLASS5, what=('קובץ השאלות של המפגש', 'פתרונות לשאלות המפגש')),
         dict(n=5, pr='self-practice-5.xlsx', so='self-practice-5-solutions.xlsx', sheets=SELF5, what=('קובץ התרגול העצמי', 'פתרונות לתרגול העצמי'))]

# key answers, typed by hand from the stories: (sheet, source question, source cell) -> value
KEY = {
    ('תרגול 5', 'hp7', 'C6'): -6.5, ('תרגול 5', 'hp7', 'C7'): 3.5, ('תרגול 5', 'hp7', 'B10'): 56.5, ('תרגול 5', 'hp7', 'B11'): 3.5, ('תרגול 5', 'hp7', 'B12'): -56.5, ('תרגול 5', 'hp7', 'F6'): -11.5,
    ('תרגול 6', 'hp8', 'B8'): 3.94, ('תרגול 6', 'hp8', 'B10'): 10800, ('תרגול 6', 'hp8', 'B12'): 0.25, ('תרגול 6', 'hp8', 'B13'): 3.69, ('תרגול 6', 'hp8', 'B14'): -7200,
    ('שאלה 1', 'd1a', 'D6'): 11, ('שאלה 1', 'd1a', 'D7'): -4, ('שאלה 1', 'd1c', 'B6'): 81, ('שאלה 1', 'd1c', 'B7'): -4, ('שאלה 1', 'd1c', 'B10'): 81, ('שאלה 1', 'd1b', 'B6'): 16, ('שאלה 1', 'd1b', 'B14'): -4,
    ('שאלה 2', 'd2a', 'B7'): 5, ('שאלה 2', 'd2a', 'B11'): 75, ('שאלה 2', 'd2a', 'B12'): 63, ('שאלה 2', 'd2a', 'B13'): -3,
    ('שאלה 2', 'd2b', 'B8'): 2470, ('שאלה 2', 'd2b', 'B10'): 150, ('שאלה 2', 'd2b', 'B11'): 2320, ('שאלה 2', 'd2b', 'B12'): -9000,
    ('שאלה 3', 'd3b', 'B6'): 90, ('שאלה 3', 'd3b', 'B7'): 5, ('שאלה 3', 'd3b', 'B9'): -90, ('שאלה 3', 'd3a', 'B7'): 10, ('שאלה 3', 'd3a', 'C7'): -10, ('שאלה 3', 'd3a', 'C12'): 5,
    ('שאלה 1', 'd4a', 'D10'): 31, ('שאלה 1', 'd4a', 'D13'): -9, ('שאלה 1', 'd4a', 'D16'): 16, ('שאלה 1', 'd4a', 'D9'): 51, ('שאלה 1', 'd4b', 'E2'): 85.5, ('שאלה 1', 'd4b', 'E3'): 114, ('שאלה 1', 'd4b', 'E4'): -9,
    ('שאלה 2', 'd4c', 'D8'): -2.5, ('שאלה 2', 'd4c', 'D9'): -2.5, ('שאלה 2', 'd4c', 'D11'): 2.5, ('שאלה 2', 'd4c', 'D14'): 7.5, ('שאלה 2', 'd4c', 'C14'): -9, ('שאלה 2', 'd4c', 'B14'): 16.5,
    ('שאלה 2', 'd4d', 'E2'): 2.5, ('שאלה 2', 'd4d', 'E3'): -2.5, ('שאלה 2', 'd4d', 'E4'): 7.5, ('שאלה 2', 'd4d', 'E5'): 62.5,
    ('שאלה 3', 'd4e', 'B10'): 28, ('שאלה 3', 'd4e', 'B11'): 7000, ('שאלה 3', 'd4e', 'B12'): 2628, ('שאלה 3', 'd4e', 'B13'): 72, ('שאלה 3', 'd4e', 'B14'): 18000, ('שאלה 3', 'd4e', 'B16'): 36, ('שאלה 3', 'd4e', 'B17'): 2664,
    ('שאלה 4', 'd5a', 'B9'): 50, ('שאלה 4', 'd5a', 'B10'): 25000, ('שאלה 4', 'd5a', 'B11'): 3.65, ('שאלה 4', 'd5a', 'B12'): 1825000, ('שאלה 4', 'd5a', 'B13'): 0.05 / 3.60,
    ('שאלה 4', 'd5b', 'B8'): 1700000, ('שאלה 4', 'd5b', 'C8'): 1810000, ('שאלה 4', 'd5b', 'D8'): 1725000, ('שאלה 4', 'd5b', 'B9'): 1800000, ('שאלה 4', 'd5b', 'C9'): 1810000, ('שאלה 4', 'd5b', 'D9'): 1825000,
    ('שאלה 4', 'd5b', 'B10'): 1900000, ('שאלה 4', 'd5b', 'C10'): 1810000, ('שאלה 4', 'd5b', 'D10'): 1825000,
    ('שאלה 5', 'd5d', 'E2'): 8000, ('שאלה 5', 'd5d', 'E3'): 712000, ('שאלה 5', 'd5d', 'E4'): 0.04 / 3.60, ('שאלה 5', 'd5d', 'C10'): 32000, ('שאלה 5', 'd5d', 'D10'): 712000, ('שאלה 5', 'd5d', 'D14'): 752000,
    ('שאלה 5', 'd5d', 'E14'): -8000, ('שאלה 5', 'd5d', 'B10'): 680000, ('שאלה 5', 'd5d', 'C11'): 12000, ('שאלה 5', 'd5d', 'D11'): 712000,
    ('שאלה 6', 'd6a', 'B10'): 2000, ('שאלה 6', 'd6a', 'B11'): 10000, ('שאלה 6', 'd6a', 'B12'): 95, ('שאלה 6', 'd6a', 'B13'): 190000, ('שאלה 6', 'd6a', 'B14'): 0.05,
    ('שאלה 6', 'd6b', 'B10'): -30, ('שאלה 6', 'd6b', 'C10'): -5, ('שאלה 6', 'd6b', 'D10'): -12, ('שאלה 6', 'd6b', 'D13'): -2, ('שאלה 6', 'd6b', 'C16'): 25, ('שאלה 6', 'd6b', 'D16'): 28,
    ('שאלה 6', 'd6b', 'E2'): -5, ('שאלה 6', 'd6b', 'E3'): -12, ('שאלה 6', 'd6b', 'E4'): -5, ('שאלה 6', 'd6b', 'E5'): -2,
    ('נסו לבד 1', 'x1', 'C6'): 9, ('נסו לבד 1', 'x1', 'C7'): -6, ('נסו לבד 1', 'x1', 'B10'): 131, ('נסו לבד 1', 'x1', 'B11'): -6,
    ('נסו לבד 2', 'x2', 'B8'): 3.65, ('נסו לבד 2', 'x2', 'B10'): 5600, ('נסו לבד 2', 'x2', 'B12'): 0.25, ('נסו לבד 2', 'x2', 'B13'): 3.90, ('נסו לבד 2', 'x2', 'B14'): -4000,
    ('נסו לבד 3', 'x3', 'C6'): -7, ('נסו לבד 3', 'x3', 'C7'): 3, ('נסו לבד 3', 'x3', 'B10'): 53, ('נסו לבד 3', 'x3', 'B11'): 3,
    ('נסו לבד 1', 'x4', 'E2'): 87.5, ('נסו לבד 1', 'x4', 'E3'): 113.75, ('נסו לבד 1', 'x4', 'E4'): -7.5, ('נסו לבד 1', 'x4', 'B9'): 21.5,
    ('נסו לבד 2', 'x4b', 'E2'): 3.5, ('נסו לבד 2', 'x4b', 'E3'): -3.5, ('נסו לבד 2', 'x4b', 'E4'): 6.5, ('נסו לבד 2', 'x4b', 'E5'): 76.5, ('נסו לבד 2', 'x4b', 'D8'): 6.5, ('נסו לבד 2', 'x4b', 'D12'): -3.5,
    ('נסו לבד 3', 'x5', 'E2'): 30, ('נסו לבד 3', 'x5', 'E3'): 18000, ('נסו לבד 3', 'x5', 'E4'): 3.94, ('נסו לבד 3', 'x5', 'D9'): 1182000, ('נסו לבד 3', 'x5', 'C9'): 1197000, ('נסו לבד 3', 'x5', 'D11'): 1242000,
    ('נסו לבד 3', 'x5', 'B9'): 1140000, ('נסו לבד 3', 'x5', 'B11'): 1260000,
    ('תרגול 1', 'hp1', 'C6'): 6, ('תרגול 1', 'hp1', 'C7'): -2, ('תרגול 1', 'hp1', 'B10'): 44, ('תרגול 1', 'hp1', 'B11'): -2,
    ('תרגול 2', 'hp2', 'B7'): 5, ('תרגול 2', 'hp2', 'B9'): 56, ('תרגול 2', 'hp2', 'B10'): 66, ('תרגול 2', 'hp2', 'B11'): 66,
    ('תרגול 3', 'hp3', 'B8'): 2425, ('תרגול 3', 'hp3', 'B10'): 7000, ('תרגול 3', 'hp3', 'B12'): 150, ('תרגול 3', 'hp3', 'B13'): 2575, ('תרגול 3', 'hp3', 'B14'): -5000,
    ('תרגול 4', 'hp4', 'F2'): 84, ('תרגול 4', 'hp4', 'F3'): 4, ('תרגול 4', 'hp4', 'B13'): 16, ('תרגול 4', 'hp4', 'C13'): -16,
    ('תרגול 1', 'hp5', 'E2'): 91, ('תרגול 1', 'hp5', 'E3'): 109, ('תרגול 1', 'hp5', 'E4'): -9, ('תרגול 1', 'hp5', 'D7'): 11,
    ('תרגול 2', 'hp9', 'E2'): 1, ('תרגול 2', 'hp9', 'E3'): 41, ('תרגול 2', 'hp9', 'E4'): 4, ('תרגול 2', 'hp9', 'E5'): 49, ('תרגול 2', 'hp9', 'D9'): -1, ('תרגול 2', 'hp9', 'D11'): -1, ('תרגול 2', 'hp9', 'D12'): 4, ('תרגול 2', 'hp9', 'D15'): -11,
    ('תרגול 3', 'hp10', 'B10'): 23, ('תרגול 3', 'hp10', 'B11'): 4600, ('תרגול 3', 'hp10', 'B12'): 2477, ('תרגול 3', 'hp10', 'B13'): 77, ('תרגול 3', 'hp10', 'B14'): 15400, ('תרגול 3', 'hp10', 'B16'): 40, ('תרגול 3', 'hp10', 'B17'): 2437, ('תרגול 3', 'hp10', 'B18'): -4600,
    ('תרגול 4', 'hp6', 'E2'): 40, ('תרגול 4', 'hp6', 'E3'): 28000, ('תרגול 4', 'hp6', 'E4'): 12000, ('תרגול 4', 'hp6', 'E5'): 4.07, ('תרגול 4', 'hp6', 'E6'): 4.13, ('תרגול 4', 'hp6', 'D11'): 1588000, ('תרגול 4', 'hp6', 'E11'): 1572000,
    ('תרגול 4', 'hp6', 'D13'): 1628000, ('תרגול 4', 'hp6', 'E13'): 1652000, ('תרגול 4', 'hp6', 'C11'): 1608000, ('תרגול 4', 'hp6', 'B13'): 1680000,
    ('תרגול 5', 'hp11', 'E2'): 1250, ('תרגול 5', 'hp11', 'E3'): 500, ('תרגול 5', 'hp11', 'E4'): 47.5, ('תרגול 5', 'hp11', 'E5'): 44, ('תרגול 5', 'hp11', 'C10'): -2.5, ('תרגול 5', 'hp11', 'D10'): -6, ('תרגול 5', 'hp11', 'D13'): -1,
    ('תרגול 5', 'hp11', 'C16'): 12.5, ('תרגול 5', 'hp11', 'D16'): 14,
}


# ---------------------------------------------------------------- writing one sheet
def fnt(size=12, bold=False, color=None, italic=False): return Font(name='Arial', size=size, bold=bold, color=color, italic=italic)
def lines_of(text, per): return max(1, math.ceil(len(text) / per))
def decimals(v): return 0 if abs(v - round(v)) < 1e-7 else (1 if abs(v * 10 - round(v * 10)) < 1e-7 else 2)
def numfmt(vals):
    d = max(decimals(v) for v in vals)
    return ('0.0' if d == 1 else '0.00') if d else ('#,##0' if any(abs(v) >= 1000 for v in vals) else None)


class Lay:
    def __init__(self, ws, sp, solved):
        self.ws, self.sp, self.solved, self.r = ws, sp, solved, 1
        self.map, self.alias, self.todo, self.answers, self.tables, self.used = {}, dict(sp.get('alias') or {}), [], [], {}, set()
        self.single = len(sp['exs']) == 1 and not sp.get('theory')
        ws.sheet_view.rightToLeft = True; ws.sheet_view.showGridLines = False
        for c, w in zip(COLS, WID): ws.column_dimensions[c].width = w
        ws.page_setup.orientation = 'landscape'; ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True); ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0

    # ---- small pieces
    def h(self, r=None, pts=RH): self.ws.row_dimensions[r or self.r].height = pts
    def key(self, ex, a):
        k = (ex, a)
        while k in self.alias: k = self.alias[k]
        return k

    def wide(self, text, fill=None, font=None, per=125, c0='A', c1='L', ltr=False, center=False, lh=19, minh=RH, border=False):
        """One text in a merged, wrapped row from c0 to c1."""
        ws, r = self.ws, self.r
        c = ws[f'{c0}{r}']; c.value = text; c.font = font or fnt()
        c.alignment = Alignment(horizontal='center' if center else ('left' if ltr else 'right'), vertical='center', wrap_text=True, readingOrder=1 if ltr else 2)
        if fill:
            for x in COLS[COLS.index(c0):COLS.index(c1) + 1]: ws[f'{x}{r}'].fill = PatternFill('solid', fgColor=fill)
        if border: c.border = BOX
        ws.merge_cells(f'{c0}{r}:{c1}{r}')
        self.h(r, max(minh, lh * lines_of(text or '', per) + 2))
        return c

    def band(self, text): self.wide(text, NAVY, fnt(12, True, 'FFFFFF')); self.r += 1
    def sub(self, text): self.wide(text, SUBF, fnt(12, True, NAVY)); self.r += 1
    def gap(self): self.h(self.r, 10); self.r += 1

    def label(self, a, text):
        c = self.ws[a]; c.value = text; c.font = fnt(12, True); c.alignment = Alignment(horizontal='right', vertical='center', readingOrder=2)

    def head(self, a, text):
        c = self.ws[a]; c.value = text; c.font = fnt(12, True, 'FFFFFF'); c.fill = PatternFill('solid', fgColor=NAVY); c.border = BOX
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True, readingOrder=0 if re.fullmatch(r'[ -~]+', str(text)) else 2)

    def given(self, a, v, fmt=None):
        c = self.ws[a]; c.value = v; c.font = fnt(); c.fill = PatternFill('solid', fgColor=GIV); c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center')
        if fmt: c.number_format = fmt

    def answer(self, a, ex=None, src=None, fmt=None, text=None, kind='f'):
        """A yellow cell. Solutions: the source formula (translated at the end), or the text answer."""
        c = self.ws[a]; c.font = fnt(); c.fill = PatternFill('solid', fgColor=YEL); c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center', readingOrder=1 if text else 0)
        if fmt: c.number_format = fmt
        if src: self.map[(ex, src)] = a
        if text is not None:
            if self.solved: c.value = text
        else:
            self.todo.append(('f', a, ex, EXS[ex]['sol'][src], kind)); self.answers.append((a, ex, src))

    def gfmt(self, ex, a, v):
        f = EXS[ex]['fmt'].get(a)
        if f: return FMT[f]
        if isinstance(v, float) and abs(v) < 1000: return '0.00'
        return '#,##0' if isinstance(v, (int, float)) and abs(v) >= 1000 else None

    def afmt(self, ex, cells):
        f = next((EXS[ex]['fmt'][a] for a in cells if a in EXS[ex]['fmt']), None)
        return FMT[f] if f else numfmt([EV[ex][a] for a in cells])

    def notes(self, items):
        """Solutions only: the short explanation of each step, under the block it explains."""
        if not self.solved: return
        for ex, text, bold in items:
            c = self.wide('', NOTEF, fnt(11, bold, '33415C'), per=135, lh=17)
            self.todo.append(('n', c.coordinate, ex, clean(text), None)); self.h(self.r, max(RH, 17 * lines_of(clean(text), 135) + 3)); self.r += 1

    def steps(self, ex, cells, extra=()):
        out = []
        for i, s in enumerate(EXS[ex]['steps']):
            if (ex, i) in self.used or s['ex'].get('ch') in HOWTO: continue
            if i in extra or (set(s['cells']) & set(cells)): self.used.add((ex, i)); out.append((ex, s['text'], False))
        return out

    # ---- the top of the sheet
    def question(self):
        sp = self.sp; P = lambda t, bold=False: (self.wide(clean(t), QBL, fnt(12, bold, NAVY if bold else None), per=120), setattr(self, 'r', self.r + 1))
        self.band('השאלה')
        if sp.get('news'): P('קטע עיתונות (פיקטיבי)', True); P(NEWS[sp['news']])
        seen = []
        for i, ex in enumerate(sp['exs']):
            q = EXS[ex]['q']; new = [x for x in q['story'] if x not in seen]; seen += new
            if i == 0:
                for x in new: P(x)
                self.opts(q)
                P('נדרש:', True)
                if sp.get('pre'): P(sp['pre'][0], True); P(f'(1) {sp["pre"][1]}')
            if not self.single: P(q['tag'].split(' · ')[-1], True)
            if i:
                for x in new: P(x)
                self.opts(q)
            for n, x in enumerate(q['reqs']): P(f'({n + 1}) {x}')
        if sp.get('theory'): P('הסעיף התיאורטי', True); P(THS[sp['theory']]['q'])

    def opts(self, q):
        if not q['opts'] or getattr(self, '_opts', False): return
        self._opts = True; ws = self.ws
        for row in [('סוג', 'מחיר מימוש', 'פרמיה')] + [tuple(o) for o in q['opts']]:
            for x in COLS: ws[f'{x}{self.r}'].fill = PatternFill('solid', fgColor=QBL)
            for x, v in zip('ABC', row):
                c = ws[f'{x}{self.r}']; c.value = v; c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center'); c.font = fnt(12, row[0] == 'סוג')
                c.fill = PatternFill('solid', fgColor=SUBF if row[0] == 'סוג' else 'FFFFFF')
            self.h(); self.r += 1

    def prepare(self):
        """Before writing: which given numbers of the answer area move to the data block, and which data cells repeat an earlier one."""
        ops = self.sp['ops']; self.moved = {}
        for o in ops:
            if o['op'] == 'W':
                x = EXS[o['ex']]; o['i'] = len(x['steps']) + o['step'] if o['step'] < 0 else o['step']; self.used.add((o['ex'], o['i']))
            if o['op'] == 'KV':
                x = EXS[o['ex']]
                self.moved.setdefault(o['ex'], []).extend(a for a in o['targets'] if a not in x['sol'] and a not in x['typed'] and isinstance(x['data'].get(a), (int, float)))
        seen = {}
        for o in ops:
            if o['op'] == 'D':
                d = EXS[o['ex']]['data']
                for r in o['rows']: seen.setdefault((d[f'A{r}'], d[f'B{r}']), (o['ex'], f'B{r}'))
        for ex in self.sp['exs']:
            d = EXS[ex]['data']
            for a, v in d.items():
                if a[0] == 'B' and isinstance(v, (int, float)) and isinstance(d.get('A' + a[1:]), str):
                    k = seen.get((d['A' + a[1:]], v))
                    if k and k != (ex, a) and (ex, a) not in self.alias: self.alias[(ex, a)] = k

    def data_block(self):
        self.band('נתונים')
        for o in (o for o in self.sp['ops'] if o['op'] == 'D'):
            ex = o['ex']; d = EXS[ex]['data']
            if o['sub']: self.label(f'A{self.r}', EXS[ex]['q']['tag'].split(' · ')[-1].split(' (')[0]); self.ws[f'A{self.r}'].font = fnt(12, True, NAVY); self.h(); self.r += 1
            rows = [(d[f'A{r}'], f'B{r}') for r in o['rows']] + [(re.sub(r'^\(\d+\)\s*', '', d[chr(ord(a[0]) - 1) + a[1:]]), a) for a in self.moved.get(ex, [])]
            for lab, a in rows:
                self.label(f'A{self.r}', lab); self.given(f'B{self.r}', d[a], self.gfmt(ex, a, d[a])); self.map[(ex, a)] = f'B{self.r}'; self.h(); self.r += 1
            self.notes(self.steps(ex, [], o['extra']))

    # ---- the answer area
    def table(self, o):
        ex, ws = o['ex'], self.ws; x = EXS[ex]; d, sol = x['data'], x['sol']; top = self.r; dst = {c: COLS[i] for i, c in enumerate(o['cols'])}
        for c in o['cols']: self.head(f'{dst[c]}{top}', o['over'].get(f'{c}{o["hdr"]}', d.get(f'{c}{o["hdr"]}', '')))
        self.h(top, 24)
        for c in o['cols']:
            cells = [f'{c}{r}' for r in range(o['r0'], o['r1'] + 1)]; af = self.afmt(ex, cells) if cells[0] in sol else None
            for i, a in enumerate(cells):
                t = f'{dst[c]}{top + 1 + i}'
                if a in sol: self.answer(t, ex, a, af, kind='drag')
                else: self.given(t, d.get(a), self.gfmt(ex, a, d.get(a))); self.map[(ex, a)] = t
        n = o['r1'] - o['r0'] + 1
        for i in range(n): self.h(top + 1 + i)
        self.tables[ex] = dict(top=top, n=n, dst=dst, cols=o['cols'])
        self.r = top + n + 1
        allc = [f'{c}{r}' for c in o['cols'] for r in range(o['r0'], o['r1'] + 1)]
        ns = self.steps(ex, allc)
        if o['chart']:
            self.chart(ex, o['chart'], f'G{top}', 'G', 'L', top, o['title'], 12.4)
            self.r = max(self.r, top + CH_ROWS)
            ns = self.chart_notes(ex, o.get('more')) + ns
        self.notes(ns); self.gap()

    def chart_notes(self, ex, more=None):
        x = EXS[ex]; marks = next((s['ex']['marks'] for s in x['steps'] if s['ex'].get('marks')), [])
        ts = [m['t'] for m in marks] + ([more] if more else [])
        out = [(ex, 'בתרשים: ' + '. '.join(ts) + '.', True)] if ts else []
        for i, s in enumerate(x['steps']):
            if s['ex'].get('ch') == 'insert' and (ex, i) not in self.used: self.used.add((ex, i)); out.append((ex, s['text'], False))
        return out

    def chart(self, ex, series, anchor, c0, c1, top, title, width):
        """Practice: a framed empty area. Solutions: a native line chart, the St column as categories."""
        ws, tb = self.ws, self.tables[ex]
        for i in range(CH_ROWS): self.h(top + i, max(RH, ws.row_dimensions[top + i].height or RH))
        if not self.solved:
            c = ws[f'{c0}{top}']; c.value = 'מקום לתרשים'; c.font = fnt(12, False, '8A93A6'); c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center', readingOrder=2)
            ws.merge_cells(f'{c0}{top}:{c1}{top + CH_ROWS - 1}'); return
        ch = LineChart(); ch.title = title or 'רווח או הפסד בפקיעה'; ch.style = 12; ch.width = width
        ch.height = sum(ws.row_dimensions[top + i].height for i in range(CH_ROWS)) * 2.54 / 72 - 0.3
        ch.x_axis.title = 'המחיר בפקיעה (St)'; ch.y_axis.title = 'רווח או הפסד (P&L)'; ch.x_axis.delete = False; ch.y_axis.delete = False; ch.x_axis.tickLblPos = 'low'
        for c in series:
            ci = COLS.index(tb['dst'][c]) + 1
            ch.add_data(Reference(ws, min_col=ci, min_row=tb['top'], max_row=tb['top'] + tb['n']), titles_from_data=True)
        ch.set_categories(Reference(ws, min_col=COLS.index(tb['dst'][tb['cols'][0]]) + 1, min_row=tb['top'] + 1, max_row=tb['top'] + tb['n']))
        for s in ch.series: s.marker.symbol = 'circle'; s.marker.size = 5; s.smooth = False
        if len(series) == 1: ch.legend = None
        else: ch.legend.position = 'b'
        ws.add_chart(ch, anchor)

    def kv(self, o):
        ex, ws = o['ex'], self.ws; x = EXS[ex]; d, sol, typed = x['data'], x['sol'], x['typed']; top = self.r
        nxt = lambda a: chr(ord(a[0]) + 1) + a[1:]; prv = lambda a: chr(ord(a[0]) - 1) + a[1:]
        eqs = {a: typed[nxt(a)] for a in o['targets'] if nxt(a) in typed}
        head = d.get(o['head']) if o['head'] else None
        if (head and head != 'פתרון') or eqs:
            for cc in COLS: ws[f'{cc}{self.r}'].fill = PatternFill('solid', fgColor=SUBF)
            if head and head != 'פתרון': self.label(f'A{self.r}', head); ws[f'A{self.r}'].font = fnt(12, True, NAVY)
            if eqs: self.wide('המשוואה', SUBF, fnt(12, True, NAVY), c0='C', c1='E', center=True)
            self.h(); self.r += 1
        carry = ''
        for a in o['targets']:
            lab = d.get(prv(a), '')
            if a in self.moved.get(ex, []):   # the number itself is in the data block; its row number passes to the next row
                m = re.match(r'\(\d+\)\s*', lab); carry = m.group(0) if m else ''; continue
            if carry and not lab.startswith('('): lab = carry + lab
            carry = ''
            self.label(f'A{self.r}', lab); t = f'B{self.r}'
            if a in sol: self.answer(t, ex, a, self.afmt(ex, [a]), kind='one')
            else: self.answer(t, ex, None, text=typed.get(a, ''))
            if a in eqs:
                self.wide(eqs[a] if self.solved else None, YEL, fnt(), c0='C', c1='E', ltr=True, center=True, border=True)
            self.h(); self.r += 1
        ns = self.steps(ex, o['targets'] + [nxt(a) for a in o['targets']], o['extra'])
        if o['chart']:
            self.chart(o['chart'][0], o['chart'][1], f'G{top}', 'G', 'L', top, o['chart'][2], 12.4)
            self.r = max(self.r, top + CH_ROWS); ns = self.chart_notes(ex) + ns
        self.notes(ns); self.gap()

    def written(self, head, texts, rows=1, minh=60):
        """An answer in words: yellow, merged and wrapped. Solutions hold the model answer."""
        self.sub(head)
        for i in range(rows):
            t = clean(texts[i]) if self.solved else None
            self.wide(t, YEL, fnt(), per=120, border=True)
            self.h(self.r, max(minh, 19 * lines_of(t or '', 120) + 6)); self.r += 1
        self.gap()

    def run(self):
        sp, ws = self.sp, self.ws
        self.wide(sp['title'], None, fnt(15, True, NAVY), minh=26); self.r = 3
        self.prepare(); self.question(); self.gap(); self.data_block(); self.gap()
        if self.single: self.band('פתרון')
        for o in sp['ops']:
            k = o['op']
            if k == 'SEC': self.band(EXS[o['ex']]['q']['tag'].split(' · ')[-1])
            elif k == 'SUB': self.sub(o['text'])
            elif k == 'T': self.table(o)
            elif k == 'KV': self.kv(o)
            elif k == 'BAND': self.band(o['text'])
            elif k == 'WA': self.written(o['head'], [o['text']])
            elif k == 'TH':
                self.band('הסעיף התיאורטי'); th = THS[o['tid']]
                self.written(th['q'], [f'{a}: {b}' for a, b in th['lines']], rows=len(th['lines']), minh=30)
            elif k == 'W':
                x = EXS[o['ex']]
                self.written(x['q']['reqs'][o['req']], [re.sub(r'^(ובעל פה|בכתב)[:.]\s*', '', clean(x['steps'][o['i']]['text']))])
        for kind, a, ex, text, how in self.todo:   # every source address now has a place: translate formulas and notes
            if kind == 'f':
                f = REF.sub(lambda m: self.trf(ex, m), text)
                assert not re.search(r'\$[A-Z]', f) and (how == 'drag' or '$' not in f), ('anchoring', sp['name'], a, f)
                if self.solved: ws[a].value = f
            else:
                ws[a].value = re.sub(r'(?<![A-Za-z0-9$])([A-Z])(\$?)(\d+)(?![A-Za-z0-9])', lambda m: self.trn(ex, m), text)
        return self

    def trf(self, ex, m):   # a reference inside a formula: new address, the same locks
        d1, c, d2, row = m.groups(); k = self.key(ex, c + row)
        if k not in self.map: raise KeyError((self.sp['name'], ex, c + row))
        t = self.map[k]; return f'{d1}{t[0]}{d2}{t[1:]}'

    def trn(self, ex, m):   # an address named inside an explanation
        c, d2, row = m.groups(); k = self.key(ex, c + row)
        if k not in self.map: return m.group(0)
        t = self.map[k]; return f'{t[0]}{d2}{t[1:]}'


def first_sheet(wb, book, solved):
    w = wb.active; w.title = 'הנחיות'; w.sheet_view.rightToLeft = True; w.sheet_view.showGridLines = False; w.column_dimensions['A'].width = 135
    w.page_setup.orientation = 'landscape'; w.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True); w.page_setup.fitToWidth = 1; w.page_setup.fitToHeight = 0
    body = ['גיליון לכל שאלה. השאלה בראש הגיליון, והפתרון מתחתיה, באותו גיליון, כמו בבחינה.',
            'פותרים בתאים הצהובים. התאים הכחולים הם נתונים, ואין לשנות אותם.',
            'פתרון מלא: משוואה או נוסחה, טבלה עם כותרות לטורים, ותרשים קו עם צירים מסומנים.',
            'נוסחה מפנה אל תאי הנתונים, ולא אל מספרים. בכל טור כותבים נוסחה אחת בשורה הראשונה, וגוררים אותה למטה.',
            'מקבעים רק את מה שהגרירה מזיזה. בגרירה למטה מקבעים את השורה בלבד, לדוגמה B$2.',
            'תרשים: מסמנים את הטבלה, כולל שורת הכותרות. אחר כך: הוספה (Insert), תרשימים מומלצים (Recommended Charts), קו (Line).',
            'קו עודף בתרשים: לוחצים עליו פעם אחת, ומקישים Delete.']
    body += (['בקובץ הזה: הנוסחאות בתאים הצהובים, התרשימים, והסבר קצר לכל שלב.', 'השוו לקובץ שלכם רק אחרי שפתרתם, נוסחה מול נוסחה (Ctrl+`).'] if solved
             else ['משווים לקובץ הפתרונות רק אחרי שסיימתם את כל השאלה.'])
    lines = [f'אופציות ומכשירים פיננסיים, מפגש {book["n"]}, חזרה ברמת בחינה: ' + book['what'][solved], SUBLINE, ''] + body + [NOTE, '', 'השאלות:'] + [s['title'] if s['title'].startswith(s['name']) else f"{s['name']}: {s['title'].split(': ', 1)[-1]}" for s in book['sheets']]
    for i, t in enumerate(lines, 1):
        c = w.cell(i, 1, t); c.alignment = Alignment(horizontal='right', vertical='center', wrap_text=True, readingOrder=2)
        c.font = fnt(16 if i == 1 else 12, i == 1 or t == 'השאלות:', NAVY if i == 1 or t == 'השאלות:' else '16213A'); w.row_dimensions[i].height = 30 if i == 1 else RH * lines_of(t, 115)


def build(path, book, solved):
    wb = Workbook(); first_sheet(wb, book, solved); lays = []
    for sp in book['sheets']: lays.append(Lay(wb.create_sheet(sp['name']), sp, solved).run())
    wb.calculation.fullCalcOnLoad = True
    wb.save(path)
    return lays


# ---------------------------------------------------------------- checks, and shipping
def lint(path):
    bad = []
    for ws in load_workbook(path):
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and not c.value.startswith('=') and (FORBID.search(c.value) or '$' in c.value.replace('B$2', '') or '<' in c.value and '>' in c.value):
                    bad.append((ws.title, c.coordinate, c.value[:50]))
    return bad


def content(path):   # what a reader sees and what Excel computes: used to leave an unchanged file untouched
    wb = load_workbook(path); out = []
    for ws in wb:
        out.append((ws.title, ws.sheet_view.rightToLeft, len(ws._charts), sorted((k, v.width) for k, v in ws.column_dimensions.items()), sorted(str(m) for m in ws.merged_cells.ranges)))
        for row in ws.iter_rows():
            for c in row:
                if c.value is not None or c.fill.fgColor.rgb not in (None, '00000000'):
                    out.append((ws.title, c.coordinate, c.value, c.number_format, c.fill.fgColor.rgb, c.font.b, c.font.sz, c.alignment.horizontal, c.alignment.readingOrder, ws.row_dimensions[c.row].height))
    return out


def ship(new, dst):
    if os.path.exists(dst) and content(new) == content(dst): return 'unchanged, kept'
    shutil.copy(new, dst); return 'written'


def main():
    verbose = '-q' not in sys.argv
    os.makedirs(OUT, exist_ok=True)
    d = tempfile.mkdtemp(dir=os.environ.get('TMPDIR'))
    try:
        for book in BOOKS:
            os.makedirs(os.path.join(d, 'raw'), exist_ok=True)
            npr = os.path.join(d, 'raw', book['pr']); build(npr, book, False)
            raw = os.path.join(d, 'raw', book['so']); lays = build(raw, book, True)
            for p in (npr, raw):
                bad = lint(p); assert not bad, bad
            subprocess.run([SOFFICE, '--headless', f'-env:UserInstallation=file://{d}/lo', '--convert-to', 'xlsx:Calc MS Excel 2007 XML', '--outdir', d, raw], capture_output=True, timeout=240)
            rec = os.path.join(d, book['so'])
            V = load_workbook(rec, data_only=True); FM = load_workbook(rec); P = load_workbook(npr)
            nform = nkey = 0; names = [s['name'] for s in book['sheets']]
            assert FM.sheetnames == ['הנחיות'] + names == P.sheetnames, FM.sheetnames
            for lay in lays:
                nm = lay.sp['name']
                for a, ex, src in lay.answers:   # every formula: LibreOffice against the source formula evaluated in Python
                    v, e = V[nm][a].value, EV[ex][src]; nform += 1
                    assert str(FM[nm][a].value).startswith('='), (nm, a, 'lost formula')
                    assert isinstance(v, (int, float)) and abs(v - e) < 1e-6, (nm, a, ex, src, v, e)
                    assert P[nm][a].value is None, (nm, a, 'answer leaked into the questions file')
                    if (nm, ex, src) in KEY:
                        k = KEY[(nm, ex, src)]; nkey += 1; ok = abs(v - k) < 1e-6
                        if verbose: print(f'   {nm:<10} {ex:<4} {src:<4} -> {a:<5} key {k!s:<10} LibreOffice {round(v, 6)!s:<12} {"OK" if ok else "FAIL"}')
                        assert ok, (nm, ex, src, v, k)
                leftover = [(ex, i, s['text'][:40]) for ex in lay.sp['exs'] for i, s in enumerate(EXS[ex]['steps']) if (ex, i) not in lay.used and s['ex'].get('ch') not in HOWTO + ('mark',)]
                if leftover and verbose: print('   step texts not used in', nm, leftover)
            missing = [k for k in KEY if any(sh['name'] == k[0] and k[1] in sh['exs'] for sh in book['sheets']) and not any(l.sp['name'] == k[0] and (k[1], k[2]) in [(e, s) for _, e, s in l.answers] for l in lays)]
            assert not missing, missing
            want = [sum(1 for o in s['ops'] if o['op'] in ('T', 'KV') and o['chart']) for s in book['sheets']]
            got = [len(FM[n]._charts) for n in names]
            z = zipfile.ZipFile(rec); cx = [n for n in z.namelist() if re.fullmatch(r'xl/charts/chart\d+\.xml', n)]
            lines_only = all(b'lineChart' in z.read(n) and b'barChart' not in z.read(n) for n in cx)
            assert got == want and len(cx) == sum(want) and lines_only, (got, want, len(cx), lines_only)
            assert all(FM[n].sheet_view.rightToLeft for n in FM.sheetnames) and all(P[n].sheet_view.rightToLeft for n in P.sheetnames)
            assert not any(P[n]._charts for n in names)
            leak = [(ws.title, c.coordinate) for ws in P for row in ws.iter_rows() for c in row if isinstance(c.value, str) and c.value.startswith('=')]
            assert not leak, leak
            print(book['so'], '| sheets', FM.sheetnames, '| formulas checked', nform, '| key answers', nkey, '| charts per sheet', got, '| rtl True | line charts only', lines_only)
            print('  ', book['pr'], ship(npr, os.path.join(OUT, book['pr'])), '|', book['so'], ship(rec, os.path.join(OUT, book['so'])))
        assert all(any(k[0] == s['name'] and k[1] in s['exs'] for b in BOOKS for s in b['sheets']) for k in KEY)
    finally:
        shutil.rmtree(d, True)


if __name__ == '__main__':
    main()
