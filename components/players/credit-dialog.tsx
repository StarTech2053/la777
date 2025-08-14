
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
import { processCredit } from "@/app/(app)/players/actions";
import type { Player } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  gameName: z.string().min(1, "Please select a gaming account."),
});

type FormValues = z.infer<typeof formSchema>;

interface CreditDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  type: "Freeplay" | "Bonusplay";
  player: Player | undefined;
  onSuccess: () => void;
}

export function CreditDialog({
  isOpen,
  onOpenChange,
  type,
  player,
  onSuccess,
}: CreditDialogProps) {
  const { toast } = useToast();
  const { name: staffName } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setValue
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
        const result = await processCredit({
            playerId: player.id,
            type,
            staffName,
            ...data
        });

        if (result.success) {
            onSuccess();
        } else {
             throw new Error("Credit transaction failed on the server.");
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

  const title = `Add ${type}`;

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
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
                placeholder="e.g., 20"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
             <div className="space-y-2">
              <Label htmlFor="gameName">Gaming Account</Label>
              <Select onValueChange={(value: string) => setValue('gameName', value, { shouldValidate: true })}>
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
              Add {type}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
