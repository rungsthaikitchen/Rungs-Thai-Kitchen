(function(root){
'use strict';
function create(context){
const {window,document}=context;
function buildMenu() {
  const container = document.getElementById('menu-list');
  if (!container) return;

  container.innerHTML = '';

context.MENU_CATEGORIES.forEach(cat => {
  // outer wrapper per category
  const catSection = document.createElement('section');
  catSection.className = 'popup-category';

  // category heading
  const h = document.createElement('h3');
  h.className = 'popup-category-title';
  h.textContent = cat.title;
  catSection.appendChild(h);

  // 2-column grid for this category’s items
  const grid = document.createElement('div');
  grid.className = 'popup-items-grid';

  const categoryAllowExtras = !!cat.allowExtras;

  const sortedItems = [...cat.items].sort((a, b) => {
  if (a.badge && !b.badge) return -1;
  if (!a.badge && b.badge) return 1;
  return 0;
});

sortedItems.forEach(item => {
    // enrich + store for customise logic
    window.ITEMS_BY_ID.set(item.id, {
  ...item,
  categoryAllowedExtras: categoryAllowExtras,
  categoryTitle: cat.title
});

    // item card
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.dataset.id = item.id;
    card.dataset.price = item.price;
    card.dataset.allowExtras = categoryAllowExtras ? '1' : '0';

    if (item.allowedModifiers) card.dataset.allowedModifiers = item.allowedModifiers.join(',');
    if (item.modifierRequired) card.dataset.modifierRequired = 'true';
    if (item.modifiersMulti)   card.dataset.modifiersMulti   = 'true';
    if (item.modifierMax)      card.dataset.modifierMax      = String(item.modifierMax);
    if (item.img)              card.dataset.img              = item.img;
    if (item.spiceEnabled)     card.dataset.spiceEnabled     = 'true';
    if (typeof item.spiceDefault === 'number') {
      card.dataset.spiceDefault = String(item.spiceDefault);
    }

    const allergenHTML = (0, context.renderAllergenIconsCompact)(item.allergens || []);

    // small thumbnail if available
    const thumbHTML = item.img
      ? `
        <div class="menu-card-thumb-wrap">
          <img src="${item.img}" alt="${item.name}">
        </div>
      `
      : '';

// ⭐ Badge handling
let badgeHTML = '';

if (item.badge === 'chef-special') {
  badgeHTML = `<div class="special-badge">⭐ Chef's Special</div>`;
  card.classList.add('menu-item-featured');
}
else if (item.badge === 'new') {
  badgeHTML = `<div class="special-badge">🆕 New Dish</div>`;
  card.classList.add('menu-item-featured');
}
else if (item.badge === 'popular') {
  badgeHTML = `<div class="special-badge popular">🔥 Popular</div>`;
}

    card.innerHTML = `
  ${thumbHTML}
  <div class="menu-card-main">
    ${badgeHTML}
    <div class="menu-card-title">${item.name}</div>
    <div class="menu-card-desc muted small">${item.desc || ''}</div>
    ${allergenHTML}
    <div class="menu-card-bottom">
      <div class="price">${(0, context.formatCurrency)(item.price)}</div>
      <button class="btn btn-accent" type="button" data-id="${item.id}">
        customise
      </button>
    </div>
  </div>
`;

    grid.appendChild(card);
  });

  catSection.appendChild(grid);
  container.appendChild(catSection);
});

// ✅ make sure customise buttons still work (one delegated handler)
if (!container.dataset.bound) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    (0, context.openCustomise)(btn.getAttribute('data-id'));
  });
  container.dataset.bound = '1';
}

}
function filterMenu(query) {
	  const q = (query || '').trim().toLowerCase();
	  const sections = document.querySelectorAll('#menu-list .popup-category');

	  if (!q) {
		// reset: show all categories & items
		sections.forEach(sec => {
		  sec.style.display = '';
		  sec.querySelectorAll('.menu-item-card').forEach(card => {
			card.style.display = '';
		  });
		});
		return;
	  }

	  sections.forEach(sec => {
		let anyVisible = false;

		sec.querySelectorAll('.menu-item-card').forEach(card => {
		  const text = card.dataset.searchText || card.textContent.toLowerCase();
		  const match = text.includes(q);
		  card.style.display = match ? '' : 'none';
		  if (match) anyVisible = true;
		});

		// hide category completely if none of its items match
		sec.style.display = anyVisible ? '' : 'none';
	  });
	}
function bindSearch(){
	const menuSearchInput = document.getElementById('menu-search');
	if (menuSearchInput) {
	  menuSearchInput.addEventListener('input', () => {
		filterMenu(menuSearchInput.value);
	  });
	}

	const searchInput = document.getElementById('menu-search-input');

	if (searchInput) {
	  searchInput.addEventListener('input', () => {
		const term = searchInput.value.trim().toLowerCase();

		// every dish card in the popup
		const cards = document.querySelectorAll('#menu-list .menu-item-card');

		cards.forEach(card => {
		  const text = (card.textContent || '').toLowerCase();
		  // show card if its text contains the search term
		  if (!term || text.includes(term)) {
			card.style.display = '';
		  } else {
			card.style.display = 'none';
		  }
		});
	  });
	}
}
return {buildMenu,filterMenu,bindSearch};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKMenuRendering=api;
})(typeof window==='undefined'?null:window);
