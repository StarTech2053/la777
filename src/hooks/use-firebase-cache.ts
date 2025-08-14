"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, limit, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFirebaseCollection<T>(
  collectionName: string,
  options?: {
    orderBy?: string;
    where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
    limit?: number;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log(`🔄 Fetching ${collectionName} from Firestore...`);
      setIsLoading(true);
      
      let q: Query = collection(db, collectionName);
      
      if (options?.where) {
        q = query(q, where(...options.where));
      }
      
      if (options?.orderBy) {
        q = query(q, orderBy(options.orderBy, 'desc')); // Always sort in descending order
      }
      
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const result = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      
      console.log(`✅ Fetched ${result.length} ${collectionName} from Firestore`);
      setData(result);
      setError(null);
      
    } catch (err) {
      console.error(`❌ Error fetching ${collectionName}:`, err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, options?.where, options?.orderBy, options?.limit]);

  useEffect(() => {
    fetchData();
  }, [collectionName, options?.where, options?.orderBy, options?.limit]);

  const refresh = useCallback(async () => {
    console.log(`🔄 Manual refresh triggered for ${collectionName}`);
    await fetchData();
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
    orderBy: options?.orderBy || 'joinDate', // Sort by joinDate by default
    ...options
  });
}

export function useGames(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('games', {
    orderBy: options?.orderBy || 'name', // Sort by name by default
    ...options
  });
}

export function useTransactions(options?: { 
  orderBy?: string; 
  limit?: number;
  where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
}) {
  return useFirebaseCollection('transactions', {
    orderBy: options?.orderBy || 'date', // Sort by date by default
    ...options
  });
}

export function useStaff(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('staff', {
    orderBy: options?.orderBy || 'createdAt', // Sort by creation date
    ...options
  });
}

export function usePaymentTags(options?: { 
  orderBy?: string; 
  limit?: number;
  where?: [string, '==' | '!=' | '<' | '>' | '<=', any];
}) {
  return useFirebaseCollection('paymentTags', {
    orderBy: options?.orderBy || 'createdAt', // Sort by creation date
    ...options
  });
}
