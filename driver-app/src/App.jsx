import React, { useState, useEffect, useCallback } from 'react';
import DriverApp from './screens/DriverApp';
import { api } from './services/api';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [lrs, setLrs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshData = useCallback(() => {
    setIsSyncing(true);
    return Promise.all([
      api.getTrips().then(setTrips).catch(err => console.error('Failed to load trips:', err)),
      api.getLRs().then(setLrs).catch(err => console.error('Failed to load LRs:', err)),
      api.getDrivers().then(setDrivers).catch(err => console.error('Failed to load drivers:', err)),
      api.getManifests().then(setManifests).catch(err => console.error('Failed to load manifests:', err))
    ]).finally(() => {
      setLastSyncTime(Date.now());
      setIsSyncing(false);
    });
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Live polling every 3.5 seconds to link real-time with Admin Dashboard & PostgreSQL
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 3500);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Sync on tab / window focus
  useEffect(() => {
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshData]);

  return (
    <DriverApp 
      trips={trips} 
      setTrips={setTrips} 
      lrs={lrs} 
      setLrs={setLrs} 
      drivers={drivers} 
      manifests={manifests}
      refreshData={refreshData}
      lastSyncTime={lastSyncTime}
      isSyncing={isSyncing}
    />
  );
}
