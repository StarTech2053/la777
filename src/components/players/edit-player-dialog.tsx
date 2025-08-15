
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { editPlayer } from "@/app/(app)/players/actions";

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
import type { Player } from "@/lib/types";
import { usePlayersStore } from "../../../hooks/use-players-store";

const formSchema = z.object({
  name: z.string().min(1, "Player Name is required"),
  facebookUrl: z.string().url("Please enter a valid Facebook URL"),
  status: z.enum(["Active", "Blocked", "Inactive"]),
  referredBy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPlayerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  player: Player | undefined;
  onSuccess: () => void;
}

export function EditPlayerDialog({
  isOpen,
  onOpenChange,
  player,
  onSuccess,
}: EditPlayerDialogProps) {
  const { toast } = useToast();
  const { players, isLoading } = usePlayersStore();
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
  
  const referrersList = React.useMemo(() => {
    if (!player) return [];
    // A referrer must have joined before the player being edited.
    const filteredPlayers = players.filter(p => 
      p.id !== player.id && new Date(p.joinDate) <= new Date(player.joinDate)
    );
    
    console.log("🔍 Referrers list for player:", player.name, {
      playerJoinDate: player.joinDate,
      totalPlayers: players.length,
      filteredPlayers: filteredPlayers.length,
      availableReferrers: filteredPlayers.map(p => ({ name: p.name, joinDate: p.joinDate }))
    });
    
    return filteredPlayers;
  }, [players, player]);


  React.useEffect(() => {
    if (player) {
      reset({
        name: player.name,
        facebookUrl: player.facebookUrl,
        status: player.status,
        referredBy: player.referredBy || 'none',
      })
    }
  }, [player, reset, isOpen]);

  const onSubmit = async (data: FormValues) => {
    if (!player) return;

    try {
      console.log("🚀 Starting player update for:", player.id);
      
      const submissionData = {
        ...data,
        playerId: player.id,
        referredBy: data.referredBy === 'none' ? undefined : data.referredBy,
      }
      
      console.log("📝 Submitting player update:", submissionData);
      const result = await editPlayer(submissionData);
      
      console.log("📊 Edit result:", result);
      
      if (result.success) {
        console.log("✅ Player update successful");
        toast({
          variant: "success",
          title: "Success",
          description: "Player updated successfully!",
        });
        onSuccess();
      } else {
        console.error("❌ Player update failed:", result.error);
        throw new Error(result.error || "Failed to update player");
      }
      
    } catch (error) {
      console.error("💥 Error in onSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update player. Please try again.";
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
            <DialogTitle>Edit Player: {player?.name}</DialogTitle>
            <DialogDescription>
              Update the player's details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4  max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="playerId">Player ID</Label>
              <Input id="playerId" value={player?.id || ''} readOnly disabled />
            </div>
             <div className="space-y-2">
              <Label htmlFor="joinDate">Join Date</Label>
              <Input id="joinDate" value={player ? format(new Date(player.joinDate), "PPp") : ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Player Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookUrl">Facebook Link</Label>
              <Input id="facebookUrl" {...register("facebookUrl")} />
              {errors.facebookUrl && <p className="text-sm text-destructive">{errors.facebookUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                )}
               />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referredBy">Referred By</Label>
               <Controller
                name="referredBy"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || "none"}
                    disabled={!!player?.referredBy || isLoading}
                  >
                    <SelectTrigger id="referredBy">
                      <SelectValue placeholder={isLoading ? "Loading..." : "Select a player..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {referrersList.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {player?.referredBy && (
                  <p className="text-xs text-muted-foreground pt-1">Referrer cannot be changed once set.</p>
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
            <Button type="submit" disabled={isSubmitting || isLoading}>
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
