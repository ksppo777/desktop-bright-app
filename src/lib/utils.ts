import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getStorage, setStorage } from './storage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A custom hook for persistent storage using Capacitor Preferences
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  useEffect(() => {
    async function loadStoredValue() {
      try {
        const item = await getStorage(key);
        if (item !== null) {
          setStoredValue(item);
        }
      } catch (error) {
        console.warn(`Error reading storage key "${key}":`, error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadStoredValue();
    
    // Listen for cross-component storage changes
    const handleStorageChange = (e: any) => {
      if (e.type === 'capacitor-storage-clear') {
        setStoredValue(initialValueRef.current);
        return;
      }
      const { key: changedKey, value } = e.detail || {};
      if (changedKey === key && value !== undefined) {
        setStoredValue(value);
      }
    };

    window.addEventListener('capacitor-storage-change', handleStorageChange);
    window.addEventListener('capacitor-storage-clear', handleStorageChange);

    return () => {
      window.removeEventListener('capacitor-storage-change', handleStorageChange);
      window.removeEventListener('capacitor-storage-clear', handleStorageChange);
    };
  }, [key]);

  const setValue = useCallback(async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await setStorage(key, valueToStore);
    } catch (error) {
      console.warn(`Error setting storage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, isLoaded] as const;
}