# Syllabus PDF. Run: python3 build_syllabus.py  ->  ../materials/syllabus.pdf
import html, os, shutil, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(H, '..', '..', 'iit-build', 'fonts')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
e = html.escape
SITE = 'https://shaytsaban.github.io/options-financial-instruments/'
NOTE = 'ייתכנו שינויים קלים בתוכן הקורס במהלך הסמסטר, בהתאם להתקדמות בשיעורים ולהתפתחויות מהותיות בשוק. עדכונים יפורסמו באתר הקורס.'
n = lambda s: f'<span class="n">{s}</span>'
L = [('מבוא: למה צריך מכשירים מתוחכמים?', 'מהם נגזרים פיננסיים, עם דוגמאות מהחיים. השחקנים: מגדרים וספקולנטים. השווקים: בורסת שיקגו, TASE ושווקי OTC. מקרה בוחן: איך חברת תעופה מגדרת מחירי דלק.', 'Hull 1'),
     ('חוזים עתידיים: הרעיון הבסיסי', 'מהו חוזה עתידי. Forward מול Futures. מנגנון הביטחונות (Margin), ומדוע הוא חשוב. סוגי חוזים: סחורות, מט״ח, ריבית ומדדים. דוגמה מעשית: גידור מט״ח אצל יצואן ישראלי.', 'Hull 2'),
     ('חוזים עתידיים: יישומים עסקיים', 'גידור סיכוני מט״ח. Basis Risk ו-Cross-Hedging: מה יכול להשתבש. גידור סיכוני ריבית על הלוואה בריבית משתנה. שימושים בתעשיית המזון והאנרגיה. ארביטראז׳יסטים, מחיר אקדמה ועלות החזקה. מקרה בוחן: Metallgesellschaft, כשגידור הופך להפסד.', 'Hull 3, 5'),
     ('אופציות: מבוא', 'מהי אופציה. Put ו-Call בשפה של ביטוח. קנייה מול כתיבה, דרך תרשימי תשלום. מושגי יסוד: Strike, Premium ו-Expiration; ITM, ATM ו-OTM (בתוך הכסף, בכסף ומחוץ לכסף).', 'Hull 10'),
     ('אופציות: אסטרטגיות הגנה', 'Protective Put, Covered Call ו-Collar. סדנה: בניית אסטרטגיות על מניית TEVA.', 'Hull 12'),
     ('אסטרטגיות רווח ומסחר', 'Straddle ו-Strangle. Spreads: Bull, Bear ו-Butterfly. טבלת החלטה מעשית. מקרה בוחן: אסטרטגיות סביב פרסום דוחות כספיים.', 'Hull 12'),
     ('עקרונות בתמחור', 'ערך פנימי וערך זמן, ומה משפיע על מחיר האופציה. Put-Call Parity. האינטואיציה של Black-Scholes. ה-Greeks בשפה עסקית. יישום: קריאת דוח סיכונים של חברה ציבורית.', 'Hull 11, 15, 19'),
     ('אופציות אירופאיות ואמריקאיות: מימוש מוקדם וחסמים', '<b>דיון מהותי ותרגול מעשי.</b> מתי מימוש מוקדם אופטימלי ומתי לא: Call ללא דיבידנד מול Put עמוקה בכסף. מקרה הדיבידנד. מ-Put-Call Parity כשוויון, באופציה אירופאית, לאי שוויונות חוסמים, באופציה אמריקאית. פרמיית האופציה האמריקאית. תרגיל עץ בינומי ב-Excel, בהסתברות נתונה: תמחור ובדיקת מימוש מוקדם בכל צומת.', 'Hull 11, 13'),
     ('עסקאות החלפה (Swap)', 'הסבר דרך דוגמת ריבית פשוטה. Interest Rate Swap ו-Currency Swap. מקרה בוחן: Swap בחברת נדל״ן ישראלית.', 'Hull 7'),
     ('מכשירים מורכבים', 'Convertible Bonds, Warrants ומוצרים מובנים. מקרה בוחן: הנפקת אג״ח להמרה בבורסה בתל אביב.', 'Hull 12, 15, 27'),
     ('ניהול סיכונים ארגוני', 'ERM (ניהול סיכונים ארגוני) ותפקיד מנהל הסיכונים. VaR (ערך בסיכון) בשפה פשוטה. דיווח חשיפות בביאורים. סדנה: ניתוח דוח סיכונים של חברה ציבורית ישראלית.', 'Hull 22'),
     ('כשלים מפורסמים, השוק הישראלי וקריירה', 'Barings, LTCM, AIG ומשבר 2008, ו-CDS (חוזי החלפת כשל אשראי). דיון: רגולציה, אתיקה ואחריות. שוק הנגזרים בישראל: מאפיינים, היקפים ורגולציה. תפקידים: Risk Manager, Derivatives Trader ו-Treasury Analyst. הסמכות: CFA, FRM ו-PRM.', 'Hull 8, 25, 37'),
     ('סיכום וחזרה לקראת המבחן', 'מפת סיכום של כל המכשירים, האסטרטגיות והיישומים. תרגול בסגנון יישומי. שאלות פתוחות.', '')]
rows = ''.join(f'<tr{" class=hi" if i == 7 else ""}><td class="c">{i + 1}</td><td><b>{t}</b></td><td>{w}</td><td class="r">{n(h) if h else ""}</td></tr>' for i, (t, w, h) in enumerate(L))
LIT = ['Hull, J. C. (2022). Options, Futures, and Other Derivatives (11th ed.). Pearson.']
REC = ['Hull, J. C. (2023). Risk Management and Financial Institutions (6th ed.). Wiley.',
       'McDonald, R. L. (2013). Derivatives Markets (3rd ed.). Pearson.',
       'Natenberg, S. (2014). Option Volatility and Pricing: Advanced Trading Strategies and Techniques (2nd ed.). McGraw-Hill.']
lit = lambda x: ''.join(f'<li><span class="n">{e(t)}</span></li>' for t in x)
body = f'''
<div class="hd"><div class="k">המסלול האקדמי של המכללה למנהל · התמחות במימון · סמסטר א׳ תשפ״ז</div><h1 class="t">אופציות ומכשירים פיננסיים מתוחכמים</h1><div class="s">סילבוס הקורס · {n('Financial options and instruments')}</div></div>
<table class="meta"><tr><td>קוד קורס</td><td>{n('123377')}</td></tr><tr><td>פקולטה</td><td>מנהל עסקים, תואר ראשון</td></tr><tr><td>היקף</td><td>{n('3.00')} נקודות זכות, {n('3.00')} שעות שבועיות, {n('13')} מפגשים</td></tr><tr><td>מרצה</td><td>ד״ר שי צבאן · {n('shay.tsaban@gmail.com')}</td></tr><tr><td>מתרגל</td><td>יהל צרפתי · {n('yahelzarfati202@gmail.com')} · ב-{n('Zoom')}, בתיאום מראש</td></tr><tr><td>מפגש ראשון</td><td>{n('2.11.2026')}</td></tr><tr><td>שיטת ההוראה</td><td>הרצאות המשולבות בתרגול מעשי</td></tr><tr><td>הרכב הציון</td><td>מבחן {n('100%')}: מבחן פתוח במעבדה, על גבי מחשב</td></tr><tr><td>אתר הקורס</td><td><a class="url" href="{SITE}">{SITE}</a></td></tr></table>
<h3>תיאור הקורס</h3>
<p>הקורס עוסק במכשירים פיננסיים מתוחכמים: חוזים עתידיים, אופציות, עסקאות החלפה וחוב מובנה. נלמד איך הם פועלים, כיצד מתמחרים אותם, ומתי הם מוסיפים ערך לעסק ומתי הם מיותרים או מסוכנים. הקורס משלב חישובים ב-Excel, ניתוח דוחות של חברות ציבוריות ומקרי בוחן מהשוק הישראלי והבין לאומי.</p>
<h3>תוצרי למידה: בסוף הקורס הסטודנטים ידעו</h3>
<ul><li>לזהות מצבים עסקיים שבהם מכשירים מתוחכמים מוסיפים ערך, ומצבים שבהם הם מיותרים או מסוכנים.</li><li>להבין את ההיגיון העסקי של אופציות, חוזים עתידיים, עסקאות החלפה וחוב מובנה.</li><li>לבנות תמהיל מכשירים למטרות גידור, מנוף, הגנה ויצירת תשואה.</li><li>להכיר את התפקידים בשוק ההון ואת ההסמכות הנדרשות בהם.</li><li>לנתח מקרי בוחן ישראליים ובין לאומיים, כולל הצלחות וכשלים ידועים: Barings, LTCM ומשבר 2008.</li></ul>
<h3>נושאי המפגשים</h3>
<table class="plan"><thead><tr><th>מפגש</th><th>נושא</th><th>תכנים עיקריים</th><th>קריאה</th></tr></thead><tbody>{rows}</tbody></table>
<div class="note">קריאה: מספרי הפרקים לפי {n('Hull, 11th ed.')}. {NOTE}</div>
<h3>שיטות הוראה</h3>
<p>הרצאות עם דוגמאות מעשיות ודיאלוג בכיתה. מקרי בוחן מהשוק הישראלי והבין לאומי. סימולציות מעשיות: בניית אסטרטגיות על נתוני שוק אמיתיים. ניתוח דוחות כספיים וביאורים של חברות ציבוריות. אורח מהתעשייה, בכפוף לזמינות. לכל מפגש מתפרסמים באתר הקורס מצגת אינטראקטיבית, סיכום כתוב וקובץ תרגול ב-Excel עם קובץ פתרונות נפרד.</p>
<h3>הרכב הציון</h3>
<table><thead><tr><th>רכיב</th><th>משקל</th><th>אופן</th></tr></thead><tbody><tr><td>מבחן</td><td>{n('100%')}</td><td>מבחן פתוח במעבדה, על גבי מחשב. פרטים ומיקוד יפורסמו לקראת סוף הקורס.</td></tr></tbody></table>
<h3>מדיניות השימוש בבינה מלאכותית</h3>
<p><b>היתר מלא.</b> בקורס זה אנו מעודדים שימוש בבינה מלאכותית בכל המטלות. על הסטודנט לבדוק את אמינות התוצרים, לאזכרם בעבודה ולמלא טופס הצהרה באתר הקורס. הפרת מדיניות זו היא עבירת משמעת.</p>
<h3>ספרות</h3>
<p><b>ספר הלימוד:</b></p><ul class="lit">{lit(LIT)}</ul>
<p><b>להרחבה (לא חובה):</b></p><ul class="lit">{lit(REC)}</ul>
<p>{n('Hull')}, פרקים {n('11')} ו-{n('13')}, ו-{n('McDonald')}, פרקים {n('9')} ו-{n('10')}, הם הקריאה למפגש {n('8')} על אופציות אירופאיות ואמריקאיות.</p>
<h3>יצירת קשר</h3>
<p>פניות למרצה רק במייל: {n('shay.tsaban@gmail.com')}. תכתובות בכל ערוץ אחר לא ייענו. חובה לרשום בכל תכתובת את שם המוסד ואת שם הקורס. פניות למתרגל: {n('yahelzarfati202@gmail.com')}.</p>'''
CSS = '''
@font-face{font-family:"David";src:url("david.ttf");font-weight:400}
@font-face{font-family:"David";src:url("davidbd.ttf");font-weight:700}
@page{size:A4;margin:16mm;@bottom-center{content:counter(page);font-family:"David";font-size:10pt;color:#5d6a86}}
:root{--ink:#16213a;--navy:#1b2d55;--coral:#ff6a4d;--mut:#5d6a86;--line:#d9d2c3}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html{direction:rtl}body{font-family:"David";font-size:11.8pt;line-height:1.34;color:var(--ink);margin:0}
.n{direction:ltr;unicode-bidi:isolate}
.hd{background:linear-gradient(160deg,#0f1b33 0%,#1b2d55 60%,#27447f 100%);color:#fff;border-radius:3mm;padding:6mm 8mm;margin-bottom:4mm}
.hd .k{color:#7fe3d6;font-weight:700;font-size:12pt}.hd h1.t{color:#fff;margin:1.5mm 0 1mm;font-size:24pt}.hd .s{color:#d6e0f7;font-size:13.5pt}
h3{font-size:13.4pt;color:var(--navy);margin:4mm 0 1.2mm;break-after:avoid;border-bottom:.5mm solid var(--coral);padding-bottom:.6mm}
p{margin:0 0 1.6mm}ul{margin:0 0 1.6mm;padding-right:6mm}li{margin-bottom:.5mm}
table{width:100%;border-collapse:collapse;font-size:10.8pt;margin:1.2mm 0 2mm}th{background:var(--navy);color:#fff;text-align:right;padding:1mm 2mm}td{padding:1mm 2mm;border-bottom:.25mm solid var(--line);vertical-align:top}tr{break-inside:avoid}
table.meta td:first-child{font-weight:700;width:30mm;color:var(--navy)}td.c{text-align:center;font-weight:700}td.r{white-space:nowrap}
tr.hi td{background:#fff0d2}.note{background:#eef2ff;border-right:1.2mm solid var(--navy);border-radius:1mm;padding:1.2mm 2.6mm;font-size:10.8pt}
.url{direction:ltr;unicode-bidi:isolate;font-family:Arial,sans-serif;font-size:10pt;color:var(--navy)}
.lit{list-style:none;padding:0}.lit .n{display:block;text-align:left}
'''
page = f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>אופציות ומכשירים פיננסיים מתוחכמים | סילבוס</title><style>{CSS}</style></head><body>{body}</body></html>'
assert '—' not in page and '־' not in page
d = tempfile.mkdtemp(dir=os.environ.get('TMPDIR'))
for f in ('david.ttf', 'davidbd.ttf'): shutil.copy(os.path.join(FONTS, f), d)
open(os.path.join(d, 's.html'), 'w', encoding='utf8').write(page)
out = os.path.abspath(os.path.join(H, '..', 'materials', 'syllabus.pdf'))
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', f'--user-data-dir={d}/p', '--no-pdf-header-footer', '--virtual-time-budget=6000', f'--print-to-pdf={out}', 'file://' + d + '/s.html'], capture_output=True, timeout=120)
shutil.rmtree(d, True)
import fitz
D = fitz.open(out); print('pages', len(D), 'bytes', os.path.getsize(out), sorted({f[3].split('+')[-1] for p in D for f in p.get_fonts()}))
