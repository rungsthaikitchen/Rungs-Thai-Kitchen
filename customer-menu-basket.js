
  var DELIVERY_FREE_THRESHOLD = 30;
  function getSelectedOrderType() {
  const selected = document.querySelector('input[name="order-type"]:checked');
  return selected ? selected.value : "collection";
}

	document.addEventListener('DOMContentLoaded', () => {
	
	// ---------- Allergen registry ----------
  const ALLERGENS = {

      peanuts:   { icon:'🥜',        label:'Peanuts' },
      tree_nuts: { icon:'🌰',        label:'Tree Nuts' },
      gluten:    { icon:'🌾',        label:'Gluten (Cereals)' },
      shellfish: { icon:'🦐',        label:'Crustaceans (Shellfish)' },
      molluscs:  { icon:'🦪',        label:'Molluscs' },
      dairy:     { icon:'🥛',        label:'Milk / Dairy' },
      egg:       { icon:'🍳',        label:'Egg' },
      fish:      { icon:'🐟',        label:'Fish' },
      celery:    { icon:'🌿',        label:'Celery' },
      lupin:     { icon:'🌼',        label:'Lupin' },
      mustard:   { icon:'&#x1F331;', label:'Mustard' },
      sesame:    { icon:'⚫',        label:'Sesame Seeds' },
      soya:      { icon:'🫘',        label:'Soya' },
      sulphites: { icon:'💨',        label:'Sulphur Dioxide / Sulphites' },
      spicy:     { icon:'🌶️',       label:'Spicy (heat)' }
    };
    function normalizeAllergens(list){
      const out = [];
      (list || []).forEach(k => { if (k === 'nuts') out.push('peanuts','tree_nuts'); else out.push(k); });
      return [...new Set(out)];
    }
    function renderAllergenIconsCompact(list){
      const normalized = normalizeAllergens(list);
      if(!normalized.length) return '';
      const spans = normalized.map(key => {
        const a = ALLERGENS[key]; if(!a) return '';
        return `<span class="allergen-icon" title="${a.label}" aria-label="${a.label}">${a.icon}</span>`;
      }).join(' ');
      return `<div class="muted small">${spans}</div>`;
    }
    function renderAllergenBadges(list){
      const normalized = normalizeAllergens(list);
      if(!normalized.length) return '';
      return normalized.map(key => {
        const a = ALLERGENS[key]; if(!a) return '';
        return `<span class="allergen-badge" title="${a.label}" aria-label="${a.label}">
                 <span class="allergen-icon">${a.icon}</span><span>${a.label}</span>
               </span>`;
      }).join('');
    }
	
	// Paid EXTRAS (per dish)
const EXTRAS = [
  { id:'extra-chicken', name:'Extra Chicken', delta: 2.00 },
  { id:'extra-beef',    name:'Extra Beef',    delta: 2.50 },
  { id:'extra-pork',    name:'Extra Pork',    delta: 2.50 },
  { id:'extra-prawn',   name:'Extra Prawn',   delta: 3.00 },
  { id:'extra-tofu',    name:'Extra Tofu',    delta: 1.50 },
  { id:'extra-veg',     name:'Extra Vegetable', delta: 1.50 },
  { id:'extra-bchicken', name:'Extra Battered Chicken', delta: 2.50 },
  { id:'extra-egg', name:'Fried Egg', delta: 1.00 },
];

	
    // ---------- Data ----------
    const MENU_CATEGORIES = [
      
	  
	  // { id:'mid-week', title: 'Mid Week Specials (Pre-Order for Wednesday's only)', allowExtras:false, items:[
	  //  { id:'slow-beef-massaman', name: 'Slow Cooked Beef Massaman & Jasmine Rice', desc: 'Braised beef with a delicious, creamy and comforting Massaman curry sauce. Perfect for a mid-week winter treat.', price: 7.50, img: 'images/beefmassaman.jpg'
		//]},
		/*{ id:'mid-week', title: 'Mid-Week Specials (Thursday Only)', allowExtras:false, items:[  
        { id: 'slow-beef-massaman', name: 'Slow Cooked Beef Massaman & Jasmine Rice (Khao Gaeng)', desc: 'Braised beef with a delicious, creamy and comforting Massaman curry sauce. Perfect for a mid-week winter treat.', price: 7.50, img: 'images/beefmassaman.jpg',  allergens: [],special: true,
		badge: 'MID-WEEK SPECIAL'}
		]},*/
	  { id:'starters', title:'Starter', allowExtras:false, items:[
        { id: 'veg-spring-rolls', name: 'Vegetable Spring Rolls (x4)', desc: 'Crispy, deep-fried rolls filled with a savoury mixture of glass noodles and vegetables, served with a sweet chilli sauce.', price: 5.50, img: 'images/SpringRoll.jpg',  allergens: ['gluten', 'soya','mustard','celery'] },
        { id: 'chicken-satay', name: 'Chicken Satay', desc: 'Tender chicken pieces marinated in a fragrant blend of turmeric, lemongrass, and spices. Served with a peanut sauce.', price: 6.50, img: 'images/Satay.jpg', allergens: ['soya','mustard'] },
        { id: 'prawn-crackers', name: 'Prawn Crackers', desc: 'A light and crispy snack made from tapioca flour, shrimp, and seasonings. Served with sweet chilli sauce.', price: 2.50, img: 'images/PrawnCrackers.jpg', allergens: ['shellfish','gluten'] },
        { id: 'moo-ping', name: 'Pork Skewer (Moo Ping)', desc: 'Thai grilled pork skewers marinated in a sweet and savoury sauce.', price: 6.50, img: 'images/mooping.jpg', allergens: ['fish','soya','dairy'] },
        { id: 'chicken-spring-rolls', name: 'Chicken Spring Rolls (x4)', desc: 'Crispy, deep-fried rolls filled with a savoury mixture of meat, glass noodles, and vegetables, served with a sweet chilli sauce.', price: 6.00, img: 'images/SpringRoll.jpg',  allergens: ['gluten', 'soya','molluscs','mustard','celery'] },
        { id: 'fried-tofu', name: 'Deep Fried Tofu', desc: 'Crispy Thai Fried Tofu with a sweet-spicy Thai peanut sauce!', price: 5.00, img: 'images/DeepFriedTofu.jpg', allergens: ['soya','peanuts'] },
        { id: 'fish-cakes', name: 'Thai Fish Cakes', desc: 'Flavourful, bite-sized fritters with a blend of savoury, spicy, and tangy flavours.', price: 6.00, img: 'images/thaifishcakesjpg.jpg',spiceEnabled: true, spiceDefault: 1, allergens: ['fish','egg','gluten'] },
        { id: 'pork-dumplings', name: 'Pork Steamed Dumplings', desc: 'Steamed dumplings filled with tender pork.', price: 6.00, img: 'images/dumplings.jpg', allergens: ['gluten','soya','sesame'] },
        { id: 'fried-prawns', name: 'Deep Fried Tiger Prawns (x4)', desc: 'Tiger Prawns cooked in a crispy tempura batter served with authentic Thai sweet Chilli Sauce.', price: 6.50, img: 'images/Prawns.jpg',  allergens: ['shellfish','gluten'] },
        { id: 'thai-sausage', name: 'Thai Pork Sausage', desc: 'A traditional fermented Thai sausage made with ground pork, sticky rice, and fragrant seasonings. Served with fresh sliced ginger, whole peanuts and slices of cucumber.', price: 6.50, img: 'images/sausage.jpg', allergens: ['peanuts'] },
		/*{ id: 'chicken-panang', name: 'Chicken Paneng Skewers🌶️🌶️', desc: 'A flavorful Thai-inspired dish combining tender chicken marinated in creamy, spicy Panang curry paste, coconut milk, and fish sauce.', price: 6.50, img: 'images/paneng_chicken.jpg', allergens: ['fish','soya'], badge: 'new' },
		{ id: 'grill-chicken', name: 'Grilled Chicken Thigh (Gai Yang)', desc: 'A popular Thai street food dish consisting of marinated chicken thighs (skin-on, bone-in), grilled to a smoky, charred finish and topped with crispy onions', price: 7.50, img: 'images/grill_chicken.jpg', allergens: ['gluten','molluscs','soya'], badge: 'new' },
		{ id: 'salt-wings', name: 'Thai-style Salt & Pepper Chicken Wings', desc: 'Tender, bite-sized pieces of battered chicken, stir-fried with fresh vegetables and chilli in our special sauce.',  price: 7.50, img: 'images/salt-wings.jpeg', allergens: ['soya','gluten','molluscs','sesame'], badge: 'new' },*/
		{ id: 'salt-chicken', name: 'Thai-style Salt & Pepper Crispy Chicken🌶️', desc: 'Tender, bite-sized pieces of battered chicken, stir-fried with fresh vegetables and chilli in our special sauce.',  price: 6.50, img: 'images/salt-chicken.jpeg', spiceEnabled: true, spiceDefault: 1, kitchenLoad: 0, allergens: ['soya','gluten','molluscs'],  badge: 'new' },		
		{ id: 'spare-ribs', name: 'Thai Spare Ribs (Sii Khrong Moo Yang)', desc: 'Tender ribs with a sweet, salty and savoury flavour. Served with a sticky carmelised glaze.', price: 7.50, img: 'images/spareribs.jpg', allergens: ['soya','gluten','molluscs','sesame'] }
      ]},
      { id:'soup', title:'Soup', allowExtras:true, items:[
        { id: 'tom-yum', name: 'Tom Yum Soup 🌶️🌶️', desc: 'A vibrant and aromatic Thai classic featuring a hot and sour clear broth infused with lemongrass, galangal, and kaffir lime leaves.', price: 5.50, img: 'images/TomYum.jpg', allowedModifiers: ['chicken','prawn','tofu','vegetable'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 2, allergens: ['fish','soya','dairy'], allowedExtras: ['extra-chicken','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'tom-kha', name: 'Tom Kha🌶️', desc: 'A creamy and aromatic Thai coconut soup featuring fragrant galangal, lemongrass, and kaffir lime leaves.', price: 5.50, img: 'images/TomKha.jpg', allowedModifiers: ['chicken','prawn','tofu','vegetable'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['fish','soya'], allowedExtras: ['extra-chicken','extra-prawn','extra-tofu','extra-veg'] },
        /*{ id: 'dumpling-broth', name: 'Pork Steamed Dumplings Broth (Gaew Naam)', desc: 'A savoury and flavourful broth with fragrant pork-stuffed wontons.', price: 6.00, img: 'images/GaewNam.jpg', allergens: ['gluten','soya','celery'], allowedExtras: [''] }*/
      ]},
      { id:'salad',    title:'Salad',   allowExtras:true,  items:[
      { id: 'papaya-salad', name: 'Green Papaya Salad (Som Tam)🌶️🌶️🌶️', desc: 'A spicy, savoury, and sweet Thai salad made primarily of shredded green papaya.', price: 7.00, img: 'images/somtam.jpg', spiceEnabled: true, spiceDefault: 3, allergens: ['peanuts','fish'], allowedExtras: ['extra-prawn'] },
        { id: 'beef-salad', name: 'Spicy Beef Salad (Yum Nuea)🌶️🌶️', desc: 'A classic Thai salad with grilled sirloin steak (cooked mediu - please advise in the checkout comments if you would prefer it cooked differently), tossed with crisp vegetables, fresh mint, coriander, and a tangy lime-fish sauce dressing.', price: 9.50, img: 'images/ymbeef.jpg', spiceEnabled: true, spiceDefault: 2, allergens: ['fish','celery','soya'], allowedExtras: ['extra-beef'] },
        //{ id: 'pork-salad', name: 'Grilled Pork Salad (Nam Tok)🌶️', desc: 'This classic North-eastern Thai salad features smoky, charred grilled pork slices tossed with a fiery dressing of lime, fish sauce, and chili flakes.', price: 8.50, img: 'images/porksalad.jpg', spiceEnabled: true, spiceDefault: 1, allergens: ['fish'], allowedExtras: ['extra-pork'] },
		/*{ id: 'mango-salad', name: 'Crispy Chicken with Mango Salad🌶️🌶️', desc: 'A vibrant, contrasting dish featuring golden, crunchy fried chicken, paired with a fresh, zesty salad of fresh  mango, herbs, and chilies.', price: 8.50, img: 'images/mango_salad.jpg', spiceEnabled: true, spiceDefault: 1, allergens: ['gluten','fish','celery','soya'], allowedExtras: ['extra-bchicken'], badge: 'new'  },*/
        { id: 'laab', name: 'Laab🌶️🌶️', desc: 'A vibrant and flavourful meat salad known for its harmony of spicy, sour, salty, and savoury flavours.', price: 7.50, img: 'images/Larb.jpg', allowedModifiers: ['chicken','pork'], spiceEnabled: true, spiceDefault: 2, allergens: ['fish',',soya'], allowedExtras: ['extra-chicken'] }
      ]},
      { id:'curry',    title:'Curry',   allowExtras:true,  items:[
        { id: 'rung-curry', name: 'Chefs Special Rainbow Curry🌶️', desc: 'Chef Rungs special curry. Rich and mildly spiced curry, this is a real crowd pleaser!', price: 8.00, img: 'images/rainbowcurry.jpg',  allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['gluten','celery','mustard'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'green-curry', name: 'Green Curry🌶️🌶️', desc: 'A vibrant green curry sauce with creamy coconut milk, peppers, courgette,green beans and fresh Thai basil.', price: 8.00, allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, img: 'images/greencurry.jpg', spiceEnabled: true, spiceDefault: 2, allergens: [], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'red-curry', name: 'Red Curry🌶️', desc: 'A medium-spiced, savoury, and creamy Thai dish featuring a rich red chili-based paste in coconut milk.', price: 8.00, img: 'images/redcurry.jpg',  allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: [], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'massaman-curry', name: 'Massaman Curry', desc: 'Made with a unique blend of spices like cinnamon and cardamom, combined with coconut milk, potatoes, and peanuts.', price: 8.00, img: 'images/massaman.jpg',  allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1,spiceEnabled: true, spiceDefault: 0, allergens: ['peanuts'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'], badge: 'popular' },
        { id: 'panang-curry', name: 'Paneng Curry🌶️', desc: 'Flavored with a fragrant curry paste that includes lemongrass, galangal, and kaffir lime leaves, this is a rich and creamy curry!', price: 8.00, img: 'images/paneng.jpg', allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1,spiceEnabled: true, spiceDefault: 1, allergens: [], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'], badge: 'popular' }
      ]},
      { id:'stir-fry', title:'Stir Fry',allowExtras:true,  items:[
        { id: 'stir-crispy', name: 'Stir Fried Crispy Chicken (Pad Kra Pao Gai Krob)🌶️🌶️', desc: 'Crispy chicken stir-fried with vegetables, in a spicy Kra Pao sauce', price: 10.00, img: 'images/crispy-chicken.jpeg', spiceEnabled: true, spiceDefault: 2, spiceMin: 1,
		spiceNote: 'This dish contains chilli in the base sauce and cannot be made completely non-spicy.', allergens: ['soya','gluten','molluscs'], allowedExtras: ['extra-bchicken'], badge: 'popular' },
		{ id: 'stir-basil', name: 'Stir Fried Chilli & Basil (Pad Kra Pao)🌶️🌶️', desc: 'Street food classic, its a spicy, savoury Thai stir-fry of usually minced meat with garlic, chilies, and holy basil', price: 8.50, img: 'images/padgrapow_new.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 2, spiceMin: 1,
		spiceNote: 'This dish contains chilli in the base sauce and cannot be made completely non-spicy.', allergens: ['soya','gluten','molluscs'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-tofu','extra-veg','extra-egg'] },
        { id: 'stir-ginger', name: 'Stir Fried Ginger (Pad Khing)🌶️', desc: 'A stir-fried dish flavoured with fresh ginger, spring onions, onions, mushrooms and chilli.', price: 8.00, img: 'images/padkhing.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['soya','gluten','celery','mustard','molluscs'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'stir-cashew', name: 'Stir Fried Cashew Nuts', desc: 'A vibrant and flavorful stir-fry featuring crisp vegetables tossed in a savoury sauce. Finished with the rich, buttery crunch of toasted cashew nuts', price: 8.50, img: 'images/cashew.jpg', allowedModifiers: ['batter-chicken','tofu','vegetable' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['tree_nuts','soya','sesame','celery','mustard','molluscs','shellfish'], allowedExtras: ['extra-bchicken','extra-tofu','extra-veg'] },
        { id: 'stir-sweetsour', name: 'Sweet & Sour (Pad Priew Wan)', desc: 'Thai sweet and sour stir-fry dish featuring vegetables such as cucumber, tomatoes, onions, and bell peppers in a tangy, sweet, and savoury sauce.', price: 8.00, img: 'images/sweetsour.jpg', allowedModifiers: ['batter-chicken','tofu','vegetable' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 0, allergens: ['soya'], allowedExtras: ['extra-bchicken','extra-tofu','extra-veg'] },
        { id: 'stir-yellow', name: 'Stir Fried Yellow Curry (Pad Pong Karee)', desc: 'Thai stir-fry dish made with a flavourful, savoury sauce of yellow curry powder, coconut milk, and egg, mixed with vegetables such as onions, bell peppers, and green onions', price: 8.50, img: 'images/padpong.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['egg','soya','mustard','dairy','molluscs','celery'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'stir-chilli', name: 'Stir Fried Chilli Paste (Pad Nam Prik Pao)🌶️🌶️', desc: 'A medium stir-fry, but dont let the chilli paste alarm you, it is not too spicy!', price: 8.00, img: 'images/padnamprikpao.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 2, allergens: ['soya','fish','gluten','mustard','celery'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'stir-pepper', name: 'Stir Fried Black Pepper Sauce', desc: 'A bold and aromatic Thai-style stir-fry featuring crisp vegetables wok-tossed in a black pepper sauce. ', price: 7.50, img: 'images/blackpepper.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['soya','sesame','mustard'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'salt-chickenchips', name: 'Salt & Pepper Chicken & Chips🌶️', desc: 'Crispy chicken pieces and chunky chips, stir-fried with fresh vegetables and chilli in oyster sauce.', price: 9.00, img: 'images/salt-chickenchips.jpg', modifierRequired: false, allowedExtras: [], spiceEnabled: true, spiceDefault: 1, allergens: ['soya','molluscs','gluten'], badge: 'new' }
      ]},
      { id:'noodles',  title:'Noodles & Rice', allowExtras:true, items:[
        { id: 'pad-thai', name: 'Pad Thai', desc: 'Balanced flavours using tamarind, fish sauce, and palm sugar accompanying bean sprouts, garlic and chives.', price: 8.00, img: 'images/padthai.jpg', allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: false, spiceDefault: 0, allergens: ['egg','fish','peanuts'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'], badge: 'popular' },
		{ id: 'chef-pad-thai', name: 'Chef Rungs Special Pad Thai🌶️🌶️', desc: 'Just like the traditional Pad Thai, but with a little extra heat!', price: 8.00, img: 'images/spicypadthai.jpg', allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 1, allergens: ['egg','fish','peanuts'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },  
		{ id: 'pad-kee-mao', name: 'Pad Kee Mao🌶️🌶️', desc: 'Drunken Noodles is a spicy and savory Thai stir-fried noodle dish. It is made with wide rice noodles and a variety of vegetables, stir-fried with a flavorful sauce made from soy, oyster, and fish sauces, and heavily flavored with fresh chilies.', price: 8.00, img: 'images/padkeemao.jpg', allowedModifiers: ['chicken','beef','pork','tofu','vegetable','prawn' ], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 2, spiceMin: 1,
		spiceNote: 'This dish contains fresh chillies as part of the recipe and cannot be made completely non-spicy.', allergens: ['soya','gluten','molluscs','fish'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
		{ id: 'pad-see-ew', name: 'Thai Stir Fried Noodles (Pad See Ew)', desc: 'Thai stir-fried noodle dish featuring wide, flat rice noodles, Chinese broccoli, and egg, all coated in a savoury, salty-sweet soy sauce', price: 8.00, img: 'images/newpadseeew.jpg', allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 0, allergens: ['egg','soya','gluten','molluscs','celery','mustard'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] },
        { id: 'fried-rice', name: 'Thai Special Fried Rice (Khao Pad)', desc: 'A classic Thai street food staple. Fragrant jasmine rice wok-fried with egg, onions, and tomatoes, seasoned with fish sauce, soy sauce, and oyster sauce.', price: 7.50, img: 'images/khaopad.jpg', allowedModifiers: ['chicken','tofu','pork','beef','vegetable','prawn'], modifierRequired: true, modifierMax: 1, spiceEnabled: true, spiceDefault: 0, allergens: ['egg','soya','gluten','celery','mustard'], allowedExtras: ['extra-chicken','extra-pork','extra-beef','extra-prawn','extra-tofu','extra-veg'] }
      ]},
	  { id:'sides',    title:'Side Dishes', allowExtras:false, items:[
        { id: 'jasmine-rice', name: 'Jasmine Rice (Khao Suay)', desc: 'Fragrant, long-grain rice.', price: 2.00, img: 'images/rice.jpg', allergens: [] },
        { id: 'egg-rice', name: 'Egg Fried Rice (Khao Pad Khai)', desc: 'Rice with egg, simple & comforting.', price: 2.50, img: 'images/eggrice.jpg', allergens: ['egg','soya'] },
        { id: 'sticky-rice', name: 'Sticky Rice (Khao Neow)', desc: 'Perfect sticky jasmine rice.', price: 2.50, img: 'images/stickyrice.jpg', allergens: [] },
        { id: 'coconut-rice', name: 'Coconut Rice (Khao Man)', desc: 'Jasmine rice simmered in coconut milk.', price: 3.00, img: 'images/coconutrice.jpg', allergens: [] },
		 { id: 'chips', name: 'Chips', desc: 'Deep fried chips. Because sometimes you just need them!', price: 3.00, img: 'images/chips.jpg', allergens: [] },
		 { id: 'fried-egg', name: 'Fried egg', desc: 'Thai style fried eggs have crispy whites with a soft yolk. But please let us know how you like yours', price: 1.00, img: 'images/egg.jpg', allergens: ['egg'] },
		 { id: 'salt-chips', name: 'Thai Style Salt & Pepper Chips🌶️', desc: 'Deep fried chips, stir-fried  with vegetables, chilli and our special sauce', price: 4.00, img: 'images/salt-chips.jpeg', kitchenLoad: 0, allergens: ['molluscs','gluten','soya'], spiceEnabled: true, spiceDefault: 1, badge: 'new' }
      ]},
      /*{ id:'drinks',    title:'Soft Drinks', allowExtras:false, items:[
        { id: 'pepsi-max', name: 'Pepsi Max', price: 1.00, img: 'images/pepsimax1.jpg', allergens: [] },
        { id: 'pepsi', name: 'Pepsi', price: 1.25, img: 'images/pepsi.jpg', allergens: [] },
        { id: 'sprite-zero', name: 'Sprite Zero',  price: 1.50, img: 'images/spritezero.jpg', allergens: [] },
        { id: 'fanta-orange', name: 'Fanta Orange', price: 1.75, img: 'images/fanta.jpg', allergens: [] },
		 { id: 'lemonade', name: 'Lemonade', price: 1.75, img: 'images/sprite.jpg', allergens: [] },
      ]},*/	  
    ];

    const MODIFIERS = [
      { id: 'chicken', name: 'Chicken', delta: 1.00 },
      { id: 'beef', name: 'Beef', delta: 1.50 },
      { id: 'pork', name: 'Pork', delta: 1.50 },
      { id: 'tofu', name: 'Tofu', delta: 0.50 },
      { id: 'prawn', name: 'Prawn', delta: 2.00 },
      { id: 'vegetable', name: 'Vegetable', delta: 0.00 },
      { id: 'fried-egg', name: 'Fried Egg', delta: 1.00 },
      { id: 'batter-chicken', name: 'Battered Chicken', delta: 1.50 },
    ];

    // ---------- State ----------
    let basket = []; // { name, itemId, mods:[{id,name,delta}], unitPrice, qty, img, spice }
	window.basket = basket;  // expose the array reference to the second script
    //const ITEMS_BY_ID = new Map();
	
	// remove chilli emojis that are baked into menu item names
		const CHILLI_RE = /🌶️+/g;
		function nameWithoutChillies(str) {
		  return (str || '')
			.replace(CHILLI_RE, '')
			.replace(/\s{2,}/g, ' ')
			.trim();
		}



    // ---------- Helpers ----------
    function formatCurrency(n){ const cents = Math.round((n + Number.EPSILON) * 100); return '£' + (cents/100).toFixed(2); }
    function roundToTwo(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
    function chilliIcons(n){ return '🌶️'.repeat(Math.max(0, Math.min(3, n||0))); }
	
var deliveryQuoteState = {
  loading: false,
  eligible: true,
  reason: "",
  straightLineMiles: null,
  routeMiles: null,
  fee: 0,
  usedFallback: false,
  lastUpdated: null
};

window.deliveryQuoteState = deliveryQuoteState;

var refreshCheckoutPricingAndRender = async function () {
  if (getSelectedOrderType() === "delivery") {
    await window.refreshDeliveryQuote();
  } else {
    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles: null,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;
  }

  recomputeCheckoutTotals();
  updateCheckoutSubmitButton();
  updateCheckoutOrderSummary();
};

window.refreshCheckoutPricingAndRender = refreshCheckoutPricingAndRender;
			
			
			// ---------- Delivery pricing (HELPERS) ----------
var DELIVERY_MAX_STRAIGHT_LINE_MILES = 3;
var DELIVERY_FREE_THRESHOLD = 30;

var DELIVERY_ROUTE_BANDS = [
  { maxMiles: 1.5, fee: 2.0 },
  { maxMiles: 2.5, fee: 3.0 },
  { maxMiles: 4.0, fee: 4.0 }
];

var DELIVERY_FALLBACK_FEE = 3.0;

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function roundMiles(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
}

function calculateBandFee(miles, bands) {
  if (miles == null || Number.isNaN(miles)) return null;

  for (const band of bands) {
    if (miles <= band.maxMiles) return band.fee;
  }

  return null;
}

function getSelectedOrderType() {
  const selected = document.querySelector('input[name="order-type"]:checked');
  return selected ? selected.value : "collection";
}

function getPreDiscountFoodSubtotal() {
  return Number(checkoutBaseSubtotal || 0);
}

function getRestaurantLatLng() {
  return {
    lat: 53.744437,
    lng: -1.576570
  };
}

function getCustomerLatLng() {
  const lat = Number(window.customerLat);
  const lng = Number(window.customerLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function resetCheckoutForNextOrder() {
  console.log('[checkout] resetting state for next order');

  // Clear customer-entered checkout fields
  const fieldsToClear = [
    'cust-name',
    'cust-email',
    'cust-phone',
    'cust-address',
    'cust-notes',
    'cust-preferred-time'
  ];

  fieldsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Clear discount state
  appliedDiscountCode = null;
  appliedDiscountAmount = 0;

  const discountMessage =
    document.getElementById('discount-code-message');

  if (discountMessage) {
    discountMessage.textContent = '';
    discountMessage.className = 'discount-code-message';
  }

  // Try to clear the discount-code input without assuming one exact ID
  const discountInput =
    document.getElementById('discount-code') ||
    document.querySelector('input[name="discount_code"]');

  if (discountInput) {
    discountInput.value = '';
  }

  // Clear preferred-time scheduler state
  lastPreferredDate = null;

  hidePreferredTimeMessage();

  // Clear delivery calculation from previous customer
  window.deliveryQuoteState = {};

  // IMPORTANT:
  // next order must get a brand-new idempotency key
  localStorage.removeItem('checkout_idempotency_key');

  console.log('[checkout] reset complete');
}

async function refreshDeliveryQuote() {
  const subtotal = Number(checkoutBaseSubtotal || 0);
	const freeDeliveryRemaining = Math.max(0, DELIVERY_FREE_THRESHOLD - subtotal);
	const freeDeliveryMessage =
	  subtotal >= DELIVERY_FREE_THRESHOLD
		? "🎉 You’ve unlocked FREE delivery!"
		: `Add £${freeDeliveryRemaining.toFixed(2)} more for FREE delivery 🚚`;
  const restaurant = getRestaurantLatLng();
  const customer = getCustomerLatLng();

			  // 🚫 No coords = cannot prove address is in delivery radius
			  if (!restaurant || !customer) {
			  deliveryQuoteState = {
				loading: false,
				eligible: true,
				reason: "",
				straightLineMiles: null,
				routeMiles: null,
				fee: DELIVERY_FALLBACK_FEE,
				usedFallback: true,
				freeDeliveryRemaining,
				freeDeliveryMessage,
				lastUpdated: Date.now()
			  };

			  window.deliveryQuoteState = deliveryQuoteState;

			  console.warn("[delivery] blocked - missing coords for radius check", {
				restaurant,
				customer
			  });

			  return deliveryQuoteState;
			}

  const straightLineMiles = haversineMiles(
    restaurant.lat,
    restaurant.lng,
    customer.lat,
    customer.lng
  );

  // 🚫 Hard 3-mile radius gate
  if (straightLineMiles > DELIVERY_MAX_STRAIGHT_LINE_MILES) {
    deliveryQuoteState = {
      loading: false,
      eligible: false,
      reason: "Sorry, this address is outside our 3-mile delivery radius. Please call us on 0113 469 9564 and we’ll see what we can do 😊",
      straightLineMiles,
      routeMiles: null,
      fee: null,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.warn("[delivery] outside radius", {
      straightLineMiles
    });

    return deliveryQuoteState;
  }

  // ✅ Free delivery only AFTER radius check
  if (subtotal >= DELIVERY_FREE_THRESHOLD) {
    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.log("[delivery] free delivery threshold met within radius");
    return deliveryQuoteState;
  }

  // ✅ Inside radius, under free delivery threshold: use fallback while route quote loads
  deliveryQuoteState = {
    loading: true,
    eligible: true,
    reason: "",
    straightLineMiles,
    routeMiles: null,
    fee: DELIVERY_FALLBACK_FEE,
    usedFallback: true,
    lastUpdated: Date.now()
  };

  window.deliveryQuoteState = deliveryQuoteState;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/get-delivery-route-quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLIC_KEY
      },
      body: JSON.stringify({
        origin: restaurant,
        destination: customer
      })
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.ok || !Number.isFinite(data?.routeMiles)) {
      console.warn("[delivery] route lookup failed, using fallback");

      deliveryQuoteState = {
        ...deliveryQuoteState,
        loading: false,
        eligible: true,
        fee: DELIVERY_FALLBACK_FEE,
        usedFallback: true,
        lastUpdated: Date.now()
      };

      window.deliveryQuoteState = deliveryQuoteState;
      return deliveryQuoteState;
    }

    const routeMiles = Number(data.routeMiles);
    const routeFee = calculateBandFee(routeMiles, DELIVERY_ROUTE_BANDS);

    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles,
      fee: routeFee ?? DELIVERY_FALLBACK_FEE,
      usedFallback: routeFee == null,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.log("[delivery] route pricing applied", {
      straightLineMiles,
      routeMiles,
      fee: deliveryQuoteState.fee
    });

    return deliveryQuoteState;

  } catch (err) {
    console.warn("[delivery] route fetch exception, using fallback", err);

    deliveryQuoteState = {
      ...deliveryQuoteState,
      loading: false,
      eligible: true,
      fee: DELIVERY_FALLBACK_FEE,
      usedFallback: true,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;
    return deliveryQuoteState;
  }
}

window.refreshDeliveryQuote = refreshDeliveryQuote;

// Single source of truth for how much space to keep above scrolled content
// Single source of truth for how much space to keep above targets
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

window.addEventListener('load', applyHeaderOffset, { passive:true });
window.addEventListener('resize', applyHeaderOffset, { passive:true });
window.addEventListener('orientationchange', applyHeaderOffset, { passive:true });
window.addEventListener('scroll', applyHeaderOffset, { passive:true }); // keep it fresh while you move
applyHeaderOffset();

			
	
	// robust smooth scroll that clamps to page bounds (prevents “footer snaps”)
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
	
					
	// ---- Holiday / fully-booked ticker ----
		const tickerEl = document.getElementById('status-ticker');
		const tickerText = document.getElementById('ticker-text');

		// Simple config object (edit this anytime)
		const siteStatus = {
		  active: true,  // turn off when not needed
		  message: "Unfortunately, due to illness, Rung’s Thai Kitchen will be closed today (14th December). We are very sorry for any inconvenience this may cause."

		};
		
		// ✅ Add this line:
			console.log('TICKER INIT', { 
			  active: siteStatus.active, 
			  hasTickerEl: !!tickerEl, 
			  hasTickerText: !!tickerText 
			});

		if (siteStatus.active && tickerEl && tickerText) {
		  tickerText.textContent = siteStatus.message;
		  tickerEl.classList.remove('hidden');
		}

		(function adjustForTicker(){
		  const bar = document.getElementById('status-ticker');
		  if (!bar) return;
		  const set = () => {
			const h = bar.offsetHeight || 0;
			document.documentElement.style.setProperty('--ticker-height', h + 'px');
		  };
		  new ResizeObserver(set).observe(bar);
		  window.addEventListener('load', set, { passive:true });
		  window.addEventListener('resize', set, { passive:true });
		  set();
		})();
		
		// === Order idempotency ===
		function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
		}


// === Customise globals (place near top, before buildMenu) ===
window.ITEMS_BY_ID = window.ITEMS_BY_ID || new Map();
let currentItem = null;          // the item currently being customised
let selectedMods = new Set();    // your existing modifier selection
let selectedExtras = [];         // extras (added proteins)
let currentAllowExtras = false;
let isSubmittingOrder = false;   // double submit guard




// ---------- Build menu (single, clean version) ----------
/* === Full-screen menu overlay === */
// ---------- Build menu (for full-screen popup) ----------
function buildMenu() {
  const container = document.getElementById('menu-list');
  if (!container) return;

  container.innerHTML = '';

MENU_CATEGORIES.forEach(cat => {
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

    const allergenHTML = renderAllergenIconsCompact(item.allergens || []);

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
      <div class="price">${formatCurrency(item.price)}</div>
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
    openCustomise(btn.getAttribute('data-id'));
  });
  container.dataset.bound = '1';
}

}


// --------- Order rendering ----------
function renderOrder(){
  window.dispatchEvent(new CustomEvent('rtk:basket-changed'));
  const orderListEl  = document.getElementById('order-list');
  const orderTotalEl = document.getElementById('order-total');

		  orderListEl.innerHTML = '';

		  if (basket.length === 0){
			orderListEl.innerHTML = '<div class="muted small">No items yet — add something from the menu.</div>';
			orderTotalEl.textContent = formatCurrency(0);
			return;
		  }

		  basket.forEach((row, idx) => {
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
			const cleanName = nameWithoutChillies(row.name);

			const details = [];
			if (row.mods && row.mods.length) {
			  details.push(row.mods.map(m => m.name).join(', '));
			}
			if (typeof row.spice === 'number') {
			  details.push(chilliIcons(row.spice));
			}

			const text = document.createElement('div');
			text.innerHTML = `
			  <div style="font-weight:700">
				${cleanName}
				${details.length ? ` <span class="muted small">• ${details.join(' • ')}</span>` : ''}
			  </div>
			  <div class="muted small">Unit: ${formatCurrency(row.unitPrice)}</div>
			`;

			const right = document.createElement('div');
			right.style.textAlign = 'right';
			right.innerHTML = `
			  <div style="font-weight:800">${formatCurrency(roundToTwo(row.unitPrice * row.qty))}</div>
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

		  const total = basket.reduce((s, i) => s + i.unitPrice * i.qty, 0);
		  orderTotalEl.textContent = formatCurrency(roundToTwo(total));
		}
		
		// ---------- Menu popup open / close ----------
const menuOverlay     = document.getElementById('menu-overlay');
const menuLink        = document.getElementById('menu-link');
const menuClose       = document.getElementById('menu-overlay-close');
const menuCheckoutBtn = document.getElementById('menu-checkout-btn');
const menuFab         = document.getElementById('menu-fab');

// Open / close helpers
function openMenuOverlay() {
  if (!menuOverlay) return;
  menuOverlay.classList.add('show');
  menuOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // stop background scroll
}

function closeMenuOverlay() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove('show');
  menuOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Header nav "Menu" link
if (menuLink) {
  menuLink.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

// Floating FAB "Menu" button
if (menuFab) {
  menuFab.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

if (menuFab) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      menuFab.classList.remove('hidden');
    } else {
      menuFab.classList.add('hidden');
    }
  });
}

// Close X in overlay
if (menuClose) {
  menuClose.addEventListener('click', closeMenuOverlay);
}

// Click outside sheet closes
if (menuOverlay) {
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) closeMenuOverlay();
  });
}

// Proceed to checkout button in overlay
if (menuCheckoutBtn) {
  menuCheckoutBtn.addEventListener('click', () => {
    if (!basket || basket.length === 0) {
      alert('Please add at least one dish before proceeding to checkout.');
      return;
    }

    // close the menu overlay
    closeMenuOverlay();

    // compute subtotal from basket and open checkout
    const subtotal = basket.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0
    );
    openCheckout(subtotal);
  });
}

// ESC key closes popup too
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOverlay?.classList.contains('show')) {
    closeMenuOverlay();
  }
});


    // ---------- Modal (customise) ----------
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBase = document.getElementById('modal-base');
    const qtyInput = document.getElementById('qty-input');
    const qtyIncr = document.getElementById('qty-incr');
    const qtyDecr = document.getElementById('qty-decr');
    const modsEl = document.getElementById('mods');
    const unitPriceEl = document.getElementById('unit-price');
	// if any older code still uses `modalPrice`, point it at #unit-price
	const modalPrice = unitPriceEl;
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalAdd = document.getElementById('modal-add');
    const modalImg = document.getElementById('modal-img');
    const modRequiredNote = document.getElementById('mod-required-note');
    const modLimitNote = document.getElementById('mod-limit-note');
    const modalAllWrap = document.getElementById('modal-allergens-wrap');
    const modalAll = document.getElementById('modal-allergens');
    const spiceWrap = document.getElementById('spice-wrap');
    const spiceButtons = document.getElementById('spice-buttons');
    let currentAllowedMods = null;
    let currentRequires = false;
    let currentMulti = false;
    let currentMax = null;
    let currentSpice = null; // 0..3 or null
	

// include extras in the price calculation
function sumExtras() {
  return selectedExtras.reduce((s, e) => s + (e.delta || 0), 0);
}

const extrasWrap = document.getElementById('extras-wrap');
const extrasEl   = document.getElementById('extras');

function buildExtraChips() {
  // No extras for this item/category → hide the whole block
  if (!currentAllowExtras || !extrasWrap || !extrasEl) {
    if (extrasWrap) extrasWrap.style.display = 'none';
    return;
  }

  extrasWrap.style.display = 'block';
  extrasEl.innerHTML = '';

  // Decide which extras to show:
  // - if currentAllowExtras is an array → only those IDs
  // - otherwise → show all EXTRAS (current behaviour)
  let extrasToRender = EXTRAS;

  if (Array.isArray(currentAllowExtras)) {
    extrasToRender = EXTRAS.filter(opt =>
      currentAllowExtras.includes(opt.id)
    );

    // If filter removes everything, hide the block
    if (extrasToRender.length === 0) {
      extrasWrap.style.display = 'none';
      return;
    }
  }

  extrasToRender.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';

    const isSelected = selectedExtras.some(x => x.id === opt.id);
    if (isSelected) btn.classList.add('selected');

    btn.textContent = `${opt.name} ${formatCurrency(opt.delta)}`;

    btn.addEventListener('click', () => {
      // we’ll handle the "only 1 extra" rule in the next section
      handleExtraClick(opt);
    });

    extrasEl.appendChild(btn);
  });
}

function handleExtraClick(opt) {
  // If this extra is already selected → deselect it
  const already = selectedExtras.findIndex(x => x.id === opt.id);

  if (already >= 0) {
    // clicking again removes the extra
    selectedExtras.splice(already, 1);
  } else {
    // Only allow ONE extra → replace the array with just this option
    selectedExtras = [{ ...opt }];
  }

  // Rebuild UI + refresh price
  buildExtraChips();
  updateUnitPricePreview();
}

    function buildModifierChips(allowed, required=false, multi=false, max=null){
      modsEl.innerHTML = '';
      selectedMods.clear();
      currentAllowedMods = Array.isArray(allowed) && allowed.length ? allowed.slice() : null;
      currentRequires = !!required;
      currentMulti = !!multi || (typeof max === 'number' && max > 0);
      currentMax = (typeof max === 'number' && max > 0) ? max : null;

      if(currentRequires && currentAllowedMods){ modRequiredNote.style.display = 'block'; modalAdd.disabled = true; }
      else { modRequiredNote.style.display = 'none'; modalAdd.disabled = false; }

      if(currentMulti && currentMax){ modLimitNote.style.display = 'block'; modLimitNote.textContent = `Choose up to ${currentMax} options`; }
      else { modLimitNote.style.display = 'none'; }

      if(!currentAllowedMods){ modsEl.style.display = 'none'; return; }
      modsEl.style.display = 'flex';

      MODIFIERS.forEach(m => {
        if(!currentAllowedMods.includes(m.id)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.innerHTML = `${m.name}${m.delta ? ` (+${formatCurrency(m.delta)})` : ''}`;
        btn.dataset.id = m.id;

        btn.addEventListener('click', () => {
          if(currentMulti){
            if(selectedMods.has(m.id)){
              selectedMods.delete(m.id);
              btn.classList.remove('selected');
            } else {
              if(currentMax && selectedMods.size >= currentMax){
                btn.animate([{transform:'translateY(-2px)'},{transform:'translateY(0)'}],{duration:140});
                return;
              }
              selectedMods.add(m.id);
              btn.classList.add('selected');
            }
            if(currentRequires) modalAdd.disabled = (selectedMods.size === 0);
            if(currentMax && currentMulti){ modLimitNote.textContent = `Selected ${selectedMods.size}/${currentMax}`; }
          } else {
            if(selectedMods.has(m.id)){
              selectedMods.delete(m.id);
              btn.classList.remove('selected');
            } else {
              selectedMods.clear();
              modsEl.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
              selectedMods.add(m.id);
              btn.classList.add('selected');
            }
            if(currentRequires) modalAdd.disabled = (selectedMods.size === 0);
          }
          updateUnitPricePreview();
        });

        modsEl.appendChild(btn);
      });
    }
	
	function openCustomiseById(itemId) {
  const item = window.ITEMS_BY_ID.get(String(itemId));
  if (!item || !modal) {
    console.warn('openCustomiseById: item not found', itemId);
    return;
  }

  currentItem = item;
  modalBase.dataset.id = item.id;   // ✅ ADD THIS LINE
  selectedMods.clear();
  selectedExtras = [];
  currentAllowExtras = !!item.categoryAllowedExtras;

  const allowed  = Array.isArray(item.allowedModifiers) ? item.allowedModifiers : null;
  const requires = !!item.modifierRequired;
  const isMulti  = !!item.modifierMax || !!item.modifiersMulti;
  const max      = (typeof item.modifierMax === 'number' && item.modifierMax > 0)
    ? item.modifierMax
    : null;

  buildModifierChips(allowed, requires, isMulti, max);
  buildExtraChips();
  modalTitle.textContent = `Customise — ${item.name}`;
  modalBase.dataset.price = item.price;
  modalBase.textContent   = `Base price: ${formatCurrency(item.price)}`;
  qtyInput.value = 1;
  updateUnitPricePreview();

  if (modalImg) {
    if (item.img) {
      modalImg.src = item.img;
      modalImg.style.display = 'block';
    } else {
      modalImg.removeAttribute('src');
      modalImg.style.display = 'none';
    }
  }

  if (item.allergens && item.allergens.length) {
    modalAll.innerHTML = renderAllergenBadges(item.allergens);
    modalAllWrap.style.display = 'block';
  } else {
    modalAll.innerHTML = '';
    modalAllWrap.style.display = 'none';
  }

  const defaultSpice = (typeof item.spiceDefault === 'number') ? item.spiceDefault : 0;
  buildSpiceSelector(!!item.spiceEnabled, defaultSpice);

  modal.style.display = 'flex';
}

	
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
    titleEl.textContent = `Order confirmed — ${summary?.ref || ''}`;
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
	function showOrderSuccess(orderId, items, total, orderType, preferredTime) {
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
			orderType: orderType || 'collection'
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


    function buildSpiceSelector(enabled, defaultLevel=0){
      if(!enabled){
        spiceWrap.style.display = 'none';
        spiceButtons.innerHTML = '';
        currentSpice = null;
        return;
      }
      spiceWrap.style.display = 'block';
      spiceButtons.innerHTML = '';
      currentSpice = Math.max(0, Math.min(3, Number(defaultLevel)||0));

      const labels = [
        {v:0, text:'No spice'},
        {v:1, text:'Mild 🌶️'},
        {v:2, text:'Medium 🌶️🌶️'},
        {v:3, text:'Very spicy 🌶️🌶️🌶️'}
      ];
      labels.forEach(l=>{
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'spice-btn' + (l.v===currentSpice ? ' active':'');
        b.textContent = l.text;
        b.setAttribute('aria-pressed', l.v===currentSpice ? 'true':'false');
        b.addEventListener('click', ()=>{
          currentSpice = l.v;
          [...spiceButtons.querySelectorAll('.spice-btn')].forEach(x=>{
            x.classList.remove('active'); x.setAttribute('aria-pressed','false');
          });
          b.classList.add('active'); b.setAttribute('aria-pressed','true');
        });
        spiceButtons.appendChild(b);
      });
    }

    function closeModal(){
      modal.style.display = 'none';
      currentItem = null;
      selectedMods.clear();
      currentAllowedMods = null;
      if (modalImg){ modalImg.removeAttribute('src'); modalImg.style.display = 'none'; }
      buildSpiceSelector(false);
    }

    function updateUnitPricePreview(){
  const base = Number(modalBase.dataset.price) || 0;

  // existing modifiers total…
  let modsTotal = 0;
  selectedMods.forEach(id => {
    const m = MODIFIERS.find(x => x.id === id);
    if (m) modsTotal += m.delta;
  });

  // extras total (only if allowed)
  let extrasTotal = 0;
  if (currentAllowExtras) {
    extrasTotal = selectedExtras.reduce((s,e)=> s + (e.delta || 0), 0);
  }

  const total = roundToTwo(base + modsTotal + extrasTotal);
  unitPriceEl.textContent = formatCurrency(total);
}


// Safe wrapper so old calls still work
function opencustomise(id){ openCustomize(id); }


// Canonical customise opener
function openCustomiseById(itemId) {
  const item = window.ITEMS_BY_ID.get(String(itemId));
  if (!item || !modal) {
    console.warn('openCustomiseById: item not found', itemId);
    return;
  }

  currentItem = item;
  selectedMods.clear();
  selectedExtras = [];

	  // NEW: per-item extras control
if (Array.isArray(item.allowedExtras)) {
  currentAllowExtras = item.allowedExtras;        // [] means no extras
} else {
  currentAllowExtras = !!item.categoryAllowedExtras; // existing behaviour
}

	  const allowed  = Array.isArray(item.allowedModifiers) ? item.allowedModifiers : null;
	  const requires = !!item.modifierRequired;
	  const isMulti  = !!item.modifierMax || !!item.modifiersMulti;
	  const max      = (typeof item.modifierMax === 'number' && item.modifierMax > 0)
		? item.modifierMax
		: null;

	  buildModifierChips(allowed, requires, isMulti, max);
	  buildExtraChips();
	  modalTitle.textContent = `Customise — ${item.name}`;
	  modalBase.dataset.price = item.price;
	  modalBase.textContent   = `Base price: ${formatCurrency(item.price)}`;
	  qtyInput.value = 1;
	  updateUnitPricePreview();

	  if (modalImg) {
		if (item.img) {
		  modalImg.src = item.img;
		  modalImg.style.display = 'block';
		} else {
		  modalImg.removeAttribute('src');
		  modalImg.style.display = 'none';
		}
	  }

	  if (item.allergens && item.allergens.length) {
		modalAll.innerHTML = renderAllergenBadges(item.allergens);
		modalAllWrap.style.display = 'block';
	  } else {
		modalAll.innerHTML = '';
		modalAllWrap.style.display = 'none';
	  }

	  const defaultSpice = (typeof item.spiceDefault === 'number') ? item.spiceDefault : 0;
	  buildSpiceSelector(!!item.spiceEnabled, defaultSpice);

	  modal.style.display = 'flex';
	}
	function openCustomise(itemId) {
	  // Backwards-compat wrapper so old code still works
	  return openCustomiseById(itemId);
	}

	// If anything uses it from inline HTML like onclick="openCustomise(...)"
	window.openCustomise = openCustomise;


	// Optional aliases if other code uses different casing:
	// keep old call sites working
	window.openCustomise  = openCustomise;
	window.openCustomize  = openCustomise;
	window.opencustomise  = openCustomise;




		document.getElementById('qty-incr').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1') + 1); });
		document.getElementById('qty-decr').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1') - 1); });

		document.getElementById('modal-close').addEventListener('click', closeModal);
		document.getElementById('modal-cancel').addEventListener('click', closeModal);
		modal.addEventListener('click', (ev) => { if(ev.target === modal) closeModal(); });

		document.getElementById('modal-add').addEventListener('click', () => {
	  // … your existing checks …

	  const base = Number(modalBase.dataset.price) || 0;

	  let modsTotal = 0;
	  const modsArr = [];
	  selectedMods.forEach(id => {
		const m = MODIFIERS.find(x => x.id === id);
		if (m) { modsTotal += m.delta; modsArr.push(m); }
	  });

	  const extrasArr = currentAllowExtras
		? selectedExtras.map(e => ({ id:e.id, name:e.name, delta:e.delta, type:'extra' }))
		: [];

	  const extrasTotal = currentAllowExtras
		? selectedExtras.reduce((s,e)=> s + (e.delta || 0), 0)
		: 0;

	  const unitPrice = roundToTwo(base + modsTotal + extrasTotal);
	  const qty = Math.max(1, parseInt(qtyInput.value || '1'));
	  
	const item = currentItem;
	if (!item) {
	  console.error('[Customise] No currentItem set — modal opened without selecting an item');
	  return;
	}
	const itemId = item.id;

	  basket.push({
		name: item.name,
		itemId: item.id,
		mods: [...modsArr, ...extrasArr],   // put extras in mods for downstream reuse
		unitPrice,
		qty,
		img: item.img || '',
		spice: currentSpice ?? null
	  });

	  closeModal();
	  renderOrder();
	  refreshAppliedDiscountCode();
	});



	// One delegated handler for all customise buttons inside the popup
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
		if (typeof openCustomise === 'function') {
		  openCustomise(id);
		} else if (typeof window.openCustomise === 'function') {
		  window.openCustomise(id);
		}
	  });

	  container.dataset.customBound = '1';
	})();

document.getElementById('order-panel').addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const idx = Number(btn.dataset.idx);

  if (action === 'inc') {
    basket[idx].qty += 1;
    renderOrder();
    await refreshAppliedDiscountCode();
  }

  if (action === 'dec') {
    basket[idx].qty = Math.max(1, basket[idx].qty - 1);
    renderOrder();
    await refreshAppliedDiscountCode();
  }

  if (action === 'remove') {
    basket.splice(idx, 1);
    renderOrder();
    await refreshAppliedDiscountCode();
  }
});

		// Lightbox
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

		document.addEventListener('keydown', (e) => {
	  if (e.key === 'Escape') {
		if (typeof closeModal === 'function' && modal?.style.display === 'flex') closeModal();
		if (typeof closeCheckout === 'function' && checkoutModal?.style.display === 'flex') closeCheckout();
		if (typeof hideOrderSuccess === 'function') hideOrderSuccess();
	  }
	});

	// --- One handler for all "customise" buttons in the popup menu ---
	const menuListEl = document.getElementById('menu-list');

	if (menuListEl) {
	  menuListEl.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-id]');
		if (!btn) return;

		const id = btn.dataset.id;
		// just open customise – do NOT close menu
		openCustomise(id);
	  });
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



	// ---------- Build & first render ----------
	buildMenu();
	renderOrder();
	refreshAppliedDiscountCode();

	// expose helpers the other script uses
	window.formatCurrency     = formatCurrency;
	window.orderMsg           = document.getElementById('order-msg');
	window.basket             = basket;
	window.renderOrder        = renderOrder;
 window.RTKRestoreReviewedBasket=items=>{
  if(basket.length&&!confirm('Replace your current basket with the basket reviewed by the restaurant?'))return false;
  const restored=items.map(line=>({itemId:line.item_id,name:line.name,mods:line.modifiers,
   unitPrice:line.unit_price,qty:line.qty,img:line.img||'',spice:line.spice,item_note:line.item_note}));
  basket.splice(0,basket.length,...restored);renderOrder();return true;
 };
	window.roundToTwo         = roundToTwo;
	window.chilliIcons        = chilliIcons;
	window.nameWithoutChillies= nameWithoutChillies;

	  
	  function openMenuOverlay() {
	  if (!menuOverlay) return;
	  menuOverlay.classList.add('show');
	  document.body.style.overflow = 'hidden';   // stop background scroll
	  document.body.classList.add('menu-open');  // 👈 NEW: flag that menu is open
	}

	function closeMenuOverlay() {
	  if (!menuOverlay) return;
	  menuOverlay.classList.remove('show');
	  document.body.style.overflow = '';
	  document.body.classList.remove('menu-open'); // 👈 NEW: remove flag
	}


	  if (menuLink) {
		menuLink.addEventListener('click', (e) => {
		  e.preventDefault();
		  openMenuOverlay();
		});
	  }

	  if (menuClose) {
		menuClose.addEventListener('click', () => {
		  closeMenuOverlay();
		});
	  }

	  if (menuOverlay) {
		// click outside the inner card closes
		menuOverlay.addEventListener('click', (e) => {
		  if (e.target === menuOverlay) closeMenuOverlay();
		});
	  }

	  // ESC key closes popup too
	  document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && menuOverlay?.classList.contains('show')) {
		  closeMenuOverlay();
		}
	  });

	function cancelOrder(order, reason, meta = {}) {
	  order.status = 'cancelled';
	  order.cancelReason = reason;            // <- short code/string
	  order.cancelMeta = meta;                // <- optional extra detail
	  order.cancelledAt = new Date().toISOString();
	  console.warn('[ORDER CANCELLED]', reason, meta, order);
	  return order;
	}


	// (no extra closers past here)
	}); 

// end Loaded




