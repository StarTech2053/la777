
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { usePlayersStore } from "@/hooks/use-players-store";

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
import { addPlayer } from "@/app/(app)/players/actions";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  name: z.string()
    .min(1, "Player Name is required")
    .trim(),
  facebookUrl: z.string().regex(/^(https?:\/\/)?(www\.)?facebook\.com\/.*/i, "Please enter a valid Facebook URL"),
  referredBy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;


export default function AddPlayerPage() {
    const { toast } = useToast();
  const router = useRouter();
  const { players, isLoading } = usePlayersStore();
  const { isAuthenticated, user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
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
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please sign in to add players.",
        });
        router.push("/sign-in");
        return;
      }

      const submissionData = {
        ...data,
        referredBy: data.referredBy === "none" ? "" : data.referredBy,
        createdBy: user.uid, // Add user ID who created the player
      };

      const result = await addPlayer(submissionData);

      if (result.success) {
        toast({
          variant: "success",
          title: "Success",
          description: "Player has been added successfully.",
        });
        router.push("/players");
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add player. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push("/sign-in");
    return null;
  }

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
                  <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
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
