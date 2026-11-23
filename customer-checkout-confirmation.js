(function(root){
'use strict';
function install({window, document, alert, console}){
		// --- Success popup renderer (with Download PDF) ---
		window.__lastOrderForPdf = null;
		
		// helper: strip any 🌶️ from item names so we only show user's chosen level
		function stripChillies(str) {
		  return (str || '').replace(/🌶️+/g, '').replace(/\s{2,}/g, ' ').trim();
		}


		window.showOrderSuccessNew = function (summary, items, preferredTimeStr) {
		  const wrap     = document.getElementById('order-success');
		  const titleEl  = document.getElementById('order-success-title');
		  const msgEl    = document.getElementById('order-success-msg');
		  const listEl   = document.getElementById('order-success-items');
		  const totalEl  = document.getElementById('order-success-total');

		  if (!wrap) {
			alert(`Order placed! ${summary?.ref || ''}`);
			return;
		  }

		  // header
		  if (titleEl) {
			titleEl.textContent = `${summary.holdingReviewRequired ? 'Order received' : 'Order confirmed'} — ${summary.ref}`;
		  }

		  // note
		  if (msgEl) {
			const suffix = summary.orderType === 'delivery' ? 'delivery' : 'collection';
			const note = preferredTimeStr
			  ? `Thanks! We’ll contact you to confirm your ${suffix} time (${preferredTimeStr}).`
			  : `Thanks! We’ll contact you to confirm your ${suffix} time.`;
			msgEl.textContent = note;
		  }

		  // items
		  if (listEl) {
			listEl.innerHTML = items.map((row) => {
	  const cleanName = stripChillies(row.name);
	  const hasMods  = row.mods && row.mods.length;
	  const hasSpice = typeof row.spice === 'number';
	  const spiceStr = hasSpice ? ' ' + '🌶️'.repeat(Math.max(0, Math.min(3, row.spice))) : '';
	  return `
		<div style="padding:6px 0;border-bottom:1px dashed #eee">
		  ${row.qty} × ${cleanName}
		  ${hasMods ? `<span class="muted small"> • ${row.mods.map(m => m.name).join(', ')}</span>` : ''}
		  ${spiceStr}
		  <div class="muted small">Line: ${window.formatCurrency(row.qty * row.unitPrice)}</div>
		</div>
	  `;
	}).join('');

		  }

		  // total
		  if (totalEl) {
			totalEl.textContent = window.formatCurrency(summary.total);
		  }
		  
		    // hook up the "Download receipt" button
  const dlBtn = document.getElementById('order-success-download');
  if (dlBtn) {
    dlBtn.onclick = () => {
      // make it loud so we see it even if console is filtered
      console.error('[Receipt] download clicked', items);
      if (typeof window.downloadReceipt === 'function') {
        window.downloadReceiptPlain(summary, items, preferredTimeStr);
      }
    };
  }


		  // ✅ store for PDF generation
		  window.__lastOrderForPdf = { summary, items, preferredTimeStr };

		  wrap.style.display = 'flex';
		};


return {stripChillies};
}
const api={install};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCheckoutConfirmation=api;
})(typeof window==='undefined'?null:window);
