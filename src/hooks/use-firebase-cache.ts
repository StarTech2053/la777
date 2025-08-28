"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, where, limit, Query, onSnapshot, doc, onSnapshot as onDocSnapshot } from 'firebase/firestore';
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

  useEffect(() => {
    console.log(`🔄 Setting up real-time listener for ${collectionName}...`);
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

    // Real-time listener
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const result = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
        console.log(`✅ Real-time update for ${collectionName}: ${result.length} documents`);
        setData(result);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error(`❌ Real-time listener error for ${collectionName}:`, err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    // Cleanup function
    return () => {
      console.log(`🛑 Cleaning up real-time listener for ${collectionName}`);
      unsubscribe();
    };
  }, [collectionName, options?.where, options?.orderBy, options?.limit]);

  const refresh = useCallback(async () => {
    console.log(`🔄 Manual refresh triggered for ${collectionName} (real-time listener will handle updates)`);
    // With real-time listeners, manual refresh is not needed
    // But we keep it for compatibility
  }, [collectionName]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
}

// Real-time document listener
export function useFirebaseDocument<T>(
  collectionName: string,
  documentId: string
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    console.log(`🔄 Setting up real-time document listener for ${collectionName}/${documentId}...`);
    setIsLoading(true);
    
    const docRef = doc(db, collectionName, documentId);
    
    const unsubscribe = onDocSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const result = { ...docSnap.data(), id: docSnap.id } as T;
          console.log(`✅ Real-time document update for ${collectionName}/${documentId}`);
          setData(result);
        } else {
          console.log(`📄 Document ${collectionName}/${documentId} does not exist`);
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error(`❌ Real-time document listener error for ${collectionName}/${documentId}:`, err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => {
      console.log(`🛑 Cleaning up real-time document listener for ${collectionName}/${documentId}`);
      unsubscribe();
    };
  }, [collectionName, documentId]);

  return {
    data,
    isLoading,
    error
  };
}

// Utility hooks for common collections
export function usePlayers(options?: { orderBy?: string; limit?: number }) {
  return useFirebaseCollection('players', {
    orderBy: options?.orderBy || 'joinDate', // Sort by joinDate by default (descending - newest first)
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

// Real-time player document hook
export function usePlayer(playerId: string) {
  return useFirebaseDocument('players', playerId);
}

// Real-time game document hook
export function useGame(gameId: string) {
  return useFirebaseDocument('games', gameId);
}

// Real-time transaction document hook
export function useTransaction(transactionId: string) {
  return useFirebaseDocument('transactions', transactionId);
}
