
"use server";

import { z } from "zod";
import type { Game, Recharge } from "@/lib/types";
import { collection, addDoc, doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const addGameSchema = z.object({
  name: z.string().min(1, "Game Name is required"),
  imageUrl: z.string().min(1, "Image is required"),
  balance: z.coerce.number().min(0, "Balance must be a positive number"),
  downloadUrl: z.string().min(1, "Please enter a valid Download URL"),
  panelUrl: z.string().min(1, "Please enter a valid Panel URL"),
  username: z.string().optional(),
  password: z.string().optional(),
});

export async function addGame(data: z.infer<typeof addGameSchema>) {
  try {
    await addDoc(collection(db, "games"), {
      name: data.name,
      imageUrl: data.imageUrl,
      balance: data.balance,
      downloadUrl: data.downloadUrl,
      panelUrl: data.panelUrl,
      username: data.username || "",
      password: data.password || "",
      status: 'Active',
      lastRechargeDate: new Date().toISOString(),
      rechargeHistory: []
    });
    
    return { 
      success: true,
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
  imageUrl: z.string().min(1, "Image is required"),
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
    
    const updateData: { [key: string]: any } = {
        name: data.name,
        imageUrl: data.imageUrl,
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
    
    await updateDoc(gameRef, updateData);

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
        await deleteDoc(doc(db, "games", gameId));
        return { success: true };
    } catch (e) {
        console.error("Error deleting game:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
