/* ===== clickable formula sheet: a click on a formula shows its meaning, an example and the Excel way ===== */
document.querySelectorAll('.xp').forEach(xp=>{xp.addEventListener('click',e=>{const c=e.target.closest('.xp-c');if(!c)return;
 xp.querySelectorAll('.xp-c').forEach(b=>b.classList.toggle('on',b===c));const z=xp.querySelector('.xp-0');if(z)z.hidden=true;
 xp.querySelectorAll('.xp-x').forEach(x=>{x.hidden=x.dataset.i!==c.dataset.i;});});});
