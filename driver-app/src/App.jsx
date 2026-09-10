import React, { useState, useEffect } from 'react';
import DriverApp from './screens/DriverApp';
import { api } from './services/api';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [lrs, setLrs] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    api.getTrips().then(setTrips).catch(err => console.error('Failed to load trips:', err));
    api.getLRs().then(setLrs).catch(err => console.error('Failed to load LRs:', err));
    api.getDrivers().then(setDrivers).catch(err => console.error('Failed to load drivers:', err));
  }, []);

  return (
    <DriverApp 
      trips={trips} 
      setTrips={setTrips} 
      lrs={lrs} 
      setLrs={setLrs} 
      drivers={drivers} 
    />
  );
}
