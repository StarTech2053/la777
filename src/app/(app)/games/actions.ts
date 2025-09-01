
"use server";

import { z } from "zod";
import type { Game, Recharge } from "@/lib/types";
import { collection, addDoc, doc, updateDoc, arrayUnion, deleteDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadGameImage } from "@/lib/storage";

const addGameSchema = z.object({
  name: z.string().min(1, "Game Name is required"),
  imageFile: z.any().optional(), // File object for upload
  imageUrl: z.string().optional(), // URL or base64 for existing images
  balance: z.coerce.number().min(0, "Balance must be a positive number"),
  downloadUrl: z.string().min(1, "Please enter a valid Download URL"),
  panelUrl: z.string().min(1, "Please enter a valid Panel URL"),
  username: z.string().optional(),
  password: z.string().optional(),
});

export async function addGame(data: z.infer<typeof addGameSchema>) {
  try {
    let finalImageUrl = data.imageUrl || "";
    
    // If imageFile is provided, upload it to Firebase Storage
    if (data.imageFile && data.imageFile instanceof File) {
      console.log("🔄 Uploading game image to Firebase Storage...");
      
      // Generate a temporary ID for the game
      const tempGameId = `temp_${Date.now()}`;
      
      try {
        finalImageUrl = await uploadGameImage(data.imageFile, tempGameId);
        console.log("✅ Game image uploaded successfully:", finalImageUrl);
      } catch (uploadError) {
        console.error("❌ Error uploading image:", uploadError);
        throw new Error("Failed to upload image. Please try again.");
      }
    }
    
    // Validate that we have an image URL
    if (!finalImageUrl) {
      throw new Error("Image is required. Please select an image file.");
    }
    
    // Add the game to Firestore
    const gameDoc = await addDoc(collection(db, "games"), {
      name: data.name,
      imageUrl: finalImageUrl,
      balance: data.balance,
      downloadUrl: data.downloadUrl,
      panelUrl: data.panelUrl,
      username: data.username || "",
      password: data.password || "",
      status: 'Active',
      lastRechargeDate: new Date().toISOString(),
      rechargeHistory: []
    });
    
    console.log("✅ Game added successfully with ID:", gameDoc.id);
    
    return { 
      success: true,
      gameId: gameDoc.id
    };
  } catch (error) {
    console.error("Error adding game:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

const editGameSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Game Name is required"),
  imageFile: z.any().optional(), // File object for upload
  imageUrl: z.string().optional(), // URL or base64 for existing images
  rechargeAmount: z.coerce.number().min(0, "Recharge must be a positive number"),
  downloadUrl: z.string().min(1, "Please enter a valid Download URL"),
  panelUrl: z.string().min(1, "Please enter a valid Panel URL"),
  username: z.string().optional(),
  password: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Disabled']),
});

export async function editGame(game: Game, data: z.infer<typeof editGameSchema>) {
  try {
    const gameRef = doc(db, "games", data.id);
    const newBalance = game.balance + data.rechargeAmount;
    
    let finalImageUrl = data.imageUrl || game.imageUrl;
    
    // If imageFile is provided, upload it to Firebase Storage
    if (data.imageFile && data.imageFile instanceof File) {
      console.log("🔄 Uploading new game image to Firebase Storage...");
      
      try {
        finalImageUrl = await uploadGameImage(data.imageFile, data.id);
        console.log("✅ New game image uploaded successfully:", finalImageUrl);
      } catch (uploadError) {
        console.error("❌ Error uploading image:", uploadError);
        throw new Error("Failed to upload image. Please try again.");
      }
    }
    
    const updateData: { [key: string]: any } = {
        name: data.name,
        imageUrl: finalImageUrl,
        downloadUrl: data.downloadUrl,
        panelUrl: data.panelUrl,
        username: data.username,
        password: data.password,
        status: data.status,
        balance: newBalance,
    };

    if (data.rechargeAmount > 0) {
        const newRecharge: Recharge = {
            date: new Date().toISOString(),
            amount: data.rechargeAmount,
            type: 'Recharge',
        };
        updateData.rechargeHistory = arrayUnion(newRecharge);
        updateData.lastRechargeDate = new Date().toISOString();
    }
    
    // Update the game first
    await updateDoc(gameRef, updateData);

    // If game name has changed, update all players' gaming accounts
    if (game.name !== data.name) {
      console.log(`🔄 Game name changed from "${game.name}" to "${data.name}". Updating players' gaming accounts...`);
      
      const batch = writeBatch(db);
      const playersQuery = query(collection(db, "players"));
      const playersSnapshot = await getDocs(playersQuery);
      
      let updatedPlayersCount = 0;
      
      playersSnapshot.forEach((playerDoc) => {
        const playerData = playerDoc.data();
        const gamingAccounts = playerData.gamingAccounts || [];
        
        // Check if this player has gaming accounts with the old game name
        const hasOldGameAccount = gamingAccounts.some((account: any) => account.gameName === game.name);
        
        if (hasOldGameAccount) {
          // Update gaming accounts with the new game name
          const updatedGamingAccounts = gamingAccounts.map((account: any) => {
            if (account.gameName === game.name) {
              return { ...account, gameName: data.name };
            }
            return account;
          });
          
          const playerRef = doc(db, "players", playerDoc.id);
          batch.update(playerRef, { gamingAccounts: updatedGamingAccounts });
          updatedPlayersCount++;
        }
      });
      
      // Commit all updates in a single batch
      if (updatedPlayersCount > 0) {
        await batch.commit();
        console.log(`✅ Updated gaming accounts for ${updatedPlayersCount} players`);
      } else {
        console.log("ℹ️ No players found with gaming accounts for this game");
      }
    }

    return { 
      success: true,
    };
  } catch(e) {
      console.error("Error editing game:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      return { success: false, error: errorMessage };
  }
}


export async function deleteGame(gameId: string) {
    try {
        // First, get the game to know its name
        const gameRef = doc(db, "games", gameId);
        const gameDoc = await getDocs(query(collection(db, "games"), where("__name__", "==", gameId)));
        
        if (gameDoc.empty) {
            return { success: false, error: "Game not found" };
        }
        
        const gameData = gameDoc.docs[0].data();
        const gameName = gameData.name;
        
        // Delete the game
        await deleteDoc(gameRef);
        
        // Remove this game from all players' gaming accounts
        console.log(`🗑️ Game "${gameName}" deleted. Removing from players' gaming accounts...`);
        
        const batch = writeBatch(db);
        const playersQuery = query(collection(db, "players"));
        const playersSnapshot = await getDocs(playersQuery);
        
        let updatedPlayersCount = 0;
        
        playersSnapshot.forEach((playerDoc) => {
            const playerData = playerDoc.data();
            const gamingAccounts = playerData.gamingAccounts || [];
            
            // Check if this player has gaming accounts with the deleted game name
            const hasGameAccount = gamingAccounts.some((account: any) => account.gameName === gameName);
            
            if (hasGameAccount) {
                // Remove gaming accounts with the deleted game name
                const updatedGamingAccounts = gamingAccounts.filter((account: any) => account.gameName !== gameName);
                
                const playerRef = doc(db, "players", playerDoc.id);
                batch.update(playerRef, { gamingAccounts: updatedGamingAccounts });
                updatedPlayersCount++;
            }
        });
        
        // Commit all updates in a single batch
        if (updatedPlayersCount > 0) {
            await batch.commit();
            console.log(`✅ Removed gaming accounts for ${updatedPlayersCount} players`);
        } else {
            console.log("ℹ️ No players found with gaming accounts for this game");
        }
        
        return { success: true };
    } catch (e) {
        console.error("Error deleting game:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
