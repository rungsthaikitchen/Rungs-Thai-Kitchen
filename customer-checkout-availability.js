// Checkout responsibility module; initialized explicitly by customer-checkout.js.
(function(root){
 // Preserve the original classic-script semantics during this extraction.
 function create(context){
  const {window,document,console}=context;
const preferredDateInput =
  document.getElementById('cust-preferred-date');

const preferredTimeSelect =
  document.getElementById('cust-preferred-time-select');

const preferredTimeHidden =
  document.getElementById('cust-preferred-time');


function formatTimeHHMM(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}


function clearPreferredTimeSelect(message = 'Select a date first') {
  if (!preferredTimeSelect) return;

  preferredTimeSelect.innerHTML = '';

  const option = document.createElement('option');
  option.value = '';
  option.textContent = message;

  preferredTimeSelect.appendChild(option);

  if (preferredTimeHidden) {
    preferredTimeHidden.value = '';
  }
}


let masterWokTimeHints=null;
let masterWokUnverifiedTimes=new Set();
let preferredTimeGeneration=0;
function availabilityBasketKey(){return JSON.stringify((window.basket||[]).map(line=>[line.itemId,line.qty,(line.mods||[]).map(m=>m.id),line.spice??null,line.item_note||null]));}
function availabilityContextKey(date){return JSON.stringify([date,availabilityBasketKey(),document.querySelector('input[name="order-type"]:checked')?.value||'collection',document.getElementById('cust-address')?.value?.trim()||'']);}
let lastAvailabilityBasketKey=availabilityBasketKey();
window.addEventListener('rtk:basket-changed',()=>{
 const key=availabilityBasketKey();if(key===lastAvailabilityBasketKey)return;lastAvailabilityBasketKey=key;
 ++preferredTimeGeneration;masterWokTimeHints=null;window.RTKBookingClient?.cancelAvailability?.();
 clearPreferredTimeSelect('Basket changed — refresh times');
 document.getElementById('unavailable-basket-dialog')?.close();
 if(context.checkoutModal?.style.display==='flex'&&preferredDateInput?.value)refreshPreferredTimes();
});

function basketReviewDateMessage(dateString, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(now).map(part => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  if (dateString && dateString < today) return 'This date has passed. Please choose another date.';
  if (dateString === today && `${parts.hour}:${parts.minute}` >= context.OPEN_WINDOW.end) {
    return 'Ordering has finished for today. Please choose another date.';
  }
  return '';
}
function stopExpiredBasketReview(dateString) {
  const message = basketReviewDateMessage(dateString);
  if (!message) return false;
  document.getElementById('unavailable-basket-dialog')?.close();
  clearPreferredTimeSelect(message);
  preferredTimeSelect.disabled = true;
  (0, context.showPreferredTimeMessage)(message);
  return true;
}
function showUnavailableBasketDialog({availabilityUnknown = false} = {}) {
  if (stopExpiredBasketReview(preferredDateInput?.value)) return;
  let dialog = document.getElementById('unavailable-basket-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'unavailable-basket-dialog';
    dialog.setAttribute('aria-labelledby', 'unavailable-basket-title');
    dialog.style.cssText = 'max-width:420px;width:calc(100% - 48px);padding:24px;border:0;border-radius:16px;color:#18222c;background:white;box-sizing:border-box;max-height:85vh;overflow-y:auto';
    dialog.innerHTML = '<h2 id="unavailable-basket-title">Let’s arrange your order</h2>'
      + '<p>We couldn’t find an online collection time for this combination of dishes. Please call us on <a href="tel:01134699564">0113 469 9564</a> so we can help arrange it. Your basket is saved here.</p>'
      + '<form method="dialog"><button type="submit" autofocus>Back to checkout</button></form>';
    document.body.appendChild(dialog);
  }
  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
  const introduction = availabilityUnknown
    ? 'Online times could not be checked. '
    : 'We couldn’t find an online ' + (orderType === 'delivery' ? 'delivery' : 'collection') + ' time for this combination of dishes. ';
  dialog.querySelector('p').innerHTML = introduction
    + 'Please call us on <a href="tel:01134699564">0113 469 9564</a> so we can help arrange it. Your basket is saved here.';
  if (!dialog.open) dialog.showModal();
  if (!dialog.querySelector('[data-review-form]') && window.RTKBasketReview) {
    window.RTKBasketReview.enabled().then(enabled => {
      if (!enabled || dialog.querySelector('[data-review-form]') || stopExpiredBasketReview(preferredDateInput?.value)) return;
      const form = document.createElement('form');
      form.dataset.reviewForm = 'true';
      form.innerHTML = '<h3>Send us your basket to review</h3>'
        + '<p>This is a request for us to contact you. It is not a confirmed order or a reserved time.</p>'
        + '<label>Your name <input name="name" autocomplete="name" required maxlength="200"></label><br>'
        + '<label>Phone number <input name="phone" type="tel" autocomplete="tel" required maxlength="40"></label><br>'
        + '<label>Preferred date <input name="date" type="date" required></label><br>'
        + '<label>Preferred time <input name="time" type="time" step="300" min="17:00" max="22:00" required></label>'
        + '<p>We will check the basket and discuss what we can arrange. Please call if you need an immediate answer.</p>'
        + '<button type="submit">Send basket for review</button><p role="status" aria-live="polite"></p>';
      form.elements.name.value = document.getElementById('cust-name')?.value || '';
      form.elements.phone.value = document.getElementById('cust-phone')?.value || '';
      form.elements.date.value = document.getElementById('cust-preferred-date')?.value || '';
      form.onsubmit = async event => {
        event.preventDefault();
        const button = form.querySelector('button'), status = form.querySelector('[role="status"]');
        const dateMessage = basketReviewDateMessage(form.elements.date.value);
        if (dateMessage) { status.textContent = dateMessage; return; }
        button.disabled = true;
        status.textContent = 'Sending your basket…';
        try {
          const result = await window.RTKBasketReview.submit({
            customer:{name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim()},
            orderType:document.querySelector('input[name="order-type"]:checked')?.value || 'collection',
            deliveryAddress:document.getElementById('cust-address')?.value?.trim() || '',
            preferredTime:window.RTKBasketReview.londonTime(form.elements.date.value,form.elements.time.value),
            items:context.basket.map(line=>({item_id:line.itemId,qty:line.qty,
              modifiers:(line.mods||[]).map(mod=>({id:mod.id})),spice:line.spice??null,item_note:line.item_note||null}))
          });
          status.textContent = 'Basket received for review. Your order and preferred time are not confirmed. Please call us to discuss it.';
          button.textContent = 'Basket sent';
        } catch(error) {
          status.textContent = error.message || 'Please retry with the same details or call us.';
          button.disabled = false;
        }
      };
      dialog.insertBefore(form, dialog.querySelector('form[method="dialog"]'));
    });
  }
}

async function populatePreferredTimeSelect(dateString) {
  const generation=++preferredTimeGeneration;
  const requestedContext=availabilityContextKey(dateString);
  const current=()=>generation===preferredTimeGeneration&&requestedContext===availabilityContextKey(dateString);
  masterWokTimeHints=null;masterWokUnverifiedTimes=new Set();
  if (
    !preferredTimeSelect ||
    !preferredTimeHidden ||
    !dateString
  ) {
    return;
  }

  if (stopExpiredBasketReview(dateString)) return;
  const hintOrderType=document.querySelector('input[name="order-type"]:checked')?.value||'collection';
  if(hintOrderType==='delivery'&&!(document.getElementById('cust-address')?.value||'').trim()){
    clearPreferredTimeSelect('Enter your delivery address first');
    (0, context.showPreferredTimeMessage)('Enter your delivery address to see arrival times.');
    return;
  }
  (0, context.setAvailabilityLoading)(true);
  try {
  clearPreferredTimeSelect('Checking available times…');
  preferredTimeSelect.disabled = true;

  const serviceDate =
    new Date(`${dateString}T12:00:00`);

  // Load the latest kitchen commitments for this date.
  // Select the authoritative hint source below after validating the date.

  preferredTimeSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a time';
  placeholder.selected = true;

  preferredTimeSelect.appendChild(placeholder);

  const start =
    new Date(`${dateString}T${context.OPEN_WINDOW.start}:00`);

  const end =
    new Date(`${dateString}T${context.OPEN_WINDOW.end}:00`);

    // Overrun fulfilment may extend beyond normal closing time,
// but should only be offered when the basket cannot fit
// anywhere in the remaining normal service window.
const extendedEnd = new Date(
  end.getTime() +
  context.KITCHEN_OVERRUN_MINUTES * 60 * 1000
);

  const now = new Date();

  const earliestToday = new Date(now);
  earliestToday.setMinutes(
    earliestToday.getMinutes() + context.LEAD_MINUTES
  );

  const roundedEarliestToday =
    (0, context.roundTo5Min)(earliestToday);

  const todayKey = (0, context.toYMD)(now);
const isToday = dateString === todayKey;

// If this isn't one of our normal trading days,
// don't generate a meaningless list of unavailable times.
if (!context.OPEN_DAYS.includes(serviceDate.getDay())) {
  preferredTimeSelect.innerHTML = '';

  const option = document.createElement('option');
  option.value = '';
  option.textContent = 'Closed on this date';
  option.selected = true;

  preferredTimeSelect.appendChild(option);

  preferredTimeSelect.disabled = true;
  preferredTimeHidden.value = '';

  return;
}

let masterWokAssessment = false;
try {
  if(!window.RTKBookingClient)throw Error('Ordering service is still loading. Please retry.');
  const times=[];
  for(let slot=new Date(start);slot<=extendedEnd;slot=new Date(slot.getTime()+5*60*1000))times.push(slot.toISOString());
  const preview=await window.RTKBookingClient.availability({times,reviewApprovalToken:window.RTKApprovedReview?.token,
    orderType:document.querySelector('input[name="order-type"]:checked')?.value||'collection',
    address:document.getElementById('cust-address')?.value?.trim()||'',items:context.basket.map(line=>({
    item_id:line.itemId,qty:line.qty,modifiers:(line.mods||[]).map(mod=>({id:mod.id})),
    spice:line.spice??null,item_note:line.item_note||null}))}, {onProgress:({completed,total})=>{
      if (current()) (0, context.showPreferredTimeMessage)(`Checking available times… ${Math.round(completed / total * 100)}%`);
    }});
  if(generation!==preferredTimeGeneration||requestedContext!==availabilityContextKey(dateString))return;
  if(preview.route==='MASTER_WOK'){
    masterWokAssessment = true;
    masterWokTimeHints=new Map(preview.hints.map(h=>[h.time,h.available]));
    masterWokUnverifiedTimes=new Set(preview.hints.filter(h=>h.unverified===true).map(h=>h.time));
  }
  else await (0, context.refreshKitchenSlotMap)(serviceDate);
  if(generation!==preferredTimeGeneration||requestedContext!==availabilityContextKey(dateString))return;
  (0, context.hidePreferredTimeMessage)();
} catch(error) {
  if(generation!==preferredTimeGeneration||requestedContext!==availabilityContextKey(dateString))return;
  clearPreferredTimeSelect('Times unavailable — please retry');
  (0, context.showPreferredTimeMessage)(error.message||'Times could not be checked. Please retry.');
  // An unavailable service is not proof of an impossible basket. Offer the
  // separately gated enquiry flow without enabling either booking writer.
  if (window.RTKBasketReview && await window.RTKBasketReview.enabled()
      && generation === preferredTimeGeneration) {
    const message = document.getElementById('preferred-time-message');
    if (message) {
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.textContent = 'Ask us to review this basket';
      reviewButton.style.cssText = 'display:block;margin-top:10px';
      reviewButton.onclick = () => showUnavailableBasketDialog({availabilityUnknown:true});
      message.appendChild(reviewButton);
    }
  }
  return;
}
let availableCount = 0;
  const isDelivery = (0, context.getSelectedOrderType)() === 'delivery';

  for (
    let slot = new Date(start);
    slot <= end;
    slot = new Date(slot.getTime() + (5 * 60 * 1000))
  ) {
    const option = document.createElement('option');
    const timeText = formatTimeHHMM(slot);
    if (isDelivery && window.isLateDeliverySlot(dateString, timeText)) continue;

    option.value = timeText;

    // Past / lead-time slots today are unavailable.
    const insideLeadTime =
      isToday && slot < roundedEarliestToday;

    // Existing scheduler decides whether the basket can fit.
    const schedulerAllows =
      !insideLeadTime && (0, context.isAllowed)(slot);

    if (schedulerAllows) {
  option.textContent = timeText;
  availableCount++;
} else {

  const closedBlackout =
    typeof context.isClosedDate === 'function'
      ? (0, context.isClosedDate)(slot)
      : null;

  const fullyBookedBlackout =
    typeof context.isFullyBooked === 'function'
      ? (0, context.isFullyBooked)(slot)
      : null;

  if (closedBlackout) {
    option.textContent =
      `${timeText} — Closed`;
  } else if (fullyBookedBlackout) {
    option.textContent =
      `${timeText} — Fully booked`;
  } else {
    option.textContent =
      masterWokUnverifiedTimes.has(slot.toISOString())?`${timeText} — Not verified`:`${timeText} — Unavailable`;
  }

  option.disabled = true;
}

    preferredTimeSelect.appendChild(option);
  }

  // If nothing can accommodate this basket during the normal
// service window, expose genuine overrun fulfilment options.
// Overrun is only available for today's service while
// the normal ordering window is still open.
const isTodayService =
  dateString === (0, context.toYMD)(now);

const beforeNormalClose =
  now <= end;

if (
  availableCount === 0 &&
  isTodayService &&
  beforeNormalClose
) {

  for (
    let slot = new Date(
      end.getTime() + (5 * 60 * 1000)
    );
    slot <= extendedEnd;
    slot = new Date(
      slot.getTime() + (5 * 60 * 1000)
    )
  ) {
    const option =
      document.createElement('option');

    const timeText =
      formatTimeHHMM(slot);

    option.value = timeText;

    if (isDelivery && window.isLateDeliverySlot(dateString, timeText)) continue;
    const schedulerAllows =
      (0, context.isAllowedForAlternativeFulfilment)(slot);

    if (schedulerAllows) {
      option.textContent = timeText;
      availableCount++;
    } else {
      option.textContent =
        masterWokUnverifiedTimes.has(slot.toISOString())?`${timeText} — Not verified`:`${timeText} — Unavailable`;

      option.disabled = true;
    }

    preferredTimeSelect.appendChild(option);
  }
}

  if (availableCount === 0) {
    placeholder.textContent =
      'No times available on this date';
    if (masterWokAssessment && masterWokUnverifiedTimes.size > 0) {
      placeholder.textContent = 'Times not verified — please retry';
      (0, context.showPreferredTimeMessage)('We could not verify available times. Please refresh times to try again.');
    } else if (masterWokAssessment) {
      showUnavailableBasketDialog();
    }

    preferredTimeSelect.value = '';
    preferredTimeHidden.value = '';
  }

  preferredTimeSelect.disabled = false;
  if(window.RTKApprovedReview&&new Date(window.RTKApprovedReview.preferredTime).toISOString().slice(0,10)===dateString){
    const agreedText=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(window.RTKApprovedReview.preferredTime));
    if([...preferredTimeSelect.options].some(o=>o.value===agreedText&&!o.disabled)){
      preferredTimeSelect.value=agreedText;
      preferredTimeSelect.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  console.log(
    '[preferred-time] generated slots:',
    {
      date: dateString,
      availableCount,
      basketLoad:
        typeof context.getBasketKitchenLoad === 'function'
          ? (0, context.getBasketKitchenLoad)()
          : null
    }
  );
  } finally {
    if (current()) (0, context.setAvailabilityLoading)(false);
  }
}


async function refreshPreferredTimes() {
  const date=preferredDateInput?.value;
  if(!date)return;
  const previous=preferredTimeSelect?.value||'';
  const generation=preferredTimeGeneration+1;
  await populatePreferredTimeSelect(date);
  if(generation!==preferredTimeGeneration)return;
  const option=[...preferredTimeSelect.options].find(o=>o.value===previous&&!o.disabled);
  if(previous&&option){
    preferredTimeSelect.value=previous;
    preferredTimeSelect.dispatchEvent(new Event('change',{bubbles:true}));
  }else if(previous){
    (0, context.showPreferredTimeMessage)('Please choose a time from the refreshed list.');
  }
}
document.getElementById('refresh-preferred-times')?.addEventListener('click',refreshPreferredTimes);
window.addEventListener('pageshow',event=>{
  if(event.persisted&&document.getElementById('checkout-modal')?.style.display==='flex')refreshPreferredTimes();
});

if (preferredDateInput) {
  preferredDateInput.addEventListener('change', async () => {
    const dateString = preferredDateInput.value;

    if (!dateString) {
      clearPreferredTimeSelect();
      return;
    }

    (0, context.showBlackoutBannerForDate)(
    preferredDateInput.value
  );

    await populatePreferredTimeSelect(dateString);
  });
}


document.addEventListener('change', event => {
  if (event.target.name === 'order-type' && preferredDateInput?.value === '2026-11-06') {
    populatePreferredTimeSelect(preferredDateInput.value);
  }
});

if (preferredTimeSelect) {
  preferredTimeSelect.addEventListener('change', () => {
    if (
      !preferredDateInput?.value ||
      !preferredTimeSelect.value
    ) {
      preferredTimeHidden.value = '';
      return;
    }

    preferredTimeHidden.value =
      `${preferredDateInput.value}T${preferredTimeSelect.value}`;

    console.log(
      '[preferred-time] selected:',
      preferredTimeHidden.value
    );
  });
}


  return Object.freeze({ dateInput:preferredDateInput, timeSelect:preferredTimeSelect, timeHidden:preferredTimeHidden, clear:clearPreferredTimeSelect, populate:populatePreferredTimeSelect, refresh:refreshPreferredTimes, basketKey:availabilityBasketKey, get hints(){return masterWokTimeHints;}, invalidate(){++preferredTimeGeneration;masterWokTimeHints=null;} });
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.RTKCheckoutAvailability=api;
})(typeof window!=='undefined'?window:null);
