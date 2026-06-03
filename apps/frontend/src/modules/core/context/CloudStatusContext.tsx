import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CloudStatusType } from '../../../components/brand/CloudStatus';

interface CloudStatusContextType {
  status: CloudStatusType;
  setStatus: (status: CloudStatusType) => void;
  isSimulating: boolean;
  setIsSimulating: (isSimulating: boolean) => void;
  triggerSync: () => Promise<void>;
}

const CloudStatusContext = createContext<CloudStatusContextType | undefined>(undefined);

export const CloudStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<CloudStatusType>('online');
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setStatus('syncing');
      const timer = setTimeout(() => {
        setStatus('online');
      }, 3000);
      return () => clearTimeout(timer);
    }, 20000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const triggerSync = async () => {
    const wasSimulating = isSimulating;
    setIsSimulating(false);
    setStatus('syncing');
    
    // Simulate a network syncing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setStatus('online');
    if (wasSimulating) {
      setIsSimulating(true);
    }
  };

  return (
    <CloudStatusContext.Provider value={{ status, setStatus, isSimulating, setIsSimulating, triggerSync }}>
      {children}
    </CloudStatusContext.Provider>
  );
};

export const useCloudStatus = () => {
  const context = useContext(CloudStatusContext);
  if (!context) {
    throw new Error('useCloudStatus must be used within a CloudStatusProvider');
  }
  return context;
};
