(function(root){
'use strict';
function create(context){
const {document,window}=context;
function bindCustomiseEarly(){
	(function bindCustomiseClicks() {
	  const container = document.getElementById('menu-list');
	  if (!container || container.dataset.customBound) return;

	  container.addEventListener('click', (e) => {
		// works for either a button or the whole card if we later add data-id there
		const btn = e.target.closest('[data-id]');
		if (!btn) return;

		const id = btn.getAttribute('data-id');
		if (!id) return;

		// call our canonical opener
		if (typeof (0, context.openCustomise) === 'function') {
		  (0, context.openCustomise)(id);
		} else if (typeof window.openCustomise === 'function') {
		  window.openCustomise(id);
		}
	  });

	  container.dataset.customBound = '1';
	})();
}

function bindEscape(){
		document.addEventListener('keydown', (e) => {
	  if (e.key === 'Escape') {
		if (typeof (0, context.closeModal) === 'function' && context.modal?.style.display === 'flex') {
		  e.preventDefault?.();
		  (0, context.closeModal)();
		}
		if (typeof (0, context.closeCheckout) === 'function' && context.checkoutModal?.style.display === 'flex') (0, context.closeCheckout)();
		if (typeof (0, context.hideOrderSuccess) === 'function') (0, context.hideOrderSuccess)();
	  }
	});
}

function bindCustomiseLate(){
	const menuListEl = document.getElementById('menu-list');

	if (menuListEl) {
	  menuListEl.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-id]');
		if (!btn) return;

		const id = btn.dataset.id;
		// just open customise – do NOT close menu
		(0, context.openCustomise)(id);
	  });
	}
}
return {bindCustomiseEarly,bindEscape,bindCustomiseLate};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKCustomerInteractions={create};
})(typeof window!=='undefined'?window:null);
