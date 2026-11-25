(function(root){
'use strict';
function create(context){
const {document,window,alert,console,MutationObserver,setTimeout,formatCurrency}=context;
function install(){
	// ---------- Success popup (matches #order-success in HTML) ----------
	const orderSuccess      = document.getElementById('order-success');
	const orderSuccessX     = document.getElementById('order-success-x');
	const orderSuccessClose = document.getElementById('order-success-close');

	function showOrderSuccessNew(summary, items, preferredTimeStr) {
  if (!orderSuccess) {
    alert(`Order placed! ${summary?.ref || ''}`);
    return;
  }
  
			  // ✅ Store last order data so "Download receipt" works
			window.__lastOrderReceipt = {
			  summary: summary || {},
			  items: items || [],
			  preferredTimeStr: preferredTimeStr || ''
			};


  // Use the same totals logic as checkout (discount + correct delivery rule)
		const successTotals = window.__lastOrderTotals || window.__checkoutTotals || {};


  // 1) header
  const titleEl = document.getElementById('order-success-title');
  if (titleEl) {
    titleEl.textContent = `${summary?.holdingReviewRequired ? 'Order received' : 'Order confirmed'} — ${summary?.ref || ''}`;
  }

    // 2) message
  const msgEl = document.getElementById('order-success-msg');
  if (msgEl) {
    const suffix = (summary?.orderType === 'delivery') ? 'delivery' : 'collection';
    const note = preferredTimeStr
      ? `Thanks! We’ll contact you to confirm your ${suffix} time (${preferredTimeStr}).`
      : `Thanks! We’ll contact you to confirm your ${suffix}.`;
    msgEl.textContent = note;
  }

  // 2b) order type + time check
  const typeEl = document.getElementById('order-success-type');
  const timeEl = document.getElementById('order-success-time');

  if (typeEl) {
    typeEl.textContent = (summary?.orderType === 'delivery') ? 'Delivery' : 'Collection';
  }

  if (timeEl) {
    timeEl.textContent = preferredTimeStr || 'To be confirmed';
  }

  // 3) items
  const listEl = document.getElementById('order-success-items');
  if (listEl) {
    listEl.innerHTML = '';
    (items || []).forEach(row => {
      const details = [];
      if (row.mods?.length) details.push(row.mods.map(m => m.name).join(', '));
      if (typeof row.spice === 'number') details.push('🌶️'.repeat(row.spice));

      const div = document.createElement('div');
      div.style.padding = '6px 0';
      div.style.borderBottom = '1px dashed #eee';
      div.innerHTML = `
        ${row.qty} × ${row.name}
        ${details.length ? ` <span class="muted small">• ${details.join(' • ')}</span>` : ''}
      `;
      listEl.appendChild(div);
    });
  }

			  // 4) total (force numeric; no undefined fallbacks)
				const totalEl = document.getElementById('order-success-total');
				if (totalEl) {
				  const t = window.__lastOrderTotals || window.__checkoutTotals || {};
				  const finalTotal = Number(t.total);

				  const safeTotal = Number.isFinite(finalTotal)
					? finalTotal
					: Number(summary?.total || 0);

				  totalEl.textContent = formatCurrency(safeTotal);

				  // DEBUG: watch for anything that changes the total after we set it
					if (!window.__watchingSuccessTotal) {
					  window.__watchingSuccessTotal = true;

					  const el = document.getElementById('order-success-total');
					  if (el) {
						const obs = new MutationObserver(() => {
						  console.log('[SUCCESS TOTAL MUTATION] now =', el.textContent);
						  console.trace('[SUCCESS TOTAL MUTATION TRACE]');
						});
						obs.observe(el, { childList: true, characterData: true, subtree: true });
					  }
					}

				}
				// 🔒 Force-correct total AFTER popup is rendered
					setTimeout(() => {
					  const t = window.__lastOrderTotals || {};
					  const el = document.getElementById('order-success-total');
					  if (el && typeof t.total === 'number') {
						el.textContent = formatCurrency(t.total);
					  }
					}, 0);

  orderSuccess.style.display = 'flex';
}


	// close buttons
	if (orderSuccessX)     orderSuccessX.addEventListener('click', () => orderSuccess.style.display = 'none');
	if (orderSuccessClose) orderSuccessClose.addEventListener('click', () => orderSuccess.style.display = 'none');
	if (orderSuccess) {
	  orderSuccess.addEventListener('click', (e) => {
		if (e.target === orderSuccess) orderSuccess.style.display = 'none';
	  });
	}


	// make it available to the second script
	window.showOrderSuccessNew = showOrderSuccessNew;


	
		// ----  (pure front-end) ----

	(function(){
	  const wrap  = document.getElementById('order-success');
	  const title = document.getElementById('order-success-title');
	  const msg   = document.getElementById('order-success-msg');
	  const list  = document.getElementById('order-success-items');
	  const totalEl = document.getElementById('order-success-total');
	  const btnClose = document.getElementById('order-success-close');
	  const btnX     = document.getElementById('order-success-x');

	  function hide() {
		if (wrap) wrap.style.display = 'none';
	  }

	  // expose a global helper we can call later (kept for backwards compatibility)
	function showOrderSuccess(orderId, items, total, orderType, preferredTime, holdingReviewRequired = false) {
	  // If the new-style function exists, delegate to it
	  if (typeof window.showOrderSuccessNew === 'function') {
		window.showOrderSuccessNew(
		  {
			// if checkout already passed "RTK-012", keep it;
			// if it passed just "012", add RTK-
			ref: (typeof orderId === 'string' && orderId.startsWith('RTK-'))
			  ? orderId
			  : `RTK-${orderId}`,
			subtotal: 0,
			delivery: 0,
			total: total || 0,
			orderType: orderType || 'collection',
            holdingReviewRequired: holdingReviewRequired === true
		  },
		  items || [],
		  preferredTime || null
		);
		return;
	  }
	  

	  // Fallback if the new function isn’t there
	  alert(
		(typeof orderId === 'string' ? orderId : `RTK-${orderId}`) ||
		'Order placed!'
	  );
	}


	  if (btnClose) btnClose.addEventListener('click', hide);
	  if (btnX)     btnX.addEventListener('click', hide);
	  if (wrap)     wrap.addEventListener('click', e => {
		if (e.target === wrap) hide();
	  });

	  // make available to other scripts
	  window.showOrderSuccess = showOrderSuccess;
	})();



}
return {install};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKOrderSuccessCompat={create};
})(typeof window!=='undefined'?window:null);
