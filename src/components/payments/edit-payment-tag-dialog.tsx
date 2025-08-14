
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
import type { PaymentTag } from "@/lib/types";

const formSchema = z.object({
  status: z.enum(["Active", "Inactive", "Deactivated"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPaymentTagDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tag: PaymentTag | undefined;
  onSuccess: () => void;
}

export function EditPaymentTagDialog({
  isOpen,
  onOpenChange,
  tag,
  onSuccess,
}: EditPaymentTagDialogProps) {
  const { toast } = useToast();
  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const selectedStatus = watch("status");

  React.useEffect(() => {
    if (tag) {
      setValue("status", tag.status);
    }
  }, [tag, setValue, isOpen]);
  
  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!tag) return;

    try {
      // Use client-side Firebase SDK directly
      const tagRef = doc(db, 'paymentTags', tag.id);
      await updateDoc(tagRef, { status: data.status });

      toast({
        variant: "success",
        title: "Success",
        description: `Tag status has been updated to ${data.status}.`,
      });
      onSuccess();
      onOpenChange(false); // Close dialog after success
    } catch (error) {
      console.error("Error editing payment tag:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update tag.";
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
            <DialogTitle>Edit Tag Status</DialogTitle>
            <DialogDescription>
              Modify the status for tag: <span className="font-semibold font-mono">{tag?.tag}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="date">Created On</Label>
              <Input id="date" value={tag ? format(new Date(tag.date), "PPp") : ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value: "Active" | "Inactive" | "Deactivated") => setValue('status', value)} defaultValue={tag?.status}>
                <SelectTrigger id="status" name="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={isSubmitting || selectedStatus === tag?.status}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
