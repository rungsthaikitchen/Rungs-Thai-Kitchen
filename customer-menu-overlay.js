(function(root){
'use strict';
function create(context){
const {document,window,alert}=context;
function openMenuOverlay() {
	  if (!context.menuOverlay) return;
	  context.menuOverlay.classList.add('show');
	  context.menuOverlay.setAttribute('aria-hidden', 'false');
	  document.body.style.overflow = 'hidden';   // stop background scroll
	  document.body.classList.add('menu-open');  // 👈 NEW: flag that menu is open
	}


function closeMenuOverlay() {
	  if (!context.menuOverlay) return;
	  context.menuOverlay.classList.remove('show');
	  context.menuOverlay.setAttribute('aria-hidden', 'true');
	  document.body.style.overflow = '';
	  document.body.classList.remove('menu-open'); // 👈 NEW: remove flag
	}


function bindEarly(){
// Header nav "Menu" link
if (context.menuLink) {
  context.menuLink.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

// Floating FAB "Menu" button
if (context.menuFab) {
  context.menuFab.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

if (context.menuFab) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      context.menuFab.classList.remove('hidden');
    } else {
      context.menuFab.classList.add('hidden');
    }
  });
}

// Close X in overlay
if (context.menuClose) {
  context.menuClose.addEventListener('click', closeMenuOverlay);
}

// Click outside sheet closes
if (context.menuOverlay) {
  context.menuOverlay.addEventListener('click', (e) => {
    if (e.target === context.menuOverlay) closeMenuOverlay();
  });
}

// Proceed to checkout button in overlay
if (context.menuCheckoutBtn) {
  context.menuCheckoutBtn.addEventListener('click', () => {
    if (!context.basket || context.basket.length === 0) {
      alert('Please add at least one dish before proceeding to checkout.');
      return;
    }

    // close the menu overlay
    closeMenuOverlay();

    // compute subtotal from basket and open checkout
    const subtotal = context.basket.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0
    );
    (0, context.openCheckout)(subtotal);
  });
}

// ESC key closes popup too
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && context.menuOverlay?.classList.contains('show')) {
    closeMenuOverlay();
  }
});
}

function bindLate(){
	  if (context.menuLink) {
		context.menuLink.addEventListener('click', (e) => {
		  e.preventDefault();
		  openMenuOverlay();
		});
	  }

	  if (context.menuClose) {
		context.menuClose.addEventListener('click', () => {
		  closeMenuOverlay();
		});
	  }

	  if (context.menuOverlay) {
		// click outside the inner card closes
		context.menuOverlay.addEventListener('click', (e) => {
		  if (e.target === context.menuOverlay) closeMenuOverlay();
		});
	  }

	  // ESC key closes popup too
	  document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && context.menuOverlay?.classList.contains('show')) {
		  closeMenuOverlay();
		}
	  });

}
return {openMenuOverlay,closeMenuOverlay,bindEarly,bindLate};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKMenuOverlay={create};
})(typeof window!=='undefined'?window:null);
