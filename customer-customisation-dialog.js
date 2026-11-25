(function(root){
'use strict';
function create(context){
const {document,window,console}=context;
function openCustomiseById(itemId) {
  const item = window.ITEMS_BY_ID.get(String(itemId));
  if (!item || !context.modal) {
    console.warn('openCustomiseById: item not found', itemId);
    return;
  }

  context.currentItem = item;
  context.selectedMods.clear();
  context.selectedExtras = [];

	  // NEW: per-item extras control
if (Array.isArray(item.allowedExtras)) {
  context.currentAllowExtras = item.allowedExtras;        // [] means no extras
} else {
  context.currentAllowExtras = !!item.categoryAllowedExtras; // existing behaviour
}

	  const allowed  = Array.isArray(item.allowedModifiers) ? item.allowedModifiers : null;
	  const requires = !!item.modifierRequired;
	  const isMulti  = !!item.modifierMax || !!item.modifiersMulti;
	  const max      = (typeof item.modifierMax === 'number' && item.modifierMax > 0)
		? item.modifierMax
		: null;

	  (0, context.buildModifierChips)(allowed, requires, isMulti, max);
	  (0, context.buildExtraChips)();
	  context.modalTitle.textContent = `Customise — ${item.name}`;
	  context.modalBase.dataset.price = item.price;
	  context.modalBase.textContent   = `Base price: ${(0, context.formatCurrency)(item.price)}`;
	  context.qtyInput.value = 1;
	  (0, context.updateUnitPricePreview)();

	  if (context.modalImg) {
		if (item.img) {
		  context.modalImg.src = item.img;
		  context.modalImg.style.display = 'block';
		} else {
		  context.modalImg.removeAttribute('src');
		  context.modalImg.style.display = 'none';
		}
	  }

	  if (item.allergens && item.allergens.length) {
		context.modalAll.innerHTML = (0, context.renderAllergenBadges)(item.allergens);
		context.modalAllWrap.style.display = 'block';
	  } else {
		context.modalAll.innerHTML = '';
		context.modalAllWrap.style.display = 'none';
	  }

	  const defaultSpice = (typeof item.spiceDefault === 'number') ? item.spiceDefault : 0;
	  (0, context.buildSpiceSelector)(!!item.spiceEnabled, defaultSpice, item.spiceMin, item.spiceNote);

	  context.modal.style.display = 'flex';
	}

function closeModal(){
      context.modal.style.display = 'none';
      context.currentItem = null;
      context.selectedMods.clear();
      context.currentAllowedMods = null;
      if (context.modalImg){ context.modalImg.removeAttribute('src'); context.modalImg.style.display = 'none'; }
      (0, context.buildSpiceSelector)(false);
    }

function bindControls(){
		document.getElementById('qty-incr').addEventListener('click', ()=>{ context.qtyInput.value = Math.max(1, parseInt(context.qtyInput.value || '1') + 1); });
		document.getElementById('qty-decr').addEventListener('click', ()=>{ context.qtyInput.value = Math.max(1, parseInt(context.qtyInput.value || '1') - 1); });

		document.getElementById('modal-close').addEventListener('click', closeModal);
		document.getElementById('modal-cancel').addEventListener('click', closeModal);
		context.modal.addEventListener('click', (ev) => { if(ev.target === context.modal) closeModal(); });

		document.getElementById('modal-add').addEventListener('click', () => {
	  // … your existing checks …

	  const base = Number(context.modalBase.dataset.price) || 0;

	  let modsTotal = 0;
	  const modsArr = [];
	  context.selectedMods.forEach(id => {
		const m = context.MODIFIERS.find(x => x.id === id);
		if (m) { modsTotal += m.delta; modsArr.push(m); }
	  });

	  const extrasArr = context.currentAllowExtras
		? context.selectedExtras.map(e => ({ id:e.id, name:e.name, delta:e.delta, type:'extra' }))
		: [];

	  const extrasTotal = context.currentAllowExtras
		? context.selectedExtras.reduce((s,e)=> s + (e.delta || 0), 0)
		: 0;

	  const unitPrice = (0, context.roundToTwo)(base + modsTotal + extrasTotal);
	  const qty = Math.max(1, parseInt(context.qtyInput.value || '1'));
	  
	const item = context.currentItem;
	if (!item) {
	  console.error('[Customise] No currentItem set — modal opened without selecting an item');
	  return;
	}
	const itemId = item.id;

	  context.basket.push({
		name: item.name,
		itemId: item.id,
		mods: [...modsArr, ...extrasArr],   // put extras in mods for downstream reuse
		unitPrice,
		qty,
		img: item.img || '',
		spice: context.currentSpice ?? null
	  });

	  closeModal();
	  (0, context.renderOrder)();
	  (0, context.refreshAppliedDiscountCode)();
	});

}
return {openCustomiseById,closeModal,bindControls};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKCustomisationDialog={create};
})(typeof window!=='undefined'?window:null);
