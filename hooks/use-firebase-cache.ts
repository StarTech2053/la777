"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Global cache store
interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  listeners: Set<(data: T[]) => void>;
}

class FirebaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  get<T>(key: string): T[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      listeners: new Set()
    });
  }

  subscribe<T>(key: string, callback: (data: T[]) => void): () => void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.listeners.add(callback);
      callback(entry.data);
    }
    
    return () => {
      const entry = this.cache.get(key);
      if (entry) {
        entry.listeners.delete(callback);
      }
    };
  }

  notify<T>(key: string, data: T[]): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.data = data;
      entry.timestamp = Date.now();
      entry.listeners.forEach(callback => callback(data));
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const firebaseCache = new FirebaseCache();

export function useFirebaseCollection<T>(
  collectionName: string,
  options?: {
    orderBy?: string;
    where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
    limit?: number;
    cacheKey?: string;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = options?.cacheKey || `${collectionName}-${JSON.stringify(options)}`;

  const fetchData = useCallback(async () => {
    try {
      console.log(`🔄 Fetching ${collectionName} from Firestore...`);
      
      let q = collection(db, collectionName);
      
      if (options?.where) {
        q = query(q, where(...options.where));
      }
      
      if (options?.orderBy) {
        q = query(q, orderBy(options.orderBy));
      }
      
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const result = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      
      console.log(`✅ Fetched ${result.length} ${collectionName} from Firestore`);
      
      // Update cache
      firebaseCache.set(cacheKey, result);
      setData(result);
      setIsLoading(false);
      
    } catch (err) {
      console.error(`❌ Error fetching ${collectionName}:`, err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [collectionName, cacheKey, options]);

  useEffect(() => {
    // Check cache first
    const cachedData = firebaseCache.get<T>(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached ${collectionName} data`);
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    // Set up real-time listener
    console.log(`🔄 Setting up real-time listener for ${collectionName}...`);
    setIsLoading(true);
    setError(null);

    let q = collection(db, collectionName);
    
    if (options?.where) {
      q = query(q, where(...options.where));
    }
    
    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy));
    }
    
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
        console.log(`✅ Real-time update: ${result.length} ${collectionName}`);
        
        // Update cache and state
        firebaseCache.set(cacheKey, result);
        setData(result);
        setIsLoading(false);
      },
      (err) => {
        console.error(`❌ Error in real-time listener for ${collectionName}:`, err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, cacheKey, options]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
}

// Utility hooks for common collections
export function usePlayers(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('players', {
    orderBy: options?.orderBy || 'joinDate',
    ...options,
    cacheKey: 'players'
  });
}

export function useGames(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('games', {
    orderBy: options?.orderBy || 'name',
    ...options,
    cacheKey: 'games'
  });
}

export function useTransactions(options?: { 
  orderBy?: string; 
  limit?: number;
  where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
}) {
  return useFirebaseCollection('transactions', {
    orderBy: options?.orderBy || 'date',
    ...options,
    cacheKey: 'transactions'
  });
}

export function useStaff(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('staff', {
    orderBy: options?.orderBy || 'createdDate',
    ...options,
    cacheKey: 'staff'
  });
}

export function usePaymentTags(options?: { 
  orderBy?: string; 
  limit?: number;
  where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
}) {
  return useFirebaseCollection('paymentTags', {
    orderBy: options?.orderBy || 'date',
    ...options,
    cacheKey: 'paymentTags'
  });
}
