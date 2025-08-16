"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useWithdrawNotifications() {
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<Date>(new Date());

  useEffect(() => {
    // Listen for new withdraw requests
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'transactions'),
        where('type', '==', 'Withdraw'),
        where('status', '==', 'pending')
      ),
      (querySnapshot) => {
        const newRequests = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          const requestTime = new Date(data.date);
          return requestTime > lastCheckedTime;
        });

        if (newRequests.length > 0) {
          setHasNewRequests(true);
          // Auto-clear notification after 15 seconds
          setTimeout(() => {
            setHasNewRequests(false);
            setLastCheckedTime(new Date());
          }, 15000);
        }
      },
      (error) => {
        console.error('Error listening for withdraw notifications:', error);
      }
    );

    return () => unsubscribe();
  }, [lastCheckedTime]);

  const clearNotification = () => {
    setHasNewRequests(false);
    setLastCheckedTime(new Date());
  };

  return {
    hasNewRequests,
    clearNotification
  };
}
