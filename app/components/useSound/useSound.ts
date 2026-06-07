import { useCallback } from 'react';

export const useSound = (src: string, volume = 0.3, storageKey?: string) => {
  return useCallback(() => {
    if (storageKey) {
      const setting = localStorage.getItem(storageKey);
      if (setting === "off") {
        return;
      }
    }
    
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  }, [src, volume, storageKey]);
};