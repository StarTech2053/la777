
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
// import { addGame } from "@/app/(app)/games/actions"; // Removed - using direct Firebase
import { useGames } from "@/hooks/use-firebase-cache";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Game Name is required"),
  imageFile: z.any().optional(), // File object for upload
  imageUrl: z.string().optional(), // URL or base64 for existing images
  balance: z.coerce.number().min(0, "Balance must be a positive number"),
  downloadUrl: z.string().min(1, "Please enter a valid Download URL"),
  panelUrl: z.string().min(1, "Please enter a valid Panel URL"),
  username: z.string().optional(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddGamePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const { refresh } = useGames(); // Get refresh function from cache

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      balance: 0,
      downloadUrl: "",
      panelUrl: "",
      username: "",
      password: "",
    }
  });

  const imageUrl = watch("imageUrl");

  React.useEffect(() => {
    if (imageUrl) {
      setImagePreview(imageUrl);
    } else {
      setImagePreview(null);
    }
  }, [imageUrl]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setValue("imageUrl", dataUri, { shouldValidate: true });
        setImagePreview(dataUri);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setValue("imageUrl", "", { shouldValidate: true });
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Validate that we have either a file or an image URL
      if (!selectedFile && !data.imageUrl) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select an image file.",
        });
        return;
      }

      console.log("🔄 Adding game to Firestore:", data.name);
      
      // Process image file directly in client
      let finalImageUrl = data.imageUrl || "";
      
      if (selectedFile) {
        console.log("🔄 Processing image file directly...");
        
        // Convert file to base64 directly
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = () => {
            const result = reader.result as string;
            console.log("✅ Base64 conversion successful, length:", result.length);
            resolve(result);
          };
          
          reader.onerror = () => {
            console.error("❌ FileReader error");
            reject(new Error("Failed to read image file"));
          };
          
          reader.readAsDataURL(selectedFile);
        });
        
        try {
          finalImageUrl = await base64Promise;
          console.log("✅ Image processed successfully");
        } catch (uploadError) {
          console.error("❌ Error processing image:", uploadError);
          throw new Error("Failed to process image. Please try again.");
        }
      }
      
      // Validate that we have an image URL
      if (!finalImageUrl) {
        throw new Error("Image is required. Please select an image file.");
      }
      
      // Add the game to Firestore directly
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const gameDoc = await addDoc(collection(db, "games"), {
        name: data.name,
        imageUrl: finalImageUrl,
        balance: data.balance,
        downloadUrl: data.downloadUrl,
        panelUrl: data.panelUrl,
        username: data.username || "",
        password: data.password || "",
        status: 'Active',
        lastRechargeDate: new Date().toISOString(),
        rechargeHistory: []
      });
      
      console.log("✅ Game added successfully with ID:", gameDoc.id);
      
      // Refresh the cache immediately
      await refresh();
      
      toast({
        variant: "success",
        title: "Success",
        description: "Game has been added successfully.",
      });
      
      router.push("/games");
      
    } catch (error) {
      console.error("❌ Error adding game:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add game. Please try again.";
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
        <CardTitle>Add New Game</CardTitle>
        <CardDescription>
          Fill in the details below to add a new game.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Game Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Cosmic Fortune" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
                data-ai-hint="game cover"
              />
            )}
            <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance</Label>
            <Input id="balance" type="number" {...register("balance")} placeholder="e.g., 5000" />
            {errors.balance && <p className="text-sm text-destructive">{errors.balance.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="downloadUrl">Download URL</Label>
            <Input id="downloadUrl" {...register("downloadUrl")} placeholder="https://example.com/download" />
            {errors.downloadUrl && <p className="text-sm text-destructive">{errors.downloadUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="panelUrl">Panel URL</Label>
            <Input id="panelUrl" {...register("panelUrl")} placeholder="https://example.com/panel" />
            {errors.panelUrl && <p className="text-sm text-destructive">{errors.panelUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Panel Username</Label>
            <Input id="username" {...register("username")} placeholder="Enter panel username" />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Panel Password</Label>
            <Input id="password" type="password" {...register("password")} placeholder="Enter panel password" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Game...
                </>
              ) : (
                "Add Game"
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
