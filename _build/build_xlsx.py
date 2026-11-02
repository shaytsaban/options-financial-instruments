# Practice workbook and separate solutions workbook, from one spec. Run: python3 build_xlsx.py
# practice: yellow cells are empty. solutions: the same cells hold live formulas, recalculated and checked with LibreOffice.
import os, shutil, subprocess, sys, tempfile
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import ScatterChart, Reference, Series
H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, '..', 'materials')
NAVY, YEL, GRN, GIV = '1B2D55', 'FFF4C2', 'DDF5E6', 'EEF2FF'
thin = Side(style='thin', color='D9D2C3'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
NOTE = 'כל הנתונים בגיליון להמחשה בלבד, ואינם מחירי שוק.'
SHEETS = []


def sheet(name, title, task, cells, widths, chart=None):
    """cells: (addr, value, kind, fmt). kind: h header, l label, g given, a answer (formula), t text."""
    SHEETS.append(dict(name=name, title=title, task=task, cells=cells, widths=widths, chart=chart))


def rows(col_start, row0, vals):
    return [(f'{col_start}{row0 + i}', v) for i, v in enumerate(vals)]


# 1 exposure
c = [('A5', 'תשלום לספק (דולר)', 'l'), ('B5', 500000, 'g', '#,##0'), ('A6', 'הכנסות (ש״ח)', 'l'), ('B6', 1950000, 'g', '#,##0'), ('A7', 'שער בתקציב', 'l'), ('B7', 3.5, 'g', '0.00'),
     ('A9', 'שער בפועל', 'h'), ('B9', 'עלות (ש״ח)', 'h'), ('C9', 'רווח (ש״ח)', 'h'), ('D9', 'שינוי בשער', 'h'), ('E9', 'שינוי ברווח', 'h')]
for i, r in enumerate([3.2, 3.35, 3.5, 3.65, 3.8, 3.9]):
    n = 10 + i
    c += [(f'A{n}', r, 'g', '0.00'), (f'B{n}', f'=$B$5*A{n}', 'a', '#,##0'), (f'C{n}', f'=$B$6-B{n}', 'a', '#,##0'), (f'D{n}', f'=A{n}/$B$7-1', 'a', '0.0%'), (f'E{n}', f'=C{n}/($B$6-$B$5*$B$7)-1', 'a', '0.0%')]
sheet('1 חשיפה', 'חשיפה: כמה רווח תלוי בשער אחד', 'השלימו את הטבלה. השוו בין השינוי בשער לבין השינוי ברווח.', c, [24, 16, 16, 14, 14])
# 2 forward
c = [('A5', 'תשלום (דולר)', 'l'), ('B5', 800000, 'g', '#,##0'), ('A6', 'שער חוזה האקדמה', 'l'), ('B6', 3.45, 'g', '0.00'),
     ('A8', 'שער בפקיעה', 'h'), ('B8', 'עלות ללא גידור', 'h'), ('C8', 'תוצאת החוזה', 'h'), ('D8', 'עלות נטו', 'h')]
for i, r in enumerate([3.1, 3.3, 3.45, 3.6, 3.8]):
    n = 9 + i
    c += [(f'A{n}', r, 'g', '0.00'), (f'B{n}', f'=$B$5*A{n}', 'a', '#,##0'), (f'C{n}', f'=$B$5*(A{n}-$B$6)', 'a', '#,##0'), (f'D{n}', f'=B{n}-C{n}', 'a', '#,##0')]
sheet('2 חוזה אקדמה', 'יבואן: Long בחוזה אקדמה', 'חשבו עלות, תוצאת חוזה ועלות נטו. מה אתם מצפים לראות בעמודה D?', c, [22, 18, 16, 16])
# 3 long call
c = [('A5', 'מחיר מימוש, K', 'l'), ('B5', 105, 'g'), ('A6', 'פרמיה', 'l'), ('B6', 4, 'g'), ('A8', 'מחיר בפקיעה', 'h'), ('B8', 'תזרים', 'h'), ('C8', 'רווח או הפסד', 'h')]
for i, s in enumerate(range(85, 130, 5)):
    n = 9 + i
    c += [(f'A{n}', s, 'g'), (f'B{n}', f'=MAX(A{n}-$B$5,0)', 'a'), (f'C{n}', f'=B{n}-$B$6', 'a')]
c += [('E5', 'נקודת איזון', 'l'), ('F5', '=B5+B6', 'a'), ('E6', 'הפסד מרבי', 'l'), ('F6', '=-B6', 'a')]
sheet('3 Long Call', 'Long Call: טבלה ותרשים', 'השלימו טבלה ונקודת איזון. בנו תרשים פיזור עם קווים: מחיר בפקיעה מול רווח או הפסד.', c, [20, 12, 16, 3, 16, 12], chart=('A', 'C', 9, 17))
# 4 put, solving
c = [('A5', 'מחיר מימוש, K', 'l'), ('B5', 70, 'g'), ('A6', 'פרמיה', 'l'), ('B6', 4, 'g'), ('A7', 'מחיר בפקיעה', 'l'), ('B7', 61, 'g'), ('A8', 'רווח יעד', 'l'), ('B8', 10, 'g'),
     ('A10', 'רווח במחיר הנתון', 'l'), ('B10', '=MAX(B5-B7,0)-B6', 'a'), ('A11', 'נקודת איזון', 'l'), ('B11', '=B5-B6', 'a'), ('A12', 'המחיר שנותן את רווח היעד', 'l'), ('B12', '=B5-B6-B8', 'a'), ('A13', 'רווח מרבי', 'l'), ('B13', '=B5-B6', 'a'), ('A14', 'הפסד מרבי', 'l'), ('B14', '=-B6', 'a')]
sheet('4 Put וחילוץ', 'Long Put: חישוב וחילוץ', 'כתבו נוסחה בכל תא צהוב. בחילוץ, כתבו את המשוואה קודם על דף.', c, [28, 12])
# 5 four positions
c = [('A5', 'K', 'l'), ('B5', 100, 'g'), ('A6', 'פרמיית Call', 'l'), ('B6', 7, 'g'), ('A7', 'פרמיית Put', 'l'), ('B7', 6, 'g'),
     ('A9', 'מחיר בפקיעה', 'h'), ('B9', 'Long Call', 'h'), ('C9', 'Short Call', 'h'), ('D9', 'Long Put', 'h'), ('E9', 'Short Put', 'h')]
for i, s in enumerate(range(70, 140, 10)):
    n = 10 + i
    c += [(f'A{n}', s, 'g'), (f'B{n}', f'=MAX(A{n}-$B$5,0)-$B$6', 'a'), (f'C{n}', f'=-B{n}', 'a'), (f'D{n}', f'=MAX($B$5-A{n},0)-$B$7', 'a'), (f'E{n}', f'=-D{n}', 'a')]
sheet('5 ארבע פוזיציות', 'ארבע פוזיציות על אותו נכס', 'השלימו את הטבלה בנוסחה אחת לכל עמודה, וגררו.', c, [16, 12, 12, 12, 12])
# 6 leverage
c = [('A5', 'רמת המדד', 'l'), ('B5', 3800, 'g', '#,##0'), ('A6', 'מכפיל (ש״ח)', 'l'), ('B6', 50, 'g'), ('A7', 'מספר חוזים', 'l'), ('B7', 4, 'g'), ('A8', 'ביטחונות לחוזה (ש״ח)', 'l'), ('B8', 19000, 'g', '#,##0'),
     ('A10', 'חשיפה (ש״ח)', 'l'), ('B10', '=B5*B6*B7', 'a', '#,##0'), ('A11', 'סך ביטחונות (ש״ח)', 'l'), ('B11', '=B8*B7', 'a', '#,##0'), ('A12', 'מנוף', 'l'), ('B12', '=B10/B11', 'a', '0.0'),
     ('A14', 'שינוי במדד', 'h'), ('B14', 'רווח או הפסד (ש״ח)', 'h'), ('C14', 'תשואה על הביטחונות', 'h')]
for i, d in enumerate([-0.1, -0.05, -0.02, 0, 0.02, 0.05]):
    n = 15 + i
    c += [(f'A{n}', d, 'g', '0%'), (f'B{n}', f'=$B$10*A{n}', 'a', '#,##0'), (f'C{n}', f'=B{n}/$B$11', 'a', '0%')]
sheet('6 מנוף', 'מנוף בחוזה על מדד', 'חשבו חשיפה, מנוף ותשואה. באיזה שינוי במדד הולכים כל הביטחונות?', c, [26, 20, 22])
# 7 multiplier
c = [('A5', 'מחיר מימוש (K)', 'l'), ('B5', 4100, 'g', '#,##0'), ('A6', 'פרמיה (נקודות)', 'l'), ('B6', 60, 'g'), ('A7', 'מכפיל (ש״ח)', 'l'), ('B7', 50, 'g'), ('A8', 'מספר חוזים', 'l'), ('B8', 3, 'g'),
     ('A10', 'מדד בפקיעה', 'h'), ('B10', 'תזרים (נקודות)', 'h'), ('C10', 'רווח (נקודות)', 'h'), ('D10', 'רווח (ש״ח)', 'h')]
for i, s in enumerate([4000, 4100, 4160, 4200, 4300]):
    n = 11 + i
    c += [(f'A{n}', s, 'g', '#,##0'), (f'B{n}', f'=MAX(A{n}-$B$5,0)', 'a'), (f'C{n}', f'=B{n}-$B$6', 'a'), (f'D{n}', f'=C{n}*$B$7*$B$8', 'a', '#,##0')]
sheet('7 מכפיל', 'Long Call על מדד: מכפיל (Multiplier)', 'חשבו תזרים ורווח בנקודות, ואז רווח בשקלים. באיזה מדד הרווח אפס?', c, [20, 18, 16, 14])
# 8 fuel
c = [('A5', 'כמות (חביות)', 'l'), ('B5', 2000000, 'g', '#,##0'), ('A6', 'מחיר חוזה אקדמה', 'l'), ('B6', 75, 'g'), ('A9', 'יחס גידור', 'l'), ('B9', 0.75, 'g', '0%'),
     ('A11', 'מחיר החבית', 'h'), ('B11', 'ללא גידור', 'h'), ('C11', 'עם חוזה אקדמה', 'h')]
for i, s in enumerate(range(50, 130, 10)):
    n = 12 + i
    c += [(f'A{n}', s, 'g'), (f'B{n}', f'=$B$5*A{n}', 'a', '#,##0'), (f'C{n}', f'=$B$5*((1-$B$9)*A{n}+$B$9*$B$6)', 'a', '#,##0')]
sheet('8 גידור דלק', 'גידור דלק בחוזה אקדמה (Forward)', 'חשבו את ההוצאה ללא גידור ועם גידור. בנו תרשים של שני הקווים.', c, [20, 16, 18], chart=('A', 'BC', 12, 19))
# 9 hedge ratio
c = [('A5', 'כמות (חביות)', 'l'), ('B5', 2000000, 'g', '#,##0'), ('A6', 'מחיר תרחיש קיצון', 'l'), ('B6', 110, 'g'), ('A7', 'תקציב (דולר)', 'l'), ('B7', 180000000, 'g', '#,##0'), ('A8', 'מחיר חוזה אקדמה', 'l'), ('B8', 75, 'g'), ('A9', 'גודל חוזה (חביות)', 'l'), ('B9', 1000, 'g', '#,##0'),
     ('A11', 'יחס גידור', 'h'), ('B11', 'הוצאה בתרחיש', 'h'), ('C11', 'בתוך התקציב?', 'h'), ('D11', 'מספר חוזים', 'h')]
for i in range(11):
    n = 12 + i
    c += [(f'A{n}', i / 10, 'g', '0%'), (f'B{n}', f'=$B$5*((1-A{n})*$B$6+A{n}*$B$8)', 'a', '#,##0'), (f'C{n}', f'=IF(B{n}<=$B$7,"כן","לא")', 'a'), (f'D{n}', f'=A{n}*$B$5/$B$9', 'a', '#,##0')]
c += [('F5', 'יחס מזערי בטבלה', 'l'), ('G5', '=INDEX(A12:A22,MATCH("כן",C12:C22,0))', 'a', '0%'), ('F6', 'יחס מדויק', 'l'), ('G6', '=(B6-B7/B5)/(B6-B8)', 'a', '0.0%')]
sheet('9 יחס גידור', 'יחס הגידור שעומד בתקציב', 'מצאו את יחס הגידור הנמוך ביותר שעומד בתקציב, ואת מספר החוזים הנדרש.', c, [22, 18, 16, 14, 3, 20, 10])


def build(path, solved):
    wb = Workbook(); w0 = wb.active; w0.title = 'הוראות'; w0.sheet_view.rightToLeft = True; w0.column_dimensions['A'].width = 96
    lines = ['אופציות ומכשירים פיננסיים, שיעור 1: ' + ('קובץ פתרונות' if solved else 'קובץ תרגול'), 'המסלול האקדמי של המכללה למנהל · ד״ר שי צבאן · 2.11.2026', '',
             ('התאים הירוקים מכילים נוסחאות חיות. שנו נתון בתא כחול, והתוצאות יתעדכנו.' if solved else 'התאים הצהובים ריקים: כתבו בהם נוסחאות. התאים הכחולים הם הנתונים.'),
             'כתבו נוסחאות עם הפניות לתאים, ולא מספרים. השתמשו ב-¤ כדי לקבע תאים לפני גרירה.'.replace('¤', '$'), ('השוו לקובץ שלכם רק אחרי שפתרתם, נוסחה מול נוסחה (Ctrl+`).' if solved else 'רק אחרי שפתרתם: משווים לקובץ הפתרונות.'), NOTE, '',
             'הגיליונות:'] + [s['name'] + ': ' + s['title'] for s in SHEETS]
    for i, t in enumerate(lines, 1):
        c = w0.cell(i, 1, t); c.alignment = Alignment(horizontal='right', wrap_text=True); c.font = Font(name='Arial', size=16 if i == 1 else 12, bold=i == 1, color=NAVY if i == 1 else '16213A')
    for s in SHEETS:
        ws = wb.create_sheet(s['name']); ws.sheet_view.rightToLeft = True
        for j, x in enumerate(s['widths']): ws.column_dimensions['ABCDEFGH'[j]].width = x
        ws['A1'] = s['title']; ws['A1'].font = Font(name='Arial', size=15, bold=True, color=NAVY)
        ws['A2'] = s['task']; ws['A2'].font = Font(name='Arial', size=12); ws['A3'] = NOTE; ws['A3'].font = Font(name='Arial', size=10, italic=True, color='5D6A86')
        for cell in s['cells']:
            a, v, k = cell[:3]; fmt = cell[3] if len(cell) > 3 else None; c = ws[a]
            c.alignment = Alignment(horizontal='center' if k != 'l' else 'right', vertical='center', wrap_text=k == 'h'); c.font = Font(name='Arial', size=12); c.border = BOX if k != 'l' else Border()
            if k == 'h': c.value = v; c.fill = PatternFill('solid', fgColor=NAVY); c.font = Font(name='Arial', size=12, bold=True, color='FFFFFF')
            elif k == 'l': c.value = v; c.font = Font(name='Arial', size=12, bold=True)
            elif k == 'g': c.value = v; c.fill = PatternFill('solid', fgColor=GIV)
            elif k == 'a':
                c.fill = PatternFill('solid', fgColor=GRN if solved else YEL)
                if solved: c.value = v
            if fmt: c.number_format = fmt
        if solved and s['chart']:
            xc, ycs, r0, r1 = s['chart']; ch = ScatterChart(); ch.style = 13; ch.title = s['title']; ch.height = 9; ch.width = 15; ch.x_axis.title = 'מחיר בפקיעה'; ch.y_axis.title = 'תוצאה'; ch.x_axis.delete = False; ch.y_axis.delete = False
            x = Reference(ws, min_col=ord(xc) - 64, min_row=r0, max_row=r1)
            hdr = r0 - 1
            for yc in ycs:
                se = Series(Reference(ws, min_col=ord(yc) - 64, min_row=hdr, max_row=r1), x, title_from_data=True); se.marker.symbol = 'none'; ch.series.append(se)
            ws.add_chart(ch, 'I5')
    wb.calculation.fullCalcOnLoad = True
    wb.save(path)


os.makedirs(OUT, exist_ok=True)
build(os.path.join(OUT, 'practice-1.xlsx'), False)
raw = os.path.join(OUT, 'practice-1-solutions.xlsx')
build(raw, True)
# recalc with LibreOffice and verify
d = tempfile.mkdtemp(dir=os.environ.get('TMPDIR'))
subprocess.run(['soffice', '--headless', f'-env:UserInstallation=file://{d}/lo', '--convert-to', 'xlsx:Calc MS Excel 2007 XML', '--outdir', d, raw], capture_output=True, timeout=180)
rec = os.path.join(d, 'practice-1-solutions.xlsx')
V = load_workbook(rec, data_only=True); FM = load_workbook(rec)
errs = []; nform = 0
for s in SHEETS:
    for cell in s['cells']:
        if cell[2] == 'a':
            nform += 1; v = V[s['name']][cell[0]].value
            if v is None or (isinstance(v, str) and v.startswith('#')): errs.append((s['name'], cell[0], v))
            if not str(FM[s['name']][cell[0]].value).startswith('='): errs.append((s['name'], cell[0], 'lost formula'))
print('formulas', nform, 'errors', errs)
g = lambda sh, a: V[sh][a].value
chk = {('1 חשיפה', 'C14'): 50000, ('2 חוזה אקדמה', 'D13'): 2760000, ('3 Long Call', 'C17'): 16, ('3 Long Call', 'F5'): 109, ('4 Put וחילוץ', 'B10'): 5, ('4 Put וחילוץ', 'B12'): 56, ('5 ארבע פוזיציות', 'E10'): -24, ('6 מנוף', 'B12'): 10, ('6 מנוף', 'C15'): -1,
       ('7 מכפיל', 'D13'): 0, ('7 מכפיל', 'D15'): (200 - 60) * 150, ('8 גידור דלק', 'C19'): 2000000 * (0.25 * 120 + 0.75 * 75), ('9 יחס גידור', 'G5'): 0.6, ('9 יחס גידור', 'G6'): (110 - 90) / 35}
for (sh, a), e in chk.items():
    v = g(sh, a); assert abs(v - e) < 1e-6, (sh, a, v, e)
print('checked values', len(chk), '| rtl', all(FM[s['name']].sheet_view.rightToLeft for s in SHEETS), '| charts', [len(FM[s['name']]._charts) for s in SHEETS if s['chart']])
assert not errs
shutil.copy(rec, raw)   # ship the recalculated copy, so values also show in Protected View
shutil.rmtree(d, True)
for f in ('practice-1.xlsx', 'practice-1-solutions.xlsx'):
    print(f, os.path.getsize(os.path.join(OUT, f)))
P = load_workbook(os.path.join(OUT, 'practice-1.xlsx'))
print('practice answers leaked:', sum(1 for s in SHEETS for c in s['cells'] if c[2] == 'a' and P[s['name']][c[0]].value is not None))
