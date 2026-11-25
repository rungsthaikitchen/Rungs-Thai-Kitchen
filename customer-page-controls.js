(function(root){
'use strict';
function create({document,window,navigator}){
function computeHeaderOffset() {
  const root = document.documentElement;
  const headerSlidUp = root.classList.contains('header-slid-up'); // when header is hidden past Allergens
  if (headerSlidUp) return 12; // tiny gap when header isn’t covering content
  const h = (document.querySelector('.site-header') || document.querySelector('header'));
  return (h ? Math.round(h.getBoundingClientRect().height) : 0) + 12;
}

function applyHeaderOffset() {
  document.documentElement.style.setProperty('--header-offset', computeHeaderOffset() + 'px');
}

function smoothScrollToElTop(el){
	  if (!el) return;
	  const offset = computeHeaderOffset();
	  const target = el.getBoundingClientRect().top + window.scrollY - offset;
	  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	  const top = Math.max(0, Math.min(target, maxTop));

	  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	  window.scrollTo({ top, behavior: (isIOS || prefersReduced) ? 'auto' : 'smooth' });
	}

function bindHeader(){
window.addEventListener('load', applyHeaderOffset, { passive:true });
window.addEventListener('resize', applyHeaderOffset, { passive:true });
window.addEventListener('orientationchange', applyHeaderOffset, { passive:true });
window.addEventListener('scroll', applyHeaderOffset, { passive:true }); // keep it fresh while you move
applyHeaderOffset();
}

function bindLightbox(){
	document.querySelectorAll('#food-grid img').forEach(img => {
	  img.addEventListener('click', ()=> {
		const lb = document.getElementById('lightbox');
		const lbImg = document.getElementById('lightbox-img');
		if (!lb || !lbImg) return;
		lbImg.src = img.src || '';
		lb.style.display = 'flex';
	  });
	});
	const lbRoot = document.getElementById('lightbox');
	if (lbRoot) {
	  lbRoot.addEventListener('click', (e) => {
		if(e.target.id === 'lightbox' || e.target.id === 'lightbox-img') lbRoot.style.display = 'none';
	  });
	};
}
return {computeHeaderOffset,applyHeaderOffset,smoothScrollToElTop,bindHeader,bindLightbox};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKPageControls={create};
})(typeof window!=='undefined'?window:null);
