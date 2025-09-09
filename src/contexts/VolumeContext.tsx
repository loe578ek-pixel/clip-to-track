import React, { createContext, useContext, useState, useEffect } from 'react';

interface VolumeContextType {
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
}

const VolumeContext = createContext<VolumeContextType | undefined>(undefined);

export const VolumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterVolume, setMasterVolumeState] = useState(65); // Default to 65%

  // Load volume from localStorage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('soundwave_master_volume');
    if (savedVolume) {
      setMasterVolumeState(Number(savedVolume));
    }
  }, []);

  const setMasterVolume = (volume: number) => {
    setMasterVolumeState(volume);
    localStorage.setItem('soundwave_master_volume', volume.toString());
  };

  return (
    <VolumeContext.Provider value={{ masterVolume, setMasterVolume }}>
      {children}
    </VolumeContext.Provider>
  );
};

export const useVolume = () => {
  const context = useContext(VolumeContext);
  if (context === undefined) {
    throw new Error('useVolume must be used within a VolumeProvider');
  }
  return context;
};