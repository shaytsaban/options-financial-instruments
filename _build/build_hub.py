# Course hub. Run: python3 build_hub.py  ->  ../index.html
import os, re
H = os.path.dirname(os.path.abspath(__file__))
n = lambda s: f'<span class="n">{s}</span>'
UP = [(4, 'חוזים עתידיים: הרעיון הבסיסי'), (5, 'חוזים עתידיים: יישומים עסקיים'), (6, 'אופציות: מושגי יסוד ואסטרטגיות הגנה'), (7, 'אסטרטגיות רווח ומסחר'), (8, 'עקרונות בתמחור'), (9, 'אופציות אירופאיות ואמריקאיות: מימוש מוקדם וחסמים'), (10, 'עסקאות החלפה (Swap)'), (11, 'מכשירים מורכבים'), (12, 'ניהול סיכונים ארגוני'), (13, 'כשלים מפורסמים, השוק הישראלי, וסיכום לקראת המבחן')]
ups = ''.join(f'<li><span class="un">{n(i)}</span><span>{t}</span><em>בקרוב</em></li>' for i, t in UP)
src = open(os.path.join(H, '..', '..', 'finance-for-managers', 'index.html'), encoding='utf8').read()
css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
css += '''
.lec-body .rec{padding:0;margin-top:18px}
.lec-body .rec h4{font-size:18px;margin-bottom:10px;color:var(--navy2)}
.lec-body .recbox{position:relative;aspect-ratio:16/9;width:100%;max-width:none;border-radius:16px;overflow:hidden;background:#0c1426;box-shadow:0 10px 26px rgba(22,33,58,.18);border:3px solid var(--navy2)}
.lec-body .recbox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lec-body .rec a.yt{display:inline-block;margin-top:8px;font-weight:700;font-size:15px;color:var(--navy2);text-decoration:underline}
.contact{margin-top:14px;background:#fff7e0;border:2px solid #f0b429;border-radius:18px;padding:16px 24px;display:flex;gap:16px;align-items:center}
.contact .ic{font-size:34px;flex:none}
.contact h2{font-size:20px;font-weight:800;line-height:1.3;color:var(--navy2)}
.contact h2 a{direction:ltr;unicode-bidi:isolate;display:inline-block;text-decoration:underline;overflow-wrap:anywhere}
.contact p{font-size:16.5px;line-height:1.45;margin-top:3px;color:#4a4130}
@media (max-width:760px){.contact{padding:14px 16px}.contact .ic{display:none}.contact h2{font-size:18px}}
.live{margin-top:-26px;position:relative;z-index:2;background:linear-gradient(120deg,#ff6a4d,#ff8f5a);color:#fff;border-radius:20px;padding:22px 28px;display:flex;gap:20px;align-items:center;box-shadow:0 14px 34px rgba(255,106,77,.35)}
.live .ic{font-size:44px;flex:none}
.live h2{font-size:26px;font-weight:800;line-height:1.2}
.live p{font-size:16.5px;margin-top:4px;line-height:1.4}
.live p a{text-decoration:underline;font-weight:700}
.live .go{flex:none;margin-right:auto;background:#fff;color:#c4421f;font-weight:800;font-size:19px;padding:14px 26px;border-radius:14px;text-align:center;transition:transform .15s}
.live .go:hover{transform:translateY(-2px)}
.live .go small{display:block;font-weight:600;font-size:13px;color:#5d6a86}
@media (max-width:760px){.live{flex-direction:column;align-items:stretch;padding:20px 18px;margin-top:-18px}.live .ic{display:none}.live .go{margin-right:0}}
.solutions{margin-top:18px;background:#fff;border-radius:20px;padding:24px 28px;display:flex;gap:22px;align-items:flex-start;box-shadow:0 2px 0 var(--line),0 10px 30px rgba(22,33,58,.07);border-right:8px solid #6d4df2}
.solutions .ic{font-size:44px;flex:none}
.solutions h3{font-size:22px;font-weight:800;line-height:1.25}
.solutions .tag{display:inline-block;background:#ece8ff;color:#4f33c9;border-radius:99px;padding:2px 14px;font-weight:700;font-size:14px;margin-bottom:6px}
.solutions p{font-size:16px;color:var(--ink2);margin-top:6px}
.solutions .warn{margin-top:12px;background:#fff7e0;border-right:5px solid #f0b429;border-radius:10px;padding:10px 14px;font-size:15px;color:#4a4130}
.solutions .btn2{flex:none;margin-right:auto;align-self:center;background:#6d4df2;color:#fff;font-weight:800;font-size:17px;padding:12px 22px;border-radius:14px;text-align:center;transition:transform .15s}
.solutions .btn2:hover{transform:translateY(-2px)}
.solutions .btn2 small{display:block;font-weight:500;font-size:13px;opacity:.9}
.lk.x .e{background:#e3f6ea}.lk.r .e{background:#fff0d2}
.todo{margin:0 30px 26px;background:#fff7e0;border:2px solid #f0b429;border-radius:18px;padding:18px 22px}
.todo h4{font-size:18px;color:var(--navy2);margin-bottom:8px}
.todo ol{padding-inline-start:22px;font-size:16px;line-height:1.6}
.ups{list-style:none;margin-top:18px;background:var(--card);border-radius:18px;box-shadow:0 2px 0 var(--line);overflow:hidden}
.ups li{display:flex;gap:14px;align-items:center;padding:11px 22px;border-bottom:1px solid var(--line);font-size:16.5px;font-weight:600}
.ups li:last-child{border:0}
.ups .un{flex:none;width:34px;height:34px;border-radius:10px;background:#eef0f6;color:var(--navy2);display:grid;place-items:center;font-weight:800}

.todo.hw .hw-how{font-size:15.5px;line-height:1.5;margin:4px 0 8px;color:#4a4130}
.hw-t{width:100%;border-collapse:collapse;font-size:15px;background:#fff;border-radius:10px;overflow:hidden}
.hw-t th{background:#1b2d55;color:#fff;text-align:right;padding:6px 10px}
.hw-t td{padding:6px 10px;border-bottom:1px solid #eadfc6;vertical-align:top}
.hw-t td:nth-child(2){white-space:nowrap;font-weight:700;color:#a86703}
@media (max-width:760px){.hw-t{font-size:13.5px}.hw-t td,.hw-t th{padding:5px 6px}}
.ups em{margin-right:auto;font-style:normal;color:var(--mut);font-size:14px;font-weight:500}
@media (max-width:760px){.solutions{flex-direction:column;padding:20px 18px}.solutions .btn2{margin-right:0;width:100%}.todo{margin:0 18px 22px;padding:14px 16px}.ups li{padding:10px 14px}}
'''
page = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>אופציות ומכשירים פיננסיים | אתר הקורס</title>
<meta name="description" content="אתר הקורס אופציות ומכשירים פיננסיים, המסלול האקדמי של המכללה למנהל, התמחות במימון: מצגות אינטראקטיביות, סיכומים, קובצי תרגול ב-Excel וסילבוס.">
<link rel="stylesheet" href="assets/fonts.css">
<style>{css}</style>
</head>
<body>
<header class="hero"><div class="wrap">
<div class="kick"><span>המסלול האקדמי של המכללה למנהל · התמחות במימון · קורס {n(123377)} · סמסטר א׳ תשפ״ז</span></div>
<h1>אופציות ומכשירים פיננסיים</h1>
<p class="lead">הקורס עוסק בחוזים עתידיים, באופציות, בעסקאות החלפה ובחוב מובנה: איך הם פועלים, כיצד מתמחרים אותם, ומתי הם מוסיפים ערך לעסק. לכל שיעור באתר: מצגת אינטראקטיבית עם פעילויות נבדקות, סיכום מורחב וקובץ תרגול ב-Excel עם קובץ פתרונות נפרד.</p>
<p class="meta">ד״ר שי צבאן · מתרגל: יהל צרפתי</p>
</div></header>
<main class="wrap">
<section class="live" id="live">
<div class="ic">🎥</div>
<div><h2>המפגשים החיים השבועיים ב-Zoom</h2><p>כל המפגשים מתקיימים בקישור הזה. ההקלטות נמצאות למטה, בכרטיס של כל שיעור: <a href="#lesson-1">למעבר להקלטות</a>.</p></div>
<a class="go" href="https://hdq-colman-ac.zoom.us/j/3160447945" target="_blank" rel="noopener">כניסה למפגש החי<small>Zoom</small></a>
</section>
<section class="contact" id="contact">
<div class="ic">✉️</div>
<div><h2>פניות לד״ר שי צבאן רק במייל: <a href="mailto:shay.tsaban@gmail.com">shay.tsaban@gmail.com</a></h2>
<p>תכתובות בכל ערוץ אחר לא ייענו. <b>חובה לרשום בכל תכתובת את שם המוסד ואת שם הקורס.</b></p></div>
</section>
<div class="solutions">
<div class="ic">📋</div>
<div><span class="tag">מסמך הקורס</span><h3>סילבוס הקורס</h3>
<p>{n(13)} מפגשים. <b>הציון: מבחן {n('100%')}</b>, מבחן פתוח במעבדה, על גבי מחשב. שם הקורס בידיעון: אופציות ומכשירים פיננסיים מתוחכמים.</p>
<div class="warn">מותר ומומלץ להשתמש בבינה מלאכותית בקורס. יש לבדוק את אמינות התוצרים ולאזכר אותם. פרטי המדיניות בסילבוס.</div></div>
<a class="btn2" href="materials/syllabus.pdf" target="_blank" rel="noopener">פתיחת הסילבוס<small>PDF</small></a>
</div>
<section class="block">
<h2 class="sec">השיעורים</h2>
<article class="lec" id="lesson-1">
<div class="lec-head"><div class="lec-n">1</div><div><h3>מבוא: למה צריך מכשירים מתוחכמים?</h3><div class="sub">{n('2.11.2026')} · קריאה: Hull, פרק {n(1)}</div></div></div>
<div class="lec-body">
<div><h4>מה לומדים בשיעור</h4><ul class="learn">
<li>מה זה נגזר (Derivative): שובר הטיסה, זכות ופרמיה (Premium)</li>
<li>למה נכנסים לחוזה: גידור, ספקולציה וחיסכון בעלויות</li>
<li>חשיפה (Exposure) וחשיפה נטו, עם מקרים שלמים וקרן סל מגודרת מט״ח</li>
<li>חוזה אקדמה (Forward) וחוזה עתידי (Futures)</li>
<li>סיכומים ותרגול: תרגילי אקסל קטנים ושאלות רב ברירה</li>
</ul><div class="rec" id="recording-1"><h4>🎥 הקלטת השיעור · {n('2.11.2026')}</h4><div class="recbox"><iframe src="https://www.youtube.com/embed/P6cfciT2w8Y" title="הקלטת שיעור 1" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><a class="yt" href="https://youtu.be/P6cfciT2w8Y" target="_blank" rel="noopener">לצפייה ב-YouTube</a></div></div>
<div><h4>חומרי השיעור</h4><div class="links">
<a class="lk p" href="lectures/lecture-1/presentation.html"><span class="e">🖥️</span><span><b>מצגת השיעור</b><span class="d">{n(66)} שקפים, {n(16)} תרגילי אקסל בתוך השקפים ו-{n(23)} שאלות רב ברירה, עם רמזים ופתרונות</span></span></a>
<a class="lk s" href="lectures/lecture-1/summary.pdf"><span class="e">📄</span><span><b>סיכום השיעור (PDF)</b><span class="d">כל תוכן המצגת: הגדרות, פתרונות התרגילים ומילון מושגים</span></span></a>
<a class="lk x" href="materials/practice-1.xlsx" download><span class="e">📊</span><span><b>קובץ תרגול (Excel)</b><span class="d">{n(6)} גיליונות. ממלאים נוסחאות בתאים הצהובים</span></span></a>
<a class="lk r" href="materials/practice-1-solutions.xlsx" download><span class="e">✅</span><span><b>קובץ פתרונות (Excel)</b><span class="d">נוסחאות חיות ותרשימים. פותחים רק אחרי שפותרים</span></span></a>
</div></div>
</div>
<div class="todo"><h4>📝 תרגול עצמי לשיעור {n(1)}</h4><ol>
<li>במצגת: חלק הסיכום והתרגול, ובסופה שלושה תרגילי בית באקסל ושש שאלות רב ברירה.</li>
<li>בקובץ התרגול ב-Excel: קודם פותרים, ורק אחר כך משווים לקובץ הפתרונות.</li>
<li>קריאה: Hull, פרק {n(1)}, החלקים על חוזה אקדמה וחוזה עתידי.</li>
</ol></div>
</article>
<article class="lec" id="lesson-2">
<div class="lec-head"><div class="lec-n">2</div><div><h3>אופציות: זכות, פרמיה וארבע פוזיציות</h3><div class="sub">{n('9.11.2026')} · קריאה: Hull, פרק {n(1)}, החלקים על אופציות</div></div></div>
<div class="lec-body">
<div><h4>מה לומדים בשיעור</h4><ul class="learn">
<li>חזרה על מפגש 1: חוזה אקדמה, חשיפה נטו, ותרגיל חימום</li>
<li>אופציה (Option): זכות בלי חובה, תמורת פרמיה</li>
<li>ארבע פוזיציות: קונה וכותב Call, קונה וכותב Put</li>
<li>תזרים (Payoff), רווח (P&amp;L) ונקודת איזון, בטבלה, בגרף ובאקסל</li>
</ul><div class="rec" id="recording-2"><h4>🎥 הקלטת השיעור · {n('9.11.2026')}</h4><div class="recbox"><div class="recph"><div><b>ההקלטה בעיבוד</b>ותועלה בהמשך</div></div></div></div></div>
<div><h4>חומרי השיעור</h4><div class="links">
<a class="lk p" href="lectures/lecture-2/presentation.html"><span class="e">🖥️</span><span><b>מצגת השיעור</b><span class="d">{n(44)} שקפים, {n(14)} תרגילי אקסל בגיליון דמוי Excel, ו-{n(3)} שאלות דיון</span></span></a>
<a class="lk s" href="lectures/lecture-2/summary.pdf"><span class="e">📄</span><span><b>סיכום השיעור (PDF)</b><span class="d">כל תוכן המצגת: הגדרות, פתרונות התרגילים ומילון מושגים</span></span></a>
<a class="lk x" href="materials/practice-2.xlsx" download><span class="e">📊</span><span><b>קובץ תרגול (Excel)</b><span class="d">{n(3)} גיליונות. ממלאים נוסחאות בתאים הצהובים</span></span></a>
<a class="lk r" href="materials/practice-2-solutions.xlsx" download><span class="e">✅</span><span><b>קובץ פתרונות (Excel)</b><span class="d">נוסחאות חיות ותרשימים. פותחים רק אחרי שפותרים</span></span></a>
</div></div>
</div>
</div></div>
<div class="todo hw"><h4>📝 מה פותרים עד מפגש {n(3)}: שיעורי הבית של שיעור {n(2)}</h4>
<p class="hw-how">כל התרגילים נמצאים בסוף מצגת שיעור 2, בחלק ״לבית״, ואפשר לפתור אותם בתוך השקפים: בגיליון שבשקף, עם רמז, פתרון חלקי ופתרון מלא. מתחילים ברמה 1 ומתקדמים.</p>
<table class="hw-t"><tr><th>מה</th><th>רמה</th><th>מה מתרגלים</th></tr>
<tr><td>תרגיל בית 1: Long Call באקסל</td><td>1</td><td>תזרים ורווח של קונה Call, בנוסחת MAX</td></tr>
<tr><td>תרגיל בית 2: Short Put באקסל</td><td>1</td><td>תזרים ורווח של כותב Put, כולל הסימן</td></tr>
<tr><td>תרגיל בית 3: Long Put באקסל</td><td>2</td><td>טבלה, נקודת איזון, הפסד מרבי ורווח מרבי</td></tr>
<tr><td>תרגיל בית 4: ארבע פוזיציות באקסל</td><td>3</td><td>נוסחה אחת לכל עמודה, ותרשים של ארבע הפוזיציות</td></tr>
<tr><td>תרגיל בית 5: חילוץ פרמיה באקסל</td><td>4, אתגר</td><td>מנקודת האיזון אל הפרמיה, ומחיר שנותן רווח מבוקש</td></tr>
<tr><td>שאלות דיון 1 עד 3</td><td>דיון</td><td>למה לכתוב Call, האם מיכל טעתה, Long Call מול Short Put. כותבים שלוש שורות, ורק אז פותחים את התשובה לדוגמה</td></tr>
<tr><td>שאלות רב ברירה 1 עד 6</td><td>1 עד 2</td><td>חישובי רווח, נקודת איזון, הפסד ורווח מרביים</td></tr>
<tr><td>קובץ התרגול: שלושה גיליונות</td><td>1 עד 3</td><td>Long Call עם תרשים, Put וחילוץ, ארבע פוזיציות</td></tr>
</table>
<p class="hw-how">קריאה: Hull, פרק {n(1)}, החלקים על אופציות. מה שלא הספקנו במפגש 2 (מכפיל, אירופאית ואמריקאית, עסקת החלפה והלאה) עבר למפגש 3, ואין בו שיעורי בית כרגע.</p>
</div>
</article>
<article class="lec" id="lesson-3">
<div class="lec-head"><div class="lec-n">3</div><div><h3>מכפיל, שחקנים ושווקים</h3><div class="sub">{n('16.11.2026')} · המשך משיעור {n(2)} · קריאה: Hull, פרק {n(1)}</div></div></div>
<div class="lec-body">
<div><h4>מה לומדים בשיעור</h4><ul class="learn">
<li>תזכורת קלה: ארבע הפוזיציות של מפגש 2</li>
<li>נקודות של מדד, מכפיל, אירופאית ואמריקאית, ועסקת החלפה (Swap)</li>
<li>השחקנים: מגדר (Hedger), ביטחונות (Margin), ספקולנט (Speculator) ומנוף</li>
<li>השווקים: שיקגו, תל אביב ושוק מעבר לדלפק (OTC)</li>
<li>מקרה בוחן: גידור דלק, בתרגילי אקסל</li>
</ul><div class="rec" id="recording-3"><h4>🎥 הקלטת השיעור · {n('16.11.2026')}</h4><div class="recbox"><div class="recph"><div><b>ההקלטה בעיבוד</b>ותועלה בהמשך</div></div></div></div></div>
<div><h4>חומרי השיעור</h4><div class="links">
<a class="lk p" href="lectures/lecture-3/presentation.html"><span class="e">🖥️</span><span><b>מצגת השיעור</b><span class="d">{n(51)} שקפים, {n(9)} תרגילי אקסל בגיליון דמוי Excel, ו-{n(3)} תרגילים מסכמים</span></span></a>
<a class="lk s" href="lectures/lecture-3/summary.pdf"><span class="e">📄</span><span><b>סיכום השיעור (PDF)</b><span class="d">כל תוכן המצגת: הגדרות, פתרונות התרגילים ומילון מושגים</span></span></a>
<a class="lk x" href="materials/practice-3.xlsx" download><span class="e">📊</span><span><b>קובץ תרגול (Excel)</b><span class="d">{n(4)} גיליונות. ממלאים נוסחאות בתאים הצהובים</span></span></a>
<a class="lk r" href="materials/practice-3-solutions.xlsx" download><span class="e">✅</span><span><b>קובץ פתרונות (Excel)</b><span class="d">נוסחאות חיות ותרשימים. פותחים רק אחרי שפותרים</span></span></a>
</div></div>
</div>
</div></div>
</article>
<h2 class="sec" style="margin-top:36px">השיעורים הבאים</h2>
<ul class="ups">{ups}</ul>
</section>
<footer>ד״ר שי צבאן · פניות רק במייל: <a href="mailto:shay.tsaban@gmail.com">shay.tsaban@gmail.com</a>, עם שם המוסד ושם הקורס</footer>
</main>
</body>
</html>
'''
assert '—' not in page and '־' not in page
open(os.path.join(H, '..', 'index.html'), 'w', encoding='utf8').write(page)
print('hub', len(page))
