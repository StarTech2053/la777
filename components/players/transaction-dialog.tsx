
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
import { processTransaction } from "@/app/(app)/players/actions";
import type { Player, PaymentTag } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
        const result = await processTransaction({
            playerId: player.id,
            type,
            staffName,
            ...data
        });

        if (result.success) {
            onSuccess();
        } else {
             throw new Error("Transaction failed on the server.");
        }
    } catch (error) {
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
                        <Label htmlFor="amount">Deposit Amount ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            {...register("amount")}
                            placeholder="e.g., 50.00"
                        />
                        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="depositBonus">Deposit Bonus (%)</Label>
                        <Input
                            id="depositBonus"
                            type="number"
                            step="0.01"
                            {...register("depositBonus")}
                            placeholder="e.g., 10"
                        />
                        {errors.depositBonus && <p className="text-sm text-destructive">{errors.depositBonus.message}</p>}
                    </div>
                </div>
            ) : (
                 <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="amount">Withdrawal Amount ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
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
                    <SelectTrigger>
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
                            <SelectTrigger>
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
                    <SelectTrigger>
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
