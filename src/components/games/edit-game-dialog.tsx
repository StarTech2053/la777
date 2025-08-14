
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Game } from "@/lib/types";
import { doc, deleteDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Recharge } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Game Name is required"),
  imageUrl: z.string().min(1, "Image is required"),
  rechargeAmount: z.coerce.number().min(0, "Recharge must be a positive number"),
  downloadUrl: z.string().min(1, "Please enter a valid Download URL"),
  panelUrl: z.string().min(1, "Please enter a valid Panel URL"),
  username: z.string().optional(),
  password: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Disabled"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditGameDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  game: Game | undefined;
  allGames: Game[];
  onSuccess: (updatedGames: Game[]) => void;
  onDelete: (updatedGames: Game[]) => void;
}

export function EditGameDialog({
  isOpen,
  onOpenChange,
  game,
  allGames,
  onSuccess,
  onDelete
}: EditGameDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentBalance, setCurrentBalance] = React.useState(0);
  const [isNewImageUploaded, setIsNewImageUploaded] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const imageUrl = watch("imageUrl");

  React.useEffect(() => {
    if (game && isOpen) {
      reset({
        name: game.name,
        imageUrl: game.imageUrl,
        rechargeAmount: 0,
        downloadUrl: game.downloadUrl,
        panelUrl: game.panelUrl,
        username: game.username || '',
        password: game.password || '',
        status: game.status,
      });
      setCurrentBalance(game.balance);
      setImagePreview(game.imageUrl);
      setIsNewImageUploaded(false); // Reset on open
    }
  }, [game, isOpen, reset]);
  
  React.useEffect(() => {
    if(imageUrl) {
        setImagePreview(imageUrl);
    }
  }, [imageUrl]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsNewImageUploaded(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setValue("imageUrl", dataUri, { shouldValidate: true });
        setImagePreview(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (data: FormValues) => {
    if (!game) return;
    try {
      console.log("🔄 Updating game:", game.id, "Recharge amount:", data.rechargeAmount);
      
      const gameRef = doc(db, "games", game.id);
      const newBalance = game.balance + data.rechargeAmount;
      
      const updateData: { [key: string]: any } = {
        name: data.name,
        imageUrl: data.imageUrl,
        downloadUrl: data.downloadUrl,
        panelUrl: data.panelUrl,
        username: data.username,
        password: data.password,
        status: data.status,
        balance: newBalance,
      };

      if (data.rechargeAmount > 0) {
        const newRecharge: Recharge = {
          date: new Date().toISOString(),
          amount: data.rechargeAmount,
          type: 'Recharge',
          staffName: user?.email || 'Unknown User', // Add staff name
        };
        updateData.rechargeHistory = arrayUnion(newRecharge);
        updateData.lastRechargeDate = new Date().toISOString();
        console.log("🔄 Adding recharge to history:", newRecharge);
      }
      
      await updateDoc(gameRef, updateData);
      console.log("✅ Game updated successfully");

      toast({
        variant: "success",
        title: "Success",
        description: `Game "${data.name}" has been updated successfully.${data.rechargeAmount > 0 ? ` Balance: $${game.balance.toLocaleString()} → $${newBalance.toLocaleString()}` : ''}`,
      });

      onOpenChange(false);
      onSuccess(allGames.map(g => g.id === game.id ? { ...g, ...updateData } : g));
    } catch (error) {
      console.error("❌ Error updating game:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update game. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };
  
  const handleDelete = async () => {
    if (!game) return;
    setIsDeleting(true);
    try {
      const gameRef = doc(db, "games", game.id);
      await deleteDoc(gameRef);
      
      toast({
        variant: "success",
        title: "Success",
        description: `Game "${game.name}" has been deleted successfully.`,
      });
      
      onOpenChange(false);
      onDelete(allGames.filter(g => g.id !== game.id));
    } catch (error) {
      console.error("Error deleting game:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete game. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Game: {game?.name}</DialogTitle>
            <DialogDescription>
              Update the game's details below or delete it permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="name">Game Name</Label>
              <Input 
                id="name" 
                name="name"
                autoComplete="off"
                {...register("name")} 
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
               <Select onValueChange={(value: "Active" | "Inactive" | "Disabled") => setValue('status', value)} defaultValue={game?.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Game Image</Label>
               {imagePreview && (
                <Image
                    src={imagePreview}
                    alt="Game preview"
                    width={150}
                    height={100}
                    className="rounded-md object-cover aspect-[3/2]"
                />
                )}
              <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
              {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balance">Current Balance</Label>
                  <Input id="balance" value={currentBalance.toLocaleString()} readOnly disabled />
                </div>
                            <div className="space-y-2">
              <Label htmlFor="rechargeAmount">Recharge Amount</Label>
              <Input 
                id="rechargeAmount" 
                name="rechargeAmount"
                type="number" 
                autoComplete="off"
                {...register("rechargeAmount")} 
                placeholder="0" 
              />
              {errors.rechargeAmount && <p className="text-sm text-destructive">{errors.rechargeAmount.message}</p>}
            </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadUrl">Download URL</Label>
              <Input 
                id="downloadUrl" 
                name="downloadUrl"
                autoComplete="off"
                {...register("downloadUrl")} 
              />
              {errors.downloadUrl && <p className="text-sm text-destructive">{errors.downloadUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="panelUrl">Panel URL</Label>
              <Input 
                id="panelUrl" 
                name="panelUrl"
                autoComplete="off"
                {...register("panelUrl")} 
              />
              {errors.panelUrl && <p className="text-sm text-destructive">{errors.panelUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Panel Username</Label>
              <Input 
                id="username" 
                name="username"
                autoComplete="username"
                {...register("username")} 
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="password">Panel Password</Label>
              <Input 
                id="password" 
                name="password"
                type="password" 
                autoComplete="current-password"
                {...register("password")} 
              />
            </div>
          </div>
          <DialogFooter className="justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Game
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the game "{game?.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
