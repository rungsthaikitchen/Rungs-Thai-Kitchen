(function(root){
'use strict';
function create({sb,window,allocateLoadBackwards,forceAllocateExistingLoad}){
function getEffectiveOrderTime(order) {
  // An explicitly confirmed adjusted time is always authoritative.
  if (order.confirmed_time) {
    return order.confirmed_time;
  }

  // Customer rejected the proposed time.
  // The original requested time was already unavailable,
  // so don't reserve capacity until another time is agreed/offered.
  if (
    order.status === 'pending' &&
    order.proposed_time
  ) {
    return null;
  }

  // A proposed replacement time is the best operational time we have.
  // This covers both an active proposal and an order subsequently
  // progressed/completed without confirmed_time being populated.
  if (order.proposed_time) {
    return order.proposed_time;
  }

  // Normal untouched order.
  return order.preferred_time;
}

function buildKitchenProductionMap(orders) {
  const productionMap = new Map();

  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(getEffectiveOrderTime(a)) -
      new Date(getEffectiveOrderTime(b))
  );

  for (const order of sortedOrders) {
    const effectiveTime = getEffectiveOrderTime(order);

    if (!effectiveTime) continue;

    const load =
      getExistingOrderKitchenLoad(order);

    if (load <= 0) continue;

    const readyTime =
      new Date(effectiveTime);

    const result = allocateLoadBackwards(
      readyTime,
      load,
      productionMap
    );

    if (!result.success) {
  const forced =
    forceAllocateExistingLoad(
      readyTime,
      load,
      productionMap
    );

  console.warn(
    '[kitchen-schedule] existing order exceeds available capacity:',
    {
      orderId: order.id,
      preferredTime: order.preferred_time,
      proposedTime: order.proposed_time,
      confirmedTime: order.confirmed_time,
      effectiveTime,
      load,
      conflicts: forced.conflicts
    }
  );
}
  }

  return productionMap;
}

async function loadKitchenScheduleForDate(serviceDate) {
  const start = new Date(serviceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await sb
    .from('orders')
    .select(`
      id,
      preferred_time,
      proposed_time,
      confirmed_time,
      status,
      is_test,
      capacity_scheduler,
      order_items (
        qty,
        kitchen_load
      )
    `)
    .or([
      `and(preferred_time.gte.${start.toISOString()},preferred_time.lt.${end.toISOString()})`,
      `and(proposed_time.gte.${start.toISOString()},proposed_time.lt.${end.toISOString()})`,
      `and(confirmed_time.gte.${start.toISOString()},confirmed_time.lt.${end.toISOString()})`
    ].join(','))
    .eq('is_test', false);

  if (error) {
    console.warn('[kitchen-schedule] fetch failed', error);
    return [];
  }

  return window.RTKBookingCapacityRows(data||[],start,end);
}

function getExistingOrderKitchenLoad(order) {
  return (order.order_items || []).reduce(
    (total, line) =>
      total +
      Number(line.kitchen_load || 0) *
      Number(line.qty || 0),
    0
  );
}
return {getEffectiveOrderTime,buildKitchenProductionMap,loadKitchenScheduleForDate,getExistingOrderKitchenLoad};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKLegacyKitchenSchedule={create};
})(typeof window!=='undefined'?window:null);
