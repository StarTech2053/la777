
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
  amount: z.coerce.number().min(0, "Amount must be a non-negative number."),
  tip: z.coerce.number().min(0).optional(),
  depositBonus: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["Chime", "CashApp", "RemainingWithdraw"], { required_error: "Please select a payment method." }),
  paymentTag: z.string().optional(),
  playerTag: z.string().optional(),
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
  const { name: staffName } = useAuth();
     const [pendingWithdrawRequests, setPendingWithdrawRequests] = React.useState<{
     id: string;
     amount: number;
     paidAmount?: number;
     pendingAmount?: number;
     depositAmount?: number;
     date: string;
   }[]>([]);
  const [totalPendingWithdraw, setTotalPendingWithdraw] = React.useState(0);
  const [activeTags, setActiveTags] = React.useState<PaymentTag[]>([]);

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
        amount: 0,
        depositBonus: 0,
        tip: 0,
    }
  });

  const selectedPaymentMethod = watch("paymentMethod");

  // Fetch pending withdraw requests for this player
  React.useEffect(() => {
    if (player && isOpen) {
      const withdrawQuery = query(
        collection(db, 'transactions'),
        where('playerName', '==', player.name),
        where('type', '==', 'Withdraw'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(withdrawQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          const originalAmount = data.amount || 0;
          const paidAmount = data.paidAmount || 0;
          const pendingAmount = data.pendingAmount || (originalAmount - paidAmount);
          
          console.log("🔍 Withdraw Request Data:", {
            id: doc.id,
            originalAmount: originalAmount,
            paidAmount: paidAmount,
            pendingAmount: pendingAmount,
            calculatedPending: originalAmount - paidAmount
          });
          
                     return {
             id: doc.id,
             amount: originalAmount,
             paidAmount: paidAmount,
             pendingAmount: pendingAmount,
             depositAmount: data.depositAmount || 0,
             date: data.date
           };
        });
        
        setPendingWithdrawRequests(requests);
        
        // Calculate total pending withdraw amount
        const totalPending = requests.reduce((sum, req) => {
          return sum + req.pendingAmount;
        }, 0);
        
        console.log("💰 Total Pending Withdraw:", totalPending);
        setTotalPendingWithdraw(totalPending);
      });

      return () => unsubscribe();
    }
  }, [player, isOpen]);


  
  React.useEffect(() => {
    if (!isOpen) {
      reset({ 
        amount: 0, 
        depositBonus: 0, 
        tip: 0, 
        paymentMethod: undefined, 
        paymentTag: undefined, 
        playerTag: undefined, 
        gameName: undefined 
      });
    }
  }, [isOpen, reset]);

  // Auto-set amount when RemainingWithdraw is selected (only if amount is 0)
  React.useEffect(() => {
    if (selectedPaymentMethod === 'RemainingWithdraw' && totalPendingWithdraw > 0) {
      // Only auto-set if current amount is 0 or less
      const currentAmount = watch('amount') || 0;
      if (currentAmount <= 0) {
        setValue('amount', totalPendingWithdraw);
      }
    }
    // Don't clear amount when switching away from RemainingWithdraw
    // Let user manually enter amount for other payment methods
  }, [selectedPaymentMethod, totalPendingWithdraw, setValue, watch]);

  // Fetch active payment tags when payment method changes
  React.useEffect(() => {
    if (selectedPaymentMethod && selectedPaymentMethod !== 'RemainingWithdraw') {
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

  const onSubmit = async (data: FormValues) => {
    console.log("🚀 Form submitted with data:", data);
    console.log("🔍 Form type:", type);
    console.log("👤 Player:", player?.name);
    console.log("👨‍💼 Staff:", staffName);
    
    if (!player || !staffName) {
      console.log("❌ Missing player or staff data");
      return;
    }

    // Additional validation based on transaction type
    if (type === 'deposit' && data.paymentMethod !== 'RemainingWithdraw' && (!data.paymentTag || data.paymentTag.trim() === '')) {
      console.log("❌ Missing payment tag for deposit");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a payment tag for deposit.",
      });
      return;
    }

    if (type === 'withdraw' && data.paymentMethod !== 'RemainingWithdraw' && (!data.playerTag || data.playerTag.trim() === '')) {
      console.log("❌ Missing player tag for withdraw");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter player's tag for withdrawal.",
      });
      return;
    }

    console.log("✅ Validation passed, starting transaction...");
    
    // Check if amount is greater than 0
    if (data.amount <= 0) {
      console.log("❌ Amount must be greater than 0");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Amount must be greater than 0.",
      });
      return;
    }

    // Check if amount exceeds total pending withdraw for RemainingWithdraw method
    if (data.paymentMethod === 'RemainingWithdraw' && data.amount > totalPendingWithdraw) {
      console.log("❌ Amount exceeds total pending withdraw");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Amount cannot exceed total pending withdraw amount ($${totalPendingWithdraw.toLocaleString()}).`,
      });
      return;
    }
    
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

             // Handle RemainingWithdraw payment method
       if (data.paymentMethod === 'RemainingWithdraw') {
         if (totalPendingWithdraw === 0) {
           throw new Error('No pending withdraw requests found for this player.');
         }
         
         // Use the amount entered by user, not total pending amount
         const depositAmount = data.amount;
         
         // Process pending withdraw requests proportionally
         let remainingDepositAmount = depositAmount;
         
         for (const request of pendingWithdrawRequests) {
           if (remainingDepositAmount <= 0) break;
           
           const withdrawRef = doc(db, 'transactions', request.id);
           const currentPendingAmount = request.pendingAmount || 0;
           
           if (currentPendingAmount > 0) {
             const amountToDeposit = Math.min(remainingDepositAmount, currentPendingAmount);
             const newDepositAmount = (request.depositAmount || 0) + amountToDeposit;
             
             // Calculate new pending amount: Original amount - Paid amount - Total deposit amount
             const originalAmount = request.amount;
             const paidAmount = request.paidAmount || 0;
             const totalDepositAmount = newDepositAmount;
             const newPendingAmount = Math.max(0, originalAmount - paidAmount - totalDepositAmount);
             
             // Update withdraw request with deposit amount (NOT paid amount)
             batch.update(withdrawRef, {
               depositAmount: newDepositAmount,
               pendingAmount: newPendingAmount,
               status: newPendingAmount === 0 ? 'completed' : 'pending'
             });
             
             remainingDepositAmount -= amountToDeposit;
           }
         }
       }

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
       
       // Calculate deposit amount for RemainingWithdraw method
       const depositAmount = data.paymentMethod === 'RemainingWithdraw' ? data.amount : 0;
       
       // Clean up data to remove undefined values for Firebase
       const cleanData = {
         ...data,
         playerId: player.id,
         type: transactionType,
         date: new Date().toISOString(),
         playerName: player.name,
         staffName: staffName,
         status: transactionType === 'Withdraw' ? 'pending' : 'Approved',
         gameBalanceBefore: currentGameBalance,
         gameBalanceAfter: finalGameBalance,
         points: totalAmount, // Store total amount as points for games section
         amount: data.amount, // Keep original amount for reference
         depositBonus: data.depositBonus || 0, // Keep bonus percentage for reference
         paymentTag: data.paymentTag || null, // Store payment tag for receiving payment
         playerTag: data.playerTag || null, // Store player's tag for receiving payment
         tip: data.tip || 0, // Store tip amount
         depositAmount: depositAmount, // Store deposit amount for RemainingWithdraw method
                   notes: data.paymentMethod === 'RemainingWithdraw' ? 
            `Partial payment of $${data.amount.toLocaleString()} processed from ${pendingWithdrawRequests.length} pending withdraw requests (Total pending: $${totalPendingWithdraw.toLocaleString()})` : 
            null
       };
       
       // Remove undefined values from cleanData
       Object.keys(cleanData).forEach(key => {
         if ((cleanData as any)[key] === undefined) {
           delete (cleanData as any)[key];
         }
       });
       
       batch.set(newTransactionRef, cleanData);

       // Add deposit entry to payment history for RemainingWithdraw method
       if (data.paymentMethod === 'RemainingWithdraw') {
         for (const request of pendingWithdrawRequests) {
           const depositPaymentRecord = {
             id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
             amount: data.amount,
             date: new Date().toISOString(),
             method: 'Deposit (Staff)',
             tag: `Gaming Account: ${data.gameName}`,
             paidBy: staffName,
             staffName: staffName,
             type: 'deposit'
           };
           
           // Add to subcollection
           const paymentRef = doc(collection(db, 'transactions', request.id, 'payments'));
           batch.set(paymentRef, depositPaymentRecord);
         }
       }

      await batch.commit();
      
      const bonusMessage = depositBonusAmount > 0 ? ` (including $${depositBonusAmount.toLocaleString()} bonus)` : '';
             const withdrawMessage = data.paymentMethod === 'RemainingWithdraw' ? 
         ` (partial payment from ${pendingWithdrawRequests.length} pending withdraw requests)` : '';
      
      toast({
        variant: "success",
        title: "Success",
        description: `${transactionType} of $${data.amount.toLocaleString()}${bonusMessage}${withdrawMessage} has been processed successfully. Total points: $${totalAmount.toLocaleString()}. Game balance: $${currentGameBalance.toLocaleString()} → $${finalGameBalance.toLocaleString()}`,
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
                        <Label htmlFor="deposit-amount">
                            Deposit Amount ($)
                            {selectedPaymentMethod === 'RemainingWithdraw' && totalPendingWithdraw > 0 && (
                                <span className="text-sm text-muted-foreground ml-2">
                                    (Max: ${totalPendingWithdraw.toLocaleString()})
                                </span>
                            )}
                        </Label>
                        <Input
                            id="deposit-amount"
                            type="number"
                            step="0.01"
                            autoComplete="off"
                            {...register("amount")}
                            placeholder="e.g., 50.00"
                            className=""
                        />
                        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="depositBonus">Deposit Bonus (%)</Label>
                        <Input
                            id="depositBonus"
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
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chime">Chime</SelectItem>
                      <SelectItem value="CashApp">CashApp</SelectItem>
                      {totalPendingWithdraw > 0 && (
                        <SelectItem value="RemainingWithdraw">
                          Remaining Withdraw (${totalPendingWithdraw.toLocaleString()})
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
               />
              {errors.paymentMethod && (
                 <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
              )}
            </div>

                         {/* Show pending withdraw requests only when RemainingWithdraw is selected */}
             {selectedPaymentMethod === 'RemainingWithdraw' && totalPendingWithdraw > 0 && (
               <div className="space-y-2">
                 <Label>Pending Withdraw Requests</Label>
                 <div className="space-y-2 max-h-32 overflow-y-auto p-3 bg-muted rounded-lg">
                   {pendingWithdrawRequests.map((request) => (
                     <div key={request.id} className="flex justify-between items-center text-sm">
                       <span>Request #{request.id.slice(-6)}</span>
                       <span className="text-red-500">${request.amount?.toLocaleString()}</span>
                     </div>
                   ))}
                   <div className="border-t pt-2 mt-2">
                     <div className="flex justify-between items-center font-semibold">
                       <span>Total Pending:</span>
                       <span className="text-orange-600">${totalPendingWithdraw.toLocaleString()}</span>
                     </div>
                   </div>
                 </div>
               </div>
             )}
            
                         {/* Payment Tag for Deposit, Player Tag for Withdraw */}
             {type === 'deposit' && selectedPaymentMethod && selectedPaymentMethod !== 'RemainingWithdraw' && (
               <div className="space-y-2">
                 <Label htmlFor="paymentTag">Payment Tag</Label>
                 <Controller
                   name="paymentTag"
                   control={control}
                   render={({ field }) => (
                     <Select onValueChange={field.onChange} value={field.value}>
                       <SelectTrigger id="paymentTag">
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

             {/* Player Tag for Withdraw */}
             {type === 'withdraw' && selectedPaymentMethod && selectedPaymentMethod !== 'RemainingWithdraw' && (
               <div className="space-y-2">
                 <Label htmlFor="playerTag">Player's Tag</Label>
                 <Input
                   id="playerTag"
                   type="text"
                   autoComplete="off"
                   {...register("playerTag")}
                   placeholder="Enter player's payment tag"
                 />
                 {errors.playerTag && (
                   <p className="text-sm text-destructive">{errors.playerTag.message}</p>
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
                    <SelectTrigger id="gameName">
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
