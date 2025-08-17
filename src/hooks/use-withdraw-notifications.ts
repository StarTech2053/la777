"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useWithdrawNotifications() {
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<Date>(() => {
    // Initialize with stored time or current time
    const stored = localStorage.getItem('withdrawLastChecked');
    return stored ? new Date(stored) : new Date();
  });

  useEffect(() => {
    // Check for existing notification on mount
    const storedNotification = localStorage.getItem('withdrawNotification');
    if (storedNotification === 'true') {
      setHasNewRequests(true);
    }

    // Listen for withdraw requests
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'transactions'),
        where('type', '==', 'Withdraw'),
        where('status', '==', 'pending')
      ),
      (querySnapshot) => {
        // Check if there are any pending requests
        const pendingRequests = querySnapshot.docs;
        
        if (pendingRequests.length === 0) {
          // No pending requests, clear notification
          setHasNewRequests(false);
          localStorage.removeItem('withdrawNotification');
          return;
        }

        // Check for new requests (created after lastCheckedTime)
        const newRequests = pendingRequests.filter(doc => {
          const data = doc.data();
          const requestTime = new Date(data.date);
          return requestTime > lastCheckedTime;
        });

        if (newRequests.length > 0) {
          setHasNewRequests(true);
          localStorage.setItem('withdrawNotification', 'true');
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
    const newTime = new Date();
    setLastCheckedTime(newTime);
    localStorage.setItem('withdrawLastChecked', newTime.toISOString());
    localStorage.removeItem('withdrawNotification');
  };

  return {
    hasNewRequests,
    clearNotification
  };
}
