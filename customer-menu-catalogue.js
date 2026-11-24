(function(root){
'use strict';
function create(){
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
		{ id: 'salt-chicken', name: 'Thai-style Salt & Pepper Crispy Chicken🌶️', desc: 'Tender, bite-sized pieces of battered chicken, stir-fried with fresh vegetables and chilli in our special sauce.',  price: 6.50, img: 'images/salt-chicken.jpeg', spiceEnabled: true, spiceDefault: 1, spiceMin: 1, spiceNote: 'This dish contains chilli in the base sauce and cannot be made completely non-spicy.', kitchenLoad: 0, allergens: ['soya','gluten','molluscs'],  badge: 'new' },		
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
        { id: 'salt-chickenchips', name: 'Salt & Pepper Chicken & Chips🌶️', desc: 'Crispy chicken pieces and chunky chips, stir-fried with fresh vegetables and chilli in oyster sauce.', price: 9.00, img: 'images/salt-chickenchips.jpg', modifierRequired: false, allowedExtras: [], spiceEnabled: true, spiceDefault: 1, spiceMin: 1, spiceNote: 'This dish contains chilli in the base sauce and cannot be made completely non-spicy.', allergens: ['soya','molluscs','gluten'], badge: 'new' }
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
		 { id: 'salt-chips', name: 'Thai Style Salt & Pepper Chips🌶️', desc: 'Deep fried chips, stir-fried  with vegetables, chilli and our special sauce', price: 4.00, img: 'images/salt-chips.jpeg', kitchenLoad: 0, allergens: ['molluscs','gluten','soya'], spiceEnabled: true, spiceDefault: 1, spiceMin: 1, spiceNote: 'This dish contains chilli in the base sauce and cannot be made completely non-spicy.', badge: 'new' }
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


return {ALLERGENS,EXTRAS,MENU_CATEGORIES,MODIFIERS,normalizeAllergens,renderAllergenIconsCompact,renderAllergenBadges};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKMenuCatalogue=api;
})(typeof window==='undefined'?null:window);
