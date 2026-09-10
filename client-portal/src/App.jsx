import React, { useState, useEffect } from 'react';
import ClientPortal from './screens/ClientPortal';
import LoginPage from './screens/LoginPage';
import { api } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [lrs, setLrs] = useState([]);
  const [parties, setParties] = useState([]);

  useEffect(() => {
    if (currentUser) {
      api.getLRs().then(setLrs).catch(err => console.error('Failed to load LRs:', err));
      api.getParties().then(setParties).catch(err => console.error('Failed to load Parties:', err));
    }
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <ClientPortal 
      lrs={lrs} 
      currentUser={currentUser} 
      parties={parties} 
      onLogout={handleLogout}
    />
  );
}
