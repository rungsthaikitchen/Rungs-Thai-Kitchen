(function(root){
'use strict';
function create(context){
const {document}=context;
function buildModifierChips(allowed, required=false, multi=false, max=null){
      context.modsEl.innerHTML = '';
      context.selectedMods.clear();
      context.currentAllowedMods = Array.isArray(allowed) && allowed.length ? allowed.slice() : null;
      context.currentRequires = !!required;
      context.currentMulti = !!multi || (typeof max === 'number' && max > 0);
      context.currentMax = (typeof max === 'number' && max > 0) ? max : null;

      if(context.currentRequires && context.currentAllowedMods){ context.modRequiredNote.style.display = 'block'; context.modalAdd.disabled = true; }
      else { context.modRequiredNote.style.display = 'none'; context.modalAdd.disabled = false; }

      if(context.currentMulti && context.currentMax){ context.modLimitNote.style.display = 'block'; context.modLimitNote.textContent = `Choose up to ${context.currentMax} options`; }
      else { context.modLimitNote.style.display = 'none'; }

      if(!context.currentAllowedMods){ context.modsEl.style.display = 'none'; return; }
      context.modsEl.style.display = 'flex';

      context.MODIFIERS.forEach(m => {
        if(!context.currentAllowedMods.includes(m.id)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.innerHTML = `${m.name}${m.delta ? ` (+${(0, context.formatCurrency)(m.delta)})` : ''}`;
        btn.dataset.id = m.id;

        btn.addEventListener('click', () => {
          if(context.currentMulti){
            if(context.selectedMods.has(m.id)){
              context.selectedMods.delete(m.id);
              btn.classList.remove('selected');
            } else {
              if(context.currentMax && context.selectedMods.size >= context.currentMax){
                btn.animate([{transform:'translateY(-2px)'},{transform:'translateY(0)'}],{duration:140});
                return;
              }
              context.selectedMods.add(m.id);
              btn.classList.add('selected');
            }
            if(context.currentRequires) context.modalAdd.disabled = (context.selectedMods.size === 0);
            if(context.currentMax && context.currentMulti){ context.modLimitNote.textContent = `Selected ${context.selectedMods.size}/${context.currentMax}`; }
          } else {
            if(context.selectedMods.has(m.id)){
              context.selectedMods.delete(m.id);
              btn.classList.remove('selected');
            } else {
              context.selectedMods.clear();
              context.modsEl.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
              context.selectedMods.add(m.id);
              btn.classList.add('selected');
            }
            if(context.currentRequires) context.modalAdd.disabled = (context.selectedMods.size === 0);
          }
          (0, context.updateUnitPricePreview)();
        });

        context.modsEl.appendChild(btn);
      });
    }
function buildSpiceSelector(enabled, defaultLevel=0, minimumLevel=0, note=''){
      let spiceNote = document.getElementById('spice-note');
      if (!spiceNote) {
        spiceNote = document.createElement('div');
        spiceNote.id = 'spice-note';
        spiceNote.className = 'small';
        context.spiceWrap.appendChild(spiceNote);
      }
      spiceNote.textContent = enabled ? note || '' : '';
      spiceNote.hidden = !enabled || !note;
      if(!enabled){
        context.spiceWrap.style.display = 'none';
        context.spiceButtons.innerHTML = '';
        context.currentSpice = null;
        return;
      }
      context.spiceWrap.style.display = 'block';
      context.spiceButtons.innerHTML = '';
      const minimum = Math.max(0, Math.min(3, Number(minimumLevel)||0));
      context.currentSpice = Math.max(minimum, Math.min(3, Number(defaultLevel)||0));

      const labels = [
        {v:0, text:'No spice'},
        {v:1, text:'Mild 🌶️'},
        {v:2, text:'Medium 🌶️🌶️'},
        {v:3, text:'Very spicy 🌶️🌶️🌶️'}
      ];
      labels.filter(l => l.v >= minimum).forEach(l=>{
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'spice-btn' + (l.v===context.currentSpice ? ' active':'');
        b.textContent = l.text;
        b.setAttribute('aria-pressed', l.v===context.currentSpice ? 'true':'false');
        b.addEventListener('click', ()=>{
          context.currentSpice = l.v;
          [...context.spiceButtons.querySelectorAll('.spice-btn')].forEach(x=>{
            x.classList.remove('active'); x.setAttribute('aria-pressed','false');
          });
          b.classList.add('active'); b.setAttribute('aria-pressed','true');
        });
        context.spiceButtons.appendChild(b);
      });
    }
return {buildModifierChips,buildSpiceSelector};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCustomisationSelectors=api;
})(typeof window==='undefined'?null:window);
