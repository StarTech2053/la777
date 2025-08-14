
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Staff } from '@/lib/types';

type UserRole = 'Admin' | 'Agent' | 'Cashier' | null;

interface AuthState {
  isAuthenticated: boolean | null;
  role: UserRole;
  name: string | null;
  email: string | null;
  user: User | null;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    role: null,
    name: null,
    email: null,
    user: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDoc = await getDoc(staffDocRef);

        if (staffDoc.exists()) {
          const staffData = staffDoc.data() as Staff;
          setAuthState({
            isAuthenticated: true,
            user,
            name: staffData.name,
            email: user.email,
            role: staffData.role,
          });
        } else {
          // Handle case where user exists in Auth but not in staff collection
          setAuthState({
            isAuthenticated: true,
            user,
            name: user.displayName || 'User',
            email: user.email,
            role: null, // Or a default/guest role
          });
        }

      } else {
        // User is signed out
        setAuthState({
          isAuthenticated: false,
          user: null,
          name: null,
          email: null,
          role: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return authState;
}
