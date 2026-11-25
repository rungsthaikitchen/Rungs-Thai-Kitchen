(function(root){
'use strict';
function create({SLOT_MINUTES,KITCHEN_START_HOUR,KITCHEN_START_MINUTE,KITCHEN_STEP_MINUTES}){
function getKitchenStartForDate(dt) {
  const start = new Date(dt);

  start.setHours(
    KITCHEN_START_HOUR,
    KITCHEN_START_MINUTE,
    0,
    0
  );

  return start;
}

function getLatestProductionSlotStart(readyTime) {
  // Find the latest COMPLETE 15-minute kitchen slot
  // that finishes on or before the customer's ready time.
  const t = new Date(
    readyTime.getTime() -
    SLOT_MINUTES * 60 * 1000
  );

  const minutes = t.getMinutes();

  t.setMinutes(
    Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES,
    0,
    0
  );

  return t;
}

function allocateLoadBackwards(
  readyTime,
  load,
  slotMap
) {
  const requiredSteps = Number(load || 0);

  if (requiredSteps <= 0) {
    return {
      success: true,
      slotMap
    };
  }

  const kitchenStart =
    getKitchenStartForDate(readyTime);

  // Work backwards in continuous 5-minute steps
  let slot = new Date(
    readyTime.getTime() -
    KITCHEN_STEP_MINUTES * 60 * 1000
  );

  const slotsNeeded = [];

  for (let i = 0; i < requiredSteps; i++) {

    // Would this push production before the kitchen starts?
    if (slot < kitchenStart) {
      return {
        success: false,
        slotMap
      };
    }

    const key = slot.toISOString();

    // Any occupied step breaks the continuous run
    if ((slotMap.get(key) || 0) > 0) {
      return {
        success: false,
        slotMap
      };
    }

    slotsNeeded.push(key);

    slot = new Date(
      slot.getTime() -
      KITCHEN_STEP_MINUTES * 60 * 1000
    );
  }

  // Only reserve the slots once we've proved the
  // ENTIRE continuous run is available.
  for (const key of slotsNeeded) {
    slotMap.set(key, 1);
  }

  return {
    success: true,
    slotMap
  };
}

function forceAllocateExistingLoad(
  readyTime,
  load,
  slotMap
) {
  const requiredSteps = Number(load || 0);

  if (requiredSteps <= 0) {
    return {
      overCapacity: false,
      conflicts: []
    };
  }

  const kitchenStart =
    getKitchenStartForDate(readyTime);

  let slot = new Date(
    readyTime.getTime() -
    KITCHEN_STEP_MINUTES * 60 * 1000
  );

  const conflicts = [];

  for (let i = 0; i < requiredSteps; i++) {
    if (slot < kitchenStart) {
      break;
    }

    const key = slot.toISOString();
    const existingLoad = slotMap.get(key) || 0;

    if (existingLoad > 0) {
      conflicts.push({
        time: key,
        existingLoad,
        newLoad: existingLoad + 1
      });
    }

    slotMap.set(
      key,
      existingLoad + 1
    );

    slot = new Date(
      slot.getTime() -
      KITCHEN_STEP_MINUTES * 60 * 1000
    );
  }

  return {
    overCapacity: conflicts.length > 0,
    conflicts
  };
}
return {getKitchenStartForDate,getLatestProductionSlotStart,allocateLoadBackwards,forceAllocateExistingLoad};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKLegacyKitchenAllocator={create};
})(typeof window!=='undefined'?window:null);
