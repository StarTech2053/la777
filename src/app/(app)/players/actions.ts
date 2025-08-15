"use server";

import { doc, updateDoc, collection, setDoc, writeBatch, arrayUnion, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        console.log("🔄 Adding new player:", playerData);
        
        // Use Firebase client SDK
        const playerRef = doc(collection(db, 'players'));
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
        await setDoc(playerRef, playerDoc);
        
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

export async function editPlayer(playerData: any) {
    try {
        const { playerId, ...updateData } = playerData;
        const playerRef = doc(db, 'players', playerId);
        
        // Remove undefined values
        const cleanData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );
        
        await updateDoc(playerRef, {
            ...cleanData,
            lastUpdated: new Date().toISOString()
        });
        
        console.log("✅ Player updated successfully:", playerId);
        return { success: true };
    } catch (error) {
        console.error("❌ Error updating player:", error);
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
        console.log("🔄 Processing credit transaction:", creditData);
        
        const { playerId, type, amount, gameName, staffName } = creditData;
        
        // Find the game document
        const gamesQuery = query(collection(db, "games"), where("name", "==", gameName));
        const gamesSnap = await getDocs(gamesQuery);

        if (gamesSnap.empty) {
            throw new Error(`Game "${gameName}" not found.`);
        }
        
        const gameDoc = gamesSnap.docs[0];
        const gameRef = gameDoc.ref;
        const currentGameBalance = gameDoc.data().balance || 0;
        
        // Check if game has sufficient balance for free play
        if (currentGameBalance < amount) {
            throw new Error(`Insufficient game balance. Game "${gameName}" has $${currentGameBalance.toLocaleString()} but amount needed is $${amount.toLocaleString()}.`);
        }
        
        // Create transaction document
        const transactionRef = doc(collection(db, 'transactions'));
        const transactionData = {
            ...creditData,
            id: transactionRef.id,
            date: new Date().toISOString(),
            playerName: creditData.playerName || 'Unknown',
            status: 'Approved' as const,
            amount: amount,
            points: amount, // Store amount as points for games section
            gameBalanceBefore: currentGameBalance,
            gameBalanceAfter: currentGameBalance - amount
        };
        
        // Update player stats based on credit type
        const playerRef = doc(db, 'players', playerId);
        let playerUpdate: { [key: string]: any } = {};
        
        if (type === 'Freeplay') {
            playerUpdate['stats.tFreePlay'] = increment(amount);
        } else if (type === 'Bonusplay') {
            playerUpdate['stats.tBonusPlay'] = increment(amount);
        }
        
        // Update player's last activity
        playerUpdate['lastActivity'] = new Date().toISOString();
        
        // Update game balance (deduct the amount)
        const gameUpdate = {
            'balance': increment(-amount)
        };
        
        // Use batch write to ensure all operations succeed or fail together
        const batch = writeBatch(db);
        batch.set(transactionRef, transactionData);
        batch.update(playerRef, playerUpdate);
        batch.update(gameRef, gameUpdate);
        
        await batch.commit();
        
        console.log("✅ Credit transaction processed successfully:", {
            transactionId: transactionRef.id,
            playerId: playerId,
            type: type,
            amount: amount,
            gameBalanceBefore: currentGameBalance,
            gameBalanceAfter: currentGameBalance - amount
        });
        
        return { success: true, id: transactionRef.id };
    } catch (error) {
        console.error("❌ Error processing credit transaction:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to process credit" };
    }
}

export async function processReferral(referralData: any) {
    try {
        console.log("🔄 Processing referral transaction:", referralData);
        
        const { playerId, referralId, amount, gameName, staffName } = referralData;
        
        // Find the game document
        const gamesQuery = query(collection(db, "games"), where("name", "==", gameName));
        const gamesSnap = await getDocs(gamesQuery);

        if (gamesSnap.empty) {
            throw new Error(`Game "${gameName}" not found.`);
        }
        
        const gameDoc = gamesSnap.docs[0];
        const gameRef = gameDoc.ref;
        const currentGameBalance = gameDoc.data().balance || 0;
        
        // Check if game has sufficient balance for referral bonus
        if (currentGameBalance < amount) {
            throw new Error(`Insufficient game balance. Game "${gameName}" has $${currentGameBalance.toLocaleString()} but amount needed is $${amount.toLocaleString()}.`);
        }
        
        // Find the player who is getting the referral bonus
        const playerQuery = query(collection(db, "players"), where("id", "==", playerId));
        const playerSnap = await getDocs(playerQuery);
        
        if (playerSnap.empty) {
            throw new Error(`Player not found.`);
        }
        
        const playerDoc = playerSnap.docs[0];
        const playerName = playerDoc.data().name;
        
        // Create transaction document
        const transactionRef = doc(collection(db, 'transactions'));
        const transactionData = {
            ...referralData,
            id: transactionRef.id,
            date: new Date().toISOString(),
            playerName: playerName, // Use actual player name
            type: 'Referral' as const,
            status: 'Approved' as const,
            amount: amount,
            points: amount, // Store amount as points for games section
            gameBalanceBefore: currentGameBalance,
            gameBalanceAfter: currentGameBalance - amount
        };
        
        // Update player stats (referral bonus)
        const playerRef = doc(db, 'players', playerId);
        const playerUpdate = {
            'stats.tReferralBonus': increment(amount),
            'lastActivity': new Date().toISOString()
        };
        
        // Update game balance (deduct the amount)
        const gameUpdate = {
            'balance': increment(-amount)
        };
        
        // Use batch write to ensure all operations succeed or fail together
        const batch = writeBatch(db);
        batch.set(transactionRef, transactionData);
        batch.update(playerRef, playerUpdate);
        batch.update(gameRef, gameUpdate);
        
        await batch.commit();
        
        console.log("✅ Referral transaction processed successfully:", {
            transactionId: transactionRef.id,
            playerId: playerId,
            playerName: playerName,
            type: 'Referral',
            amount: amount,
            gameBalanceBefore: currentGameBalance,
            gameBalanceAfter: currentGameBalance - amount
        });
        
        return { success: true, id: transactionRef.id };
    } catch (error) {
        console.error("❌ Error processing referral transaction:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to process referral" };
    }
}
