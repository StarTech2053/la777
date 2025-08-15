
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Player, PaymentTag } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot, query, where, doc, updateDoc, increment, addDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  tip: z.coerce.number().min(0).optional(),
  depositBonus: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["Chime", "CashApp"], { required_error: "Please select a payment method." }),
  paymentTag: z.string().min(1, "Please select a payment tag."),
  gameName: z.string().min(1, "Please select a gaming account."),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  type: "deposit" | "withdraw";
  player: Player | undefined;
  onSuccess: () => void;
}

export function TransactionDialog({
  isOpen,
  onOpenChange,
  type,
  player,
  onSuccess,
}: TransactionDialogProps) {
  const { toast } = useToast();
  const [activeTags, setActiveTags] = React.useState<PaymentTag[]>([]);
  const { name: staffName } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        depositBonus: 0,
        tip: 0,
    }
  });

  const selectedPaymentMethod = watch("paymentMethod");

  React.useEffect(() => {
    if (selectedPaymentMethod) {
      const tagsQuery = query(
          collection(db, "paymentTags"),
          where("method", "==", selectedPaymentMethod),
          where("status", "==", "Active")
      );
      const unsubscribe = onSnapshot(tagsQuery, (snapshot) => {
          const tagsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PaymentTag));
          setActiveTags(tagsData);
      });
      setValue('paymentTag', "", { shouldValidate: false });
      return () => unsubscribe();
    } else {
      setActiveTags([]);
    }
  }, [selectedPaymentMethod, setValue]);
  
  React.useEffect(() => {
    if (!isOpen) {
      reset({ amount: undefined, depositBonus: 0, tip: 0, paymentTag: undefined, paymentMethod: undefined, gameName: undefined });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!player || !staffName) return;

    try {
      const batch = writeBatch(db);
      const playerRef = doc(db, 'players', player.id);
      
      // Find the game document
      const gamesQuery = query(collection(db, "games"), where("name", "==", data.gameName));
      const gamesSnap = await getDocs(gamesQuery);

      if (gamesSnap.empty) {
        throw new Error(`Game "${data.gameName}" not found.`);
      }
      
      const gameDoc = gamesSnap.docs[0];
      const gameRef = gameDoc.ref;
      const currentGameBalance = gameDoc.data().balance || 0;

      const transactionType = type === 'deposit' ? 'Deposit' : 'Withdraw';
      
      // Calculate total amount (deposit + bonus)
      const depositBonusAmount = data.depositBonus ? (data.amount * data.depositBonus / 100) : 0;
      const totalAmount = data.amount + depositBonusAmount;
      
      console.log("💰 Transaction Details:", {
        depositAmount: data.amount,
        depositBonusPercent: data.depositBonus,
        depositBonusAmount: depositBonusAmount,
        totalAmount: totalAmount
      });
      
      // 🔒 CRITICAL: Balance Validation
      if (transactionType === 'Deposit') {
        // For deposit: Check if game has sufficient balance for total amount
        if (currentGameBalance < totalAmount) {
          throw new Error(`Insufficient game balance. Game "${data.gameName}" has $${currentGameBalance.toLocaleString()} but total amount needed is $${totalAmount.toLocaleString()}.`);
        }
      } else { // Withdraw
        // For withdraw: Check if player has sufficient balance (optional - depends on your business logic)
        // You might want to check player's balance here if needed
      }
      
      let playerUpdate: { [key: string]: any } = { lastActivity: new Date().toISOString() };
      let gameUpdate: { [key: string]: any } = {};

      if (transactionType === 'Deposit') {
        // ✅ CORRECT LOGIC: Deposit = Money from game to player (total amount including bonus)
        playerUpdate['stats.tDeposit'] = increment(data.amount);
        playerUpdate['stats.tDepositBonus'] = increment(depositBonusAmount); // Add deposit bonus to player stats
        gameUpdate['balance'] = increment(-totalAmount); // Game balance DECREASES by total amount
      } else { // Withdraw
        // ✅ CORRECT LOGIC: Withdraw = Money from player to game
        playerUpdate['stats.tWithdraw'] = increment(data.amount);
        gameUpdate['balance'] = increment(data.amount); // Game balance INCREASES
      }
      playerUpdate['stats.pAndL'] = increment(transactionType === 'Deposit' ? data.amount : -data.amount);

      // 🔒 CRITICAL: Double-check final balance won't be negative
      const finalGameBalance = currentGameBalance + (transactionType === 'Deposit' ? -totalAmount : data.amount);
      if (finalGameBalance < 0) {
        throw new Error(`Transaction would result in negative game balance ($${finalGameBalance.toLocaleString()}). This is not allowed.`);
      }

      batch.update(playerRef, playerUpdate);
      batch.update(gameRef, gameUpdate);

      // Create transaction document with balance information
      const newTransactionRef = doc(collection(db, 'transactions'));
      batch.set(newTransactionRef, {
        ...data,
        playerId: player.id,
        type: transactionType,
        date: new Date().toISOString(),
        playerName: player.name,
        staffName: staffName,
        status: 'Approved' as const,
        gameBalanceBefore: currentGameBalance,
        gameBalanceAfter: finalGameBalance,
        points: totalAmount, // Store total amount as points for games section
        amount: data.amount, // Keep original amount for reference
        depositBonus: data.depositBonus, // Keep bonus percentage for reference
      });

      await batch.commit();
      
      const bonusMessage = depositBonusAmount > 0 ? ` (including $${depositBonusAmount.toLocaleString()} bonus)` : '';
      toast({
        variant: "success",
        title: "Success",
        description: `${transactionType} of $${data.amount.toLocaleString()}${bonusMessage} has been processed successfully. Total points: $${totalAmount.toLocaleString()}. Game balance: $${currentGameBalance.toLocaleString()} → $${finalGameBalance.toLocaleString()}`,
      });
      
      onSuccess();
      onOpenChange(false); // Close dialog after success
    } catch (error) {
      console.error("Transaction failed:", error);
      const errorMessage = error instanceof Error ? error.message : `Failed to process ${type}. Please try again.`;
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  const title = type === 'deposit' ? 'Make a Deposit' : 'Make a Withdrawal';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              For player: <span className="font-semibold">{player?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {type === 'deposit' ? (
                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="deposit-amount">Deposit Amount ($)</Label>
                        <Input
                            id="deposit-amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            autoComplete="off"
                            {...register("amount")}
                            placeholder="e.g., 50.00"
                        />
                        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="depositBonus">Deposit Bonus (%)</Label>
                        <Input
                            id="depositBonus"
                            name="depositBonus"
                            type="number"
                            step="0.01"
                            autoComplete="off"
                            {...register("depositBonus")}
                            placeholder="e.g., 10"
                        />
                        {errors.depositBonus && <p className="text-sm text-destructive">{errors.depositBonus.message}</p>}
                    </div>
                </div>
            ) : (
                 <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="withdraw-amount">Withdrawal Amount ($)</Label>
                        <Input
                            id="withdraw-amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            autoComplete="off"
                            {...register("amount")}
                            placeholder="e.g., 50.00"
                        />
                        {errors.amount && (
                            <p className="text-sm text-destructive">{errors.amount.message}</p>
                        )}
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="tip">Tip Amount ($)</Label>
                        <Input
                            id="tip"
                            name="tip"
                            type="number"
                            step="0.01"
                            autoComplete="off"
                            {...register("tip")}
                            placeholder="e.g., 5.00"
                        />
                        {errors.tip && <p className="text-sm text-destructive">{errors.tip.message}</p>}
                    </div>
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="paymentMethod" name="paymentMethod">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chime">Chime</SelectItem>
                      <SelectItem value="CashApp">CashApp</SelectItem>
                    </SelectContent>
                  </Select>
                )}
               />
              {errors.paymentMethod && (
                 <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
              )}
            </div>
             {selectedPaymentMethod && (
              <div className="space-y-2">
                <Label htmlFor="paymentTag">Payment Tag</Label>
                <Controller
                    name="paymentTag"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="paymentTag" name="paymentTag">
                                <SelectValue placeholder="Select a tag" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeTags.length > 0 ? (
                                activeTags.map(tag => (
                                    <SelectItem key={tag.id} value={tag.tag}>
                                    {tag.tag}
                                    </SelectItem>
                                ))
                                ) : (
                                <SelectItem value="no-tags" disabled>
                                    No active tags for {selectedPaymentMethod}.
                                </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.paymentTag && (
                    <p className="text-sm text-destructive">{errors.paymentTag.message}</p>
                )}
              </div>
            )}
             <div className="space-y-2">
              <Label htmlFor="gameName">Gaming Account</Label>
              <Controller
                name="gameName"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="gameName" name="gameName">
                      <SelectValue placeholder="Select a gaming account" />
                    </SelectTrigger>
                    <SelectContent>
                      {player?.gamingAccounts && player.gamingAccounts.length > 0 ? (
                        player.gamingAccounts.map(account => (
                          <SelectItem key={account.gameName} value={account.gameName}>
                            <div className="flex justify-between w-full">
                              <span>{account.gameName}</span>
                              <span className="text-muted-foreground ml-4">{account.gamerId}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-accounts" disabled>
                          No gaming accounts found for this player.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gameName && (
                 <p className="text-sm text-destructive">{errors.gameName.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {type === 'deposit' ? "Deposit" : "Withdraw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
