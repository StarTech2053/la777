
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
  const [isValidating, setIsValidating] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const avatarUrl = watch("avatarUrl");

  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setIsValidating(false);
    }
  }, [isOpen, reset]);

  // Convert image URL to base64 using Canvas (NEW - CORS bypass)
  const convertImageToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔄 Converting image URL to base64 using Canvas:", url);
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for image
        
        img.onload = () => {
          try {
            // Create canvas and draw image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("Canvas context not available"));
              return;
            }
            
            // Set canvas size to image size
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw image to canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert to base64
            const base64Data = canvas.toDataURL('image/jpeg', 0.8);
            console.log("✅ Image converted to base64 successfully");
            resolve(base64Data);
          } catch (error) {
            console.error("❌ Canvas conversion failed:", error);
            reject(new Error("Failed to convert image using Canvas"));
          }
        };
        
        img.onerror = () => {
          console.error("❌ Image failed to load:", url);
          reject(new Error("Image failed to load. Please check the URL or try a different image."));
        };
        
        // Set source after setting up event handlers
        img.src = url;
        
      } catch (error) {
        console.error("❌ Error in convertImageToBase64:", error);
        reject(error);
      }
    });
  };

  // Validate image URL (UPDATED - Canvas method)
  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      // For data URLs, always return true
      if (url.startsWith('data:')) {
        return true;
      }
      
      // For external URLs, try to load image
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          console.log("✅ Image URL validated successfully:", url);
          resolve(true);
        };
        
        img.onerror = () => {
          console.log("❌ Image URL validation failed:", url);
          resolve(false);
        };
        
        img.src = url;
      });
    } catch (error) {
      console.error("Error validating image URL:", error);
      return false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsValidating(true);
      console.log("🔄 Validating image URL:", data.avatarUrl);

      // Basic URL format check
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(data.avatarUrl.split('?')[0]);
      if (!isImage && !data.avatarUrl.startsWith('data:')) {
        toast({
          variant: "destructive",
          title: "Invalid URL",
          description: "Please provide a direct link to an image file (e.g., .jpg, .png, .gif) or a data URL.",
        });
        return;
      }

      // Validate and convert external URLs to base64 (UPDATED)
      let finalAvatarUrl = data.avatarUrl;
      
      if (!data.avatarUrl.startsWith('data:')) {
        try {
          // First validate the URL
          console.log("🔄 Validating image URL...");
          const isValid = await validateImageUrl(data.avatarUrl);
          if (!isValid) {
            toast({
              variant: "destructive",
              title: "Invalid Image",
              description: "The image URL is not accessible. Please check the URL or try a different image.",
            });
            return;
          }
          
          // Then convert to base64
          console.log("🔄 Converting external URL to base64...");
          finalAvatarUrl = await convertImageToBase64(data.avatarUrl);
          console.log("✅ URL converted to base64 successfully");
        } catch (error) {
          console.error("❌ Failed to process URL:", error);
          toast({
            variant: "destructive",
            title: "Processing Failed",
            description: "Failed to process image URL. Please try a different URL or upload from device.",
          });
          return;
        }
      }

      console.log("✅ Image URL processed successfully");
      onSuccess(finalAvatarUrl);
      onOpenChange(false);
      
      toast({
        variant: "success",
        title: "Success",
        description: "Profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("❌ Error validating image URL:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to validate image URL. Please try again.",
      });
    } finally {
      setIsValidating(false);
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
              Supported formats: JPG, PNG, GIF, WebP, SVG, or Data URLs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Image URL</Label>
              <Input
                id="avatarUrl"
                {...register("avatarUrl")}
                placeholder="https://example.com/image.png or data:image/png;base64,..."
                disabled={isValidating}
              />
              {errors.avatarUrl && (
                <p className="text-sm text-destructive">{errors.avatarUrl.message}</p>
              )}
              {avatarUrl && (
                <div className="mt-2 p-2 border rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Preview:</p>
                  <img 
                    src={avatarUrl} 
                    alt="Preview" 
                    className="mt-1 max-w-full h-20 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isValidating}>
              {(isSubmitting || isValidating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isValidating ? "Validating..." : "Update Avatar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

