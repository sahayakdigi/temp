/**
 * Shared helper to evaluate truck and driver availability across all portals.
 * Enforces the rule: A truck and driver must complete and deliver their current trip
 * before they can be assigned to another trip or manifest.
 */

export const isTruckAvailable = (truckReg, trips = [], manifests = [], trucks = []) => {
  if (!truckReg) return { available: true };
  const cleanReg = truckReg.replace(/\s+/g, '').toUpperCase();

  // 1. Check active FTL trips (status not 'Delivered' and not 'Cancelled')
  const activeTrip = (trips || []).find(t => {
    const rawNo = t.truckNo || t.truck_no;
    if (!rawNo) return false;
    const tReg = String(rawNo).replace(/\s+/g, '').toUpperCase();
    return tReg === cleanReg && !['Delivered', 'Cancelled'].includes(t.status);
  });

  if (activeTrip) {
    return {
      available: false,
      reason: `On Trip ${activeTrip.id} (${activeTrip.status || 'Active'})`,
      type: 'trip',
      activeId: activeTrip.id,
      status: activeTrip.status || 'Active'
    };
  }

  // 2. Check active Line-Haul Manifests (status not in Delivered, Completed, Received, Cancelled)
  const activeManifest = (manifests || []).find(m => {
    const rawNo = m.vehicleNo || m.vehicle_no;
    if (!rawNo) return false;
    const mReg = String(rawNo).replace(/\s+/g, '').toUpperCase();
    return mReg === cleanReg && !['Delivered', 'Completed', 'Received', 'Cancelled'].includes(m.status);
  });

  if (activeManifest) {
    return {
      available: false,
      reason: `On Manifest ${activeManifest.id} (${activeManifest.status || 'Active'})`,
      type: 'manifest',
      activeId: activeManifest.id,
      status: activeManifest.status || 'Active'
    };
  }

  // 3. Check truck master status if available
  const truckMaster = (trucks || []).find(t => {
    const reg = String(t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase();
    return reg === cleanReg;
  });

  if (truckMaster) {
    if (truckMaster.status === 'Maintenance') {
      return { available: false, reason: 'In Maintenance', type: 'maintenance' };
    }
    if (truckMaster.status === 'Suspended') {
      return { available: false, reason: 'Suspended / Inactive', type: 'suspended' };
    }
    // Only block for InTransit if an active trip/manifest actually confirms it
    if (truckMaster.status === 'InTransit' && (activeTrip || activeManifest)) {
      return { available: false, reason: 'On Active Journey', type: 'intransit' };
    }
  }

  return { available: true };
};

export const isDriverAvailable = (driverIdOrName, trips = [], manifests = [], drivers = []) => {
  if (!driverIdOrName) return { available: true };
  const str = String(driverIdOrName).trim().toLowerCase();
  if (str === 'drv-hired') return { available: true }; // Custom hired driver placeholder

  // 1. Check active FTL trips
  const activeTrip = (trips || []).find(t => {
    if (['Delivered', 'Cancelled'].includes(t.status)) return false;
    const dId = t.driverId || t.driver_id;
    const dName = t.driverName || t.driver_name;
    const matchId = dId && String(dId).trim().toLowerCase() === str;
    const matchName = dName && String(dName).trim().toLowerCase() === str;
    return matchId || matchName;
  });

  if (activeTrip) {
    return {
      available: false,
      reason: `On Trip ${activeTrip.id} (${activeTrip.status || 'Active'})`,
      type: 'trip',
      activeId: activeTrip.id,
      status: activeTrip.status || 'Active'
    };
  }

  // 2. Check active Line-Haul Manifests
  const activeManifest = (manifests || []).find(m => {
    if (['Delivered', 'Completed', 'Received', 'Cancelled'].includes(m.status)) return false;
    const dName = m.driverName || m.driver_name;
    const dId = m.driverId || m.driver_id;
    const matchName = dName && String(dName).trim().toLowerCase() === str;
    const matchId = dId && String(dId).trim().toLowerCase() === str;
    return matchName || matchId;
  });

  if (activeManifest) {
    return {
      available: false,
      reason: `On Manifest ${activeManifest.id} (${activeManifest.status || 'Active'})`,
      type: 'manifest',
      activeId: activeManifest.id,
      status: activeManifest.status || 'Active'
    };
  }

  // 3. Check driver master status
  const driverMaster = (drivers || []).find(d => 
    String(d.id).trim().toLowerCase() === str || 
    (d.name && String(d.name).trim().toLowerCase() === str)
  );

  if (driverMaster) {
    if (driverMaster.status === 'Blacklisted') {
      return { available: false, reason: 'Blacklisted', type: 'blacklisted' };
    }
    if (driverMaster.status === 'Suspended') {
      return { available: false, reason: 'Suspended / Inactive', type: 'suspended' };
    }
  }

  return { available: true };
};
