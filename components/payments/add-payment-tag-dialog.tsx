
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
import { useToast } from "@/hooks/use-toast";
import type { PaymentMethod } from "@/lib/types";
import { addPaymentTag } from "@/app/(app)/payments/actions";


const formSchema = z.object({
  tag: z.string()
    .min(2, "Tag must be at least 2 characters")
    .startsWith('$', "Tag must start with a '$'"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPaymentTagDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  method: PaymentMethod;
  onSuccess: () => void;
}

export function AddPaymentTagDialog({
  isOpen,
  onOpenChange,
  method,
  onSuccess,
}: AddPaymentTagDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      const result = await addPaymentTag({ tag: data.tag, method });

      if (result.success) {
        toast({
          variant: "success",
          title: "Success",
          description: `Tag "${data.tag}" has been added for ${method}.`,
        });
        onSuccess();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to add tag. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New {method} Tag</DialogTitle>
            <DialogDescription>
              Enter a new unique tag. It must start with a '$' sign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag Name</Label>
              <Input
                id="tag"
                {...register("tag")}
                placeholder="e.g., $NewTag123"
              />
              {errors.tag && (
                <p className="text-sm text-destructive">{errors.tag.message}</p>
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
              Add Tag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
