
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
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
import type { Transaction, PaymentMethod } from "@/lib/types";
import { editTransaction } from "../actions";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  paymentMethod: z.enum(["Chime", "CashApp"]),
  type: z.enum(["Deposit", "Withdraw"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction: Transaction | undefined;
  onSuccess: () => void;
}

export function EditTransactionDialog({
  isOpen,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) {
  const { toast } = useToast();
  
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
    if (transaction && isOpen) {
        reset({
            amount: transaction.amount,
            paymentMethod: transaction.paymentMethod,
            type: transaction.type as "Deposit" | "Withdraw",
        });
    }
  }, [transaction, isOpen, reset]);


  const onSubmit = async (data: FormValues) => {
    if (!transaction) return;
    try {
        const result = await editTransaction({
            transactionId: transaction.id,
            ...data
        });
        
        if (result.success) {
            onSuccess();
        }

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Failed to update transaction.";
       toast({
         variant: "destructive",
         title: "Error",
         description: errorMessage,
       });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update details for transaction ID: {transaction?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="playerName">Player Name</Label>
                <Input id="playerName" name="playerName" value={transaction?.playerName || ''} disabled />
            </div>
             <div className="space-y-2">
                <Label htmlFor="transactionDate">Date</Label>
                <Input id="transactionDate" name="transactionDate" value={transaction ? format(new Date(transaction.date), 'Pp') : ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
               <Select onValueChange={(value: "Deposit" | "Withdraw") => setValue('type', value)} defaultValue={transaction?.type as "Deposit" | "Withdraw"}>
                <SelectTrigger id="type" name="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Withdraw">Withdraw</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
               <Select onValueChange={(value: "Chime" | "CashApp") => setValue('paymentMethod', value)} defaultValue={transaction?.paymentMethod}>
                <SelectTrigger id="paymentMethod" name="paymentMethod">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chime">Chime</SelectItem>
                  <SelectItem value="CashApp">CashApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount" 
                name="amount"
                type="number" 
                autoComplete="off"
                {...register("amount")} 
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
