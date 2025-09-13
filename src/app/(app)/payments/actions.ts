
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

const addTagSchema = z.object({
  tag: z.string()
    .min(2, "Tag must be at least 2 characters")
    .refine((val) => {
      // PayPal tags start with @, others start with $
      return val.startsWith('$') || val.startsWith('@');
    }, "Tag must start with '$' or '@'"),
  method: z.enum(["Chime", "CashApp", "PayPal"]),
});

export async function addPaymentTag(data: z.infer<typeof addTagSchema>) {
  try {
    await addDoc(collection(db, "paymentTags"), {
      ...data,
      date: new Date().toISOString(),
      status: 'Active',
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding payment tag:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function deleteTransaction(transactionId: string) {
    try {
        await deleteDoc(doc(db, "transactions", transactionId));
        return { success: true };
    } catch (e) {
        console.error("Error deleting transaction:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}


export async function deletePaymentTag(tagId: string) {
    try {
        await deleteDoc(doc(db, "paymentTags", tagId));
        return { success: true };
    } catch(e) {
        console.error("Error deleting payment tag:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

const editTransactionSchema = z.object({
    transactionId: z.string(),
    amount: z.coerce.number().positive("Amount must be a positive number."),
    paymentMethod: z.enum(["Chime", "CashApp", "PayPal"]),
    type: z.enum(["Deposit", "Withdraw"]),
});

export async function editTransaction(data: z.infer<typeof editTransactionSchema>) {
    try {
        const txRef = doc(db, 'transactions', data.transactionId);
        await updateDoc(txRef, {
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            type: data.type,
        });
        return { success: true };
    } catch (error) {
        console.error("Error editing transaction:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

const editPaymentTagSchema = z.object({
  tagId: z.string(),
  status: z.enum(["Active", "Inactive", "Deactivated"]),
});

export async function editPaymentTag(data: z.infer<typeof editPaymentTagSchema>) {
    try {
        const tagRef = doc(db, 'paymentTags', data.tagId);
        await updateDoc(tagRef, { status: data.status });
        return { success: true };
    } catch (error) {
        console.error("Error editing payment tag:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
