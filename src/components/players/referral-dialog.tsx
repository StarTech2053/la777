
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { processReferral } from "@/app/(app)/players/actions";
import type { Player, Transaction } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players-store";
import { useFirebaseCollection } from "@/hooks/use-firebase-cache";

const formSchema = z.object({
  referralId: z.string().min(1, "Please select a referral."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  gameName: z.string().min(1, "Please select a gaming account."),
});

type FormValues = z.infer<typeof formSchema>;

interface ReferralDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  player: Player | undefined;
  onSuccess: () => void;
}

export function ReferralDialog({
  isOpen,
  onOpenChange,
  player,
  onSuccess,
}: ReferralDialogProps) {
  const { toast } = useToast();
  const { name: staffName } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!player || !staffName) return;

    try {
      const result = await processReferral({
          playerId: player.id,
          staffName,
          ...data,
      });

      if (result.success) {
          onSuccess();
      } else {
           throw new Error("Referral bonus transaction failed on the server.");
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : `Failed to process referral bonus. Please try again.`;
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };
  
  // Find players who were referred by this player
  const { players } = usePlayersStore();
  const { data: transactions } = useFirebaseCollection<Transaction>('transactions');
  
  const availableReferrals = React.useMemo(() => {
    if (!player) return [];
    
    // Find all players who have this player as their referrer
    const referredPlayers = players.filter(p => p.referredBy === player.name);
    
    // Filter for eligible referrals (have made deposits and bonus not given yet)
    return referredPlayers.filter(refPlayer => {
      // Check if they have made any deposits
      const hasDeposits = refPlayer.stats.tDeposit > 0;
      
      // Check if bonus has already been given (we'll need to check transactions)
      // For now, we'll assume bonus hasn't been given if we can't find a referral transaction
      const bonusGiven = false; // TODO: Check transactions for referral bonus
      
      return hasDeposits && !bonusGiven;
    }).map(refPlayer => {
      // Find first deposit transaction for this player
      const playerTransactions = transactions.filter(t => t.playerName === refPlayer.name && t.type === 'Deposit');
      const firstDepositTransaction = playerTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      const firstDepositAmount = firstDepositTransaction ? firstDepositTransaction.amount : 0;
      
      return {
        id: refPlayer.id,
        name: refPlayer.name,
        joinDate: refPlayer.joinDate,
        tDeposit: refPlayer.stats.tDeposit,
        tWithdraw: refPlayer.stats.tWithdraw,
        pAndL: refPlayer.stats.pAndL,
        firstDeposit: firstDepositAmount, // Use actual first deposit amount
        bonusGiven: false
      };
    });
  }, [player, players, transactions]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Referral Bonus</DialogTitle>
            <DialogDescription>
              For player: <span className="font-semibold">{player?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="referralId">Select Referral</Label>
              <Select onValueChange={(value: string) => setValue('referralId', value, { shouldValidate: true })}>
                <SelectTrigger id="referralId" name="referralId">
                  <SelectValue placeholder="Select a referred player" />
                </SelectTrigger>
                <SelectContent>
                  {availableReferrals.length > 0 ? (
                    availableReferrals.map(ref => (
                      <SelectItem key={ref.id} value={ref.id}>
                         <div className="flex justify-between w-full">
                           <span>{ref.name}</span>
                           <span className="text-muted-foreground ml-4">First Deposit: ${ref.firstDeposit?.toLocaleString()}</span>
                         </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-referrals" disabled>
                      No eligible referrals for a bonus.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.referralId && (
                 <p className="text-sm text-destructive">{errors.referralId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Bonus Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                autoComplete="off"
                {...register("amount")}
                placeholder="e.g., 25.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
             <div className="space-y-2">
              <Label htmlFor="gameName">Gaming Account</Label>
              <Select onValueChange={(value: string) => setValue('gameName', value, { shouldValidate: true })}>
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
              Add Bonus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
