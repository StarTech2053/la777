
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
import type { Player, Game, GamingAccount } from "@/lib/types";
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formSchema = z.object({
  gameName: z.string().min(1, "Please select a game."),
  gamerId: z.string().min(3, "Gamer ID must be at least 3 characters long."),
});

type FormValues = z.infer<typeof formSchema>;

interface AddGameAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  player: Player | null;
  onSuccess: (newAccount: GamingAccount) => void;
}

export function AddGameAccountDialog({
  isOpen,
  onOpenChange,
  player,
  onSuccess,
}: AddGameAccountDialogProps) {
  const { toast } = useToast();
  const [allGames, setAllGames] = React.useState<Game[]>([]);
  const [availableGames, setAvailableGames] = React.useState<Game[]>([]);

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
    const gamesQuery = query(collection(db, "games"));
    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
        const gamesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Game);
        setAllGames(gamesData);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (isOpen && player) {
      const playerGameNames = new Set(player.gamingAccounts?.map(ga => ga.gameName.toLowerCase()) || []);
      const filteredGames = allGames.filter(game => !playerGameNames.has(game.name.toLowerCase()));
      setAvailableGames(filteredGames);
      reset();
    }
  }, [isOpen, player, allGames, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!player) return;

    try {
      const playerRef = doc(db, "players", player.id);
      const newAccount: GamingAccount = {
        gameName: data.gameName,
        gamerId: data.gamerId,
      };
      
      await updateDoc(playerRef, {
        gamingAccounts: arrayUnion(newAccount)
      });
      
      toast({
        variant: "success",
        title: "Success",
        description: `Gaming account "${data.gamerId}" has been added for ${data.gameName}.`,
      });
      
      onSuccess(newAccount);
      onOpenChange(false); // Close dialog after success
    } catch (error) {
      console.error("Error adding gaming account:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to add gaming account.";
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
            <DialogTitle>Add Gaming Account</DialogTitle>
            <DialogDescription>
              Assign a new game and Gamer ID to {player?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gameName">Game</Label>
              <Select onValueChange={(value: string) => setValue("gameName", value, { shouldValidate: true })}>
                <SelectTrigger id="gameName">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {availableGames.length > 0 ? availableGames.map((game) => (
                    <SelectItem key={game.id} value={game.name}>
                      {game.name}
                    </SelectItem>
                  )) : (
                     <SelectItem value="no-games" disabled>
                      No new games available.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.gameName && (
                <p className="text-sm text-destructive">{errors.gameName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gamerId">Gamer ID</Label>
              <Input
                id="gamerId"
                name="gamerId"
                {...register("gamerId")}
                placeholder="e.g., PlayerOne123"
              />
              {errors.gamerId && (
                <p className="text-sm text-destructive">{errors.gamerId.message}</p>
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
              Add Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
