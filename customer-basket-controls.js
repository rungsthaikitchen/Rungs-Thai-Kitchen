(function(root){
'use strict';
function create(context){
const {window,document,CustomEvent}=context;
function renderOrder(){
  window.dispatchEvent(new CustomEvent('rtk:basket-changed'));
  const orderListEl  = document.getElementById('order-list');
  const orderTotalEl = document.getElementById('order-total');

		  orderListEl.innerHTML = '';

		  if (context.basket.length === 0){
			orderListEl.innerHTML = '<div class="muted small">No items yet — add something from the menu.</div>';
			orderTotalEl.textContent = (0, context.formatCurrency)(0);
			return;
		  }

		  context.basket.forEach((row, idx) => {
			const r = document.createElement('div');
			r.className = 'order-row';

			const leftWrap = document.createElement('div');
			leftWrap.style.display = 'flex';
			leftWrap.style.alignItems = 'center';
			leftWrap.style.gap = '10px';

			const img = document.createElement('img');
			img.className = 'item-thumb';
			img.alt = row.name;
			img.loading = 'lazy';
			img.src = (row.img && row.img.trim())
			  ? row.img
			  : 'data:image/svg+xml;utf8,' + encodeURIComponent(
				`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
				   <rect width="100%" height="100%" fill="#f1f1f1"/>
				   <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
						 font-family="sans-serif" font-size="12" fill="#999">No image</text>
				 </svg>`
			  );

			// ✅ HERE: use clean name (no built-in chillies)
			const cleanName = (0, context.nameWithoutChillies)(row.name);

			const details = [];
			if (row.mods && row.mods.length) {
			  details.push(row.mods.map(m => m.name).join(', '));
			}
			if (typeof row.spice === 'number') {
			  details.push((0, context.chilliIcons)(row.spice));
			}

			const text = document.createElement('div');
			text.innerHTML = `
			  <div style="font-weight:700">
				${cleanName}
				${details.length ? ` <span class="muted small">• ${details.join(' • ')}</span>` : ''}
			  </div>
			  <div class="muted small">Unit: ${(0, context.formatCurrency)(row.unitPrice)}</div>
			`;

			const right = document.createElement('div');
			right.style.textAlign = 'right';
			right.innerHTML = `
			  <div style="font-weight:800">${(0, context.formatCurrency)((0, context.roundToTwo)(row.unitPrice * row.qty))}</div>
			  <div style="margin-top:8px;display:flex;gap:8px;align-items:center;justify-content:flex-end">
				<button class="btn btn-ghost" data-action="dec" data-idx="${idx}">-</button>
				<div class="muted">${row.qty}</div>
				<button class="btn btn-ghost" data-action="inc" data-idx="${idx}">+</button>
				<button class="btn" style="background:transparent;color:#b02a2a;border:none;padding:6px 8px" data-action="remove" data-idx="${idx}">Remove</button>
			  </div>
			`;

			leftWrap.appendChild(img);
			leftWrap.appendChild(text);
			r.appendChild(leftWrap);
			r.appendChild(right);
			orderListEl.appendChild(r);
		  });

		  const total = context.basket.reduce((s, i) => s + i.unitPrice * i.qty, 0);
		  orderTotalEl.textContent = (0, context.formatCurrency)((0, context.roundToTwo)(total));
		}
function bindControls(){
document.getElementById('order-panel').addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const idx = Number(btn.dataset.idx);

  if (action === 'inc') {
    context.basket[idx].qty += 1;
    renderOrder();
    await (0, context.refreshAppliedDiscountCode)();
  }

  if (action === 'dec') {
    context.basket[idx].qty = Math.max(1, context.basket[idx].qty - 1);
    renderOrder();
    await (0, context.refreshAppliedDiscountCode)();
  }

  if (action === 'remove') {
    context.basket.splice(idx, 1);
    renderOrder();
    await (0, context.refreshAppliedDiscountCode)();
  }
});
}
function restoreReviewedBasket(items){
  if(context.basket.length&&!(0, context.confirm)('Replace your current basket with the basket reviewed by the restaurant?'))return false;
  const restored=items.map(line=>({itemId:line.item_id,name:line.name,mods:line.modifiers,
   unitPrice:line.unit_price,qty:line.qty,img:line.img||'',spice:line.spice,item_note:line.item_note}));
  context.basket.splice(0,context.basket.length,...restored);(0, context.renderOrder)();return true;
}
return {renderOrder,bindControls,restoreReviewedBasket};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKBasketControls=api;
})(typeof window==='undefined'?null:window);
