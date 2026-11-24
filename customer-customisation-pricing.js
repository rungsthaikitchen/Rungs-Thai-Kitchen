(function(root){
'use strict';
function create(context){
const {document}=context;
function sumExtras() {
  return context.selectedExtras.reduce((s, e) => s + (e.delta || 0), 0);
}
function buildExtraChips() {
  // No extras for this item/category → hide the whole block
  if (!context.currentAllowExtras || !context.extrasWrap || !context.extrasEl) {
    if (context.extrasWrap) context.extrasWrap.style.display = 'none';
    return;
  }

  context.extrasWrap.style.display = 'block';
  context.extrasEl.innerHTML = '';

  // Decide which extras to show:
  // - if currentAllowExtras is an array → only those IDs
  // - otherwise → show all EXTRAS (current behaviour)
  let extrasToRender = context.EXTRAS;

  if (Array.isArray(context.currentAllowExtras)) {
    extrasToRender = context.EXTRAS.filter(opt =>
      context.currentAllowExtras.includes(opt.id)
    );

    // If filter removes everything, hide the block
    if (extrasToRender.length === 0) {
      context.extrasWrap.style.display = 'none';
      return;
    }
  }

  extrasToRender.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';

    const isSelected = context.selectedExtras.some(x => x.id === opt.id);
    if (isSelected) btn.classList.add('selected');

    btn.textContent = `${opt.name} ${(0, context.formatCurrency)(opt.delta)}`;

    btn.addEventListener('click', () => {
      // we’ll handle the "only 1 extra" rule in the next section
      handleExtraClick(opt);
    });

    context.extrasEl.appendChild(btn);
  });
}
function handleExtraClick(opt) {
  // If this extra is already selected → deselect it
  const already = context.selectedExtras.findIndex(x => x.id === opt.id);

  if (already >= 0) {
    // clicking again removes the extra
    context.selectedExtras.splice(already, 1);
  } else {
    // Only allow ONE extra → replace the array with just this option
    context.selectedExtras = [{ ...opt }];
  }

  // Rebuild UI + refresh price
  buildExtraChips();
  updateUnitPricePreview();
}
function updateUnitPricePreview(){
  const base = Number(context.modalBase.dataset.price) || 0;

  // existing modifiers total…
  let modsTotal = 0;
  context.selectedMods.forEach(id => {
    const m = context.MODIFIERS.find(x => x.id === id);
    if (m) modsTotal += m.delta;
  });

  // extras total (only if allowed)
  let extrasTotal = 0;
  if (context.currentAllowExtras) {
    extrasTotal = context.selectedExtras.reduce((s,e)=> s + (e.delta || 0), 0);
  }

  const total = (0, context.roundToTwo)(base + modsTotal + extrasTotal);
  context.unitPriceEl.textContent = (0, context.formatCurrency)(total);
}
return {sumExtras,buildExtraChips,handleExtraClick,updateUnitPricePreview};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCustomisationPricing=api;
})(typeof window==='undefined'?null:window);
