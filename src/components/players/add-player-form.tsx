
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { usePlayersStore } from "@/hooks/use-players-store";
import { addPlayer } from "@/app/(app)/players/actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string()
    .min(1, "Player Name is required")
    .trim(),
  facebookUrl: z.string().regex(/^(https?:\/\/)?(www\.)?facebook\.com\/.*/i, "Please enter a valid Facebook URL"),
  referredBy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddPlayerForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { players, isLoading, refreshPlayers } = usePlayersStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      facebookUrl: "",
      referredBy: "none",
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      console.log("🔄 Starting player addition process...");

      const submissionData = {
        ...data,
        referredBy: data.referredBy === "none" ? undefined : data.referredBy,
      };

      console.log("🔄 Adding new player:", submissionData);
      
      // Use server action instead of direct Firebase calls
      const result = await addPlayer(submissionData);

      if (result.success) {
        console.log("✅ Player added successfully with ID:", result.id);
        
        // Force refresh players data multiple times to ensure update
        console.log("🔄 Forcing players data refresh...");
        
        // First immediate refresh
        await refreshPlayers();
        
        // Wait a bit and refresh again
        setTimeout(async () => {
          await refreshPlayers();
        }, 1000);
        
        // Wait more and refresh again
        setTimeout(async () => {
          await refreshPlayers();
        }, 2000);
        
        // Reset form
        reset();
        
        toast({
          variant: "success",
          title: "Success",
          description: "Player has been added successfully. Refreshing data...",
        });
        
        // Navigate back to players list after a short delay
        setTimeout(() => {
          router.push("/players");
        }, 1500);
      } else {
        throw new Error(result.error || "Failed to add player");
      }
    } catch (error) {
      console.error("❌ Error adding player:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add player. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Player</CardTitle>
        <CardDescription>
          Fill in the details below to add a new player to the system.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., John Doe" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook Link</Label>
            <Input id="facebookUrl" {...register("facebookUrl")} placeholder="https://facebook.com/..." />
            {errors.facebookUrl && <p className="text-sm text-destructive">{errors.facebookUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="referredBy">Referred By</Label>
             <Controller
                name="referredBy"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="referredBy">
                      <SelectValue placeholder={isLoading ? "Loading..." : "Select a player..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
          </div>
           <div className="space-y-2">
            <Label>Player ID</Label>
            <Input readOnly disabled value="(auto-generated)" />
          </div>
           <div className="space-y-2">
            <Label>Join Date</Label>
            <Input readOnly disabled value="(auto-generated)" />
          </div>
          <div className="flex justify-end pt-4">
             <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Player...
                </>
              ) : (
                "Add Player"
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
