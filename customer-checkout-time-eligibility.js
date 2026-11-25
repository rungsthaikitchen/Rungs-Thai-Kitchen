(function(root){
'use strict';
function create(context){
function toYMD(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function parseHm(dateRef, hm){ // "HH:MM" -> Date on same Y/M/D
  const [h,m] = hm.split(':').map(Number);
  const d = new Date(dateRef);
  d.setHours(h, m, 0, 0);
  return d;
}

function roundTo5Min(d){
  const ms = 5 * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function withinOpenHours(d){
  // day
  if (!context.OPEN_DAYS.includes(d.getDay())) return false;
  // time
  const start = parseHm(d, context.OPEN_WINDOW.start);
  const end   = parseHm(d, context.OPEN_WINDOW.end);
  return d >= start && d <= end;
}

function isClosedDate(d){
  const ymd = toYMD(d);

  if (context.CLOSED_DATES.includes(ymd)) return true;

  for (const r of context.CLOSED_RANGES){
    const rs = new Date(r.start);
    const re = new Date(r.end);

    // Blackout end times are exclusive:
    // 18:00–18:30 closes 18:00 through 18:25.
    if (d >= rs && d < re) return true;
  }

  return false;
}

function isFullyBooked(d) {
  return context.FULLY_BOOKED.some(win =>
    d >= win.start && d < win.end
  );
}

function isAllowed(dt){
  if(context.checkoutAvailability.hints)return withinOpenHours(dt)&&context.checkoutAvailability.hints.get(dt.toISOString())===true;
  return withinOpenHours(dt) &&
         !isClosedDate(dt) &&
         !isFullyBooked(dt) &&
         context.canBasketFitInSlot(dt);
}

function isAllowedForAlternativeFulfilment(dt) {
  if(context.checkoutAvailability.hints)return context.checkoutAvailability.hints.get(dt.toISOString())===true;
  // Must still be one of our trading days.
  if (!context.OPEN_DAYS.includes(dt.getDay())) {
    return false;
  }

  // Respect closures / fully-booked periods.
  if (isClosedDate(dt) || isFullyBooked(dt)) {
    return false;
  }

  const normalStart = parseHm(dt, context.OPEN_WINDOW.start);
  const normalEnd = parseHm(dt, context.OPEN_WINDOW.end);

  const extendedEnd = new Date(
    normalEnd.getTime() +
    context.KITCHEN_OVERRUN_MINUTES * 60 * 1000
  );

  // Alternative fulfilment may run beyond normal closing,
  // but must not begin before the normal customer opening time.
  if (dt < normalStart || dt > extendedEnd) {
    return false;
  }

  return context.canBasketFitInSlot(dt);
}

function nextAllowed(from) {
  // walk forward in 5-minute steps until we find an allowed slot (cap at +30 days)
  const cap = new Date(from);
  cap.setDate(cap.getDate() + 30);

  let t = new Date(from);
  t = roundTo5Min(t);

  while (t <= cap) {
    if (isAllowed(t)) return t;
    t = new Date(t.getTime() + 5 * 60 * 1000);
  }

  return null;
}

async function nextAlternativeFulfilment(from) {
  const cap = new Date(from);
  cap.setDate(cap.getDate() + 30);

  let t = roundTo5Min(new Date(from));

  let loadedDateKey = null;

  while (t <= cap) {
    const dateKey = toYMD(t);

    // The kitchen production map is date-specific.
    // Reload it whenever the search crosses onto another day.
    if (dateKey !== loadedDateKey) {
      await context.refreshKitchenSlotMap(t);
      loadedDateKey = dateKey;
    }

    if (isAllowedForAlternativeFulfilment(t)) {
      return t;
    }

    t = new Date(
      t.getTime() + 5 * 60 * 1000
    );
  }

  return null;
}
return {toYMD,parseHm,roundTo5Min,withinOpenHours,isClosedDate,isFullyBooked,isAllowed,isAllowedForAlternativeFulfilment,nextAllowed,nextAlternativeFulfilment};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKCheckoutTimeEligibility={create};
})(typeof window!=='undefined'?window:null);
