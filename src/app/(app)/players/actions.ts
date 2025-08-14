"use server";

import { doc, updateDoc, collection, setDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(require('@/lib/serviceAccountKey.json')),
  });
}

const adminDb = getFirestore();

export async function updatePlayerAvatar({ playerId, avatarUrl }: { playerId: string, avatarUrl: string }) {
    try {
        console.log("🔄 Updating player avatar:", playerId, avatarUrl);
        
        const playerRef = doc(db, 'players', playerId);
        await updateDoc(playerRef, {
            avatarUrl: avatarUrl,
            lastUpdated: new Date().toISOString()
        });
        
        console.log("✅ Player avatar updated successfully");
        return { success: true };
    } catch (error) {
        console.error("❌ Error updating player avatar:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to update avatar" 
        };
    }
}

export async function addPlayer(playerData: any) {
    try {
        console.log("🔄 Adding new player using Admin SDK:", playerData);
        
        // Use Firebase Admin SDK to bypass client-side authentication
        const playerRef = adminDb.collection('players').doc();
        const playerDoc = {
            ...playerData,
            id: playerRef.id,
            joinDate: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            status: 'Active',
            createdAt: new Date().toISOString(),
            // Add default stats object
            stats: {
                tFreePlay: 0,
                tDeposit: 0,
                tWithdraw: 0,
                tBonusPlay: 0,
                tReferralBonus: 0,
                pAndL: 0
            },
            // Add default arrays
            gamingAccounts: [],
            transactions: []
        };
        
        console.log("📝 Creating player document:", playerDoc);
        await playerRef.set(playerDoc);
        
        console.log("✅ Player added successfully with ID:", playerRef.id);
        return { success: true, id: playerRef.id };
    } catch (error) {
        console.error("❌ Error adding player:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to add player" 
        };
    }
}

export async function editPlayer(playerId: string, playerData: any) {
    try {
        const playerRef = doc(db, 'players', playerId);
        await updateDoc(playerRef, {
            ...playerData,
            lastUpdated: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to edit player" };
    }
}

export async function deletePlayers(playerIds: string[]) {
    try {
        const batch = writeBatch(db);
        playerIds.forEach(id => {
            const playerRef = doc(db, 'players', id);
            batch.delete(playerRef);
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete players" };
    }
}

export async function addGamingAccount(playerId: string, gameAccount: any) {
    try {
        const playerRef = doc(db, 'players', playerId);
        await updateDoc(playerRef, {
            gamingAccounts: arrayUnion(gameAccount)
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to add gaming account" };
    }
}

export async function processTransaction(transactionData: any) {
    try {
        const transactionRef = doc(collection(db, 'transactions'));
        await setDoc(transactionRef, {
            ...transactionData,
            id: transactionRef.id,
            date: new Date().toISOString()
        });
        return { success: true, id: transactionRef.id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to process transaction" };
    }
}

export async function processCredit(creditData: any) {
    try {
        const transactionRef = doc(collection(db, 'transactions'));
        await setDoc(transactionRef, {
            ...creditData,
            id: transactionRef.id,
            date: new Date().toISOString()
        });
        return { success: true, id: transactionRef.id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to process credit" };
    }
}

export async function processReferral(referralData: any) {
    try {
        const transactionRef = doc(collection(db, 'transactions'));
        await setDoc(transactionRef, {
            ...referralData,
            id: transactionRef.id,
            date: new Date().toISOString()
        });
        return { success: true, id: transactionRef.id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to process referral" };
    }
}
