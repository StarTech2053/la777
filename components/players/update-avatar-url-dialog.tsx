
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

const formSchema = z.object({
  avatarUrl: z.string().url("Please enter a valid URL."),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateAvatarUrlDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: (avatarUrl: string) => void;
}

export function UpdateAvatarUrlDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: UpdateAvatarUrlDialogProps) {
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
      // Basic check if the URL likely points to an image
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(data.avatarUrl.split('?')[0]);
      if (!isImage) {
        toast({
            variant: "destructive",
            title: "Invalid URL",
            description: "Please provide a direct link to an image file (e.g., .jpg, .png).",
        });
        return;
      }
      onSuccess(data.avatarUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Update Avatar from URL</DialogTitle>
            <DialogDescription>
              Paste a direct link to an image to set it as the new profile picture.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Image URL</Label>
              <Input
                id="avatarUrl"
                {...register("avatarUrl")}
                placeholder="https://example.com/image.png"
              />
              {errors.avatarUrl && (
                <p className="text-sm text-destructive">{errors.avatarUrl.message}</p>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Avatar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

