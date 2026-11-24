(function(root){
'use strict';
function create(context){
const {document,console,fetch}=context;
async function loadBlackouts() {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);

  const { data, error } = await context.sb
    .from('booking_blackouts')
    .select('kind,start_at,end_at,message,active')
    .eq('active', true)
    // overlap test (start < horizon && end > now)
    .lt('start_at', horizon.toISOString())
    .gt('end_at',  now.toISOString());

  if (error) {
    console.warn('[blackouts] fetch failed', error);
    return;
  }

  context.CLOSED_RANGES = [];
  context.FULLY_BOOKED  = [];

  (data || []).forEach(row => {
    const win = {
      start: new Date(row.start_at),
      end:   new Date(row.end_at),
      message: row.message || ''
    };
    if (row.kind === 'closed')       context.CLOSED_RANGES.push(win);
    if (row.kind === 'fully_booked') context.FULLY_BOOKED.push(win);
  });
  
  console.log('[blackouts] loaded rows:', data);
console.log('[blackouts] CLOSED_RANGES:', context.CLOSED_RANGES);
console.log('[blackouts] FULLY_BOOKED:', context.FULLY_BOOKED);
}
function renderServiceStatusNotice() {
  if (!context.serviceStatusNotice) return;

  const mode = context.SERVICE_STATE.mode || 'normal';

  if (mode === 'normal') {
    context.serviceStatusNotice.hidden = true;
    context.serviceStatusNotice.innerHTML = '';
    return;
  }

  const titleByMode = {
    busy: '🍜 We’re a little busy tonight',
    very_busy: '🔥 We’re very busy tonight',
    paused: '⏸️ Online orders are temporarily paused'
  };

  const title = titleByMode[mode] || '';
  const message = context.SERVICE_STATE.customer_message || '';

  context.serviceStatusNotice.innerHTML =
    `<strong>${title}</strong>`;

  if (message) {
    context.serviceStatusNotice.appendChild(
      document.createElement('br')
    );

    context.serviceStatusNotice.appendChild(
      document.createTextNode(message)
    );
  }

  context.serviceStatusNotice.hidden = false;
}
async function loadServiceState() {
  try {
    const response = await fetch(
      '/api/service-state'
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to load service state'
      );
    }

    context.SERVICE_STATE =
      data.effective_service_state || context.SERVICE_STATE;

    renderServiceStatusNotice();

    console.log(
      '[service-state] loaded:',
      context.SERVICE_STATE
    );

  } catch (error) {
    console.warn(
      '[service-state] fetch failed:',
      error
    );
  }
}
function inAnyWindow(dt, windows) {
  const t = +dt;
  return windows.find(w => t >= +w.start && t <= +w.end) || null;
}
function showCheckoutBanner(kind, msg) {
  const el = document.getElementById('checkout-banner');
  if (!el) return;
  el.className = 'checkout-banner ' + (kind === 'closed'
    ? 'checkout-banner--closed'
    : 'checkout-banner--fullybooked');

  el.innerHTML = `
    <button class="x" aria-label="Dismiss" onclick="this.parentElement.style.display='none'">×</button>
    ${msg}
  `;
  el.style.display = 'block';
}
function hideCheckoutBanner() {
  const el = document.getElementById('checkout-banner');
  if (el) { el.style.display = 'none'; el.textContent = ''; el.className = 'checkout-banner'; }
}
function showBlackoutBannerForDate(dateString) {
  hideCheckoutBanner();

  if (!dateString) return;

  const dayStart =
    new Date(`${dateString}T00:00:00`);

  const dayEnd =
    new Date(`${dateString}T23:59:59`);

  // A closure takes priority if both kinds somehow overlap.
  const closedWindow =
    context.CLOSED_RANGES.find(win =>
      win.start <= dayEnd &&
      win.end >= dayStart
    );

  if (closedWindow) {
    showCheckoutBanner(
      'closed',
      closedWindow.message ||
        'Sorry, we are closed during this service.'
    );
  }
}
return {loadBlackouts,renderServiceStatusNotice,loadServiceState,inAnyWindow,showCheckoutBanner,hideCheckoutBanner,showBlackoutBannerForDate};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCheckoutService=api;
})(typeof window==='undefined'?null:window);
