
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CircleDollarSign, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, limit, query } from "firebase/firestore";
import type { Staff } from "@/lib/types";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
        try {
            const staffCollection = collection(db, "staff");
            const q = query(staffCollection, limit(1));
            const snapshot = await getDocs(q);
            setAdminExists(!snapshot.empty);
        } catch (error) {
            console.error("Error checking for admin user:", error);
            // Assume admin exists to prevent setup page from showing on error
            toast({
                variant: 'destructive',
                title: 'Connection Error',
                description: 'Could not connect to the database to verify system status. Please check your connection and refresh.'
            })
            setAdminExists(true); 
        }
    };
    checkAdminStatus();
  }, [toast]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      console.log("🔐 Attempting sign-in with:", { email: data.email, passwordLength: data.password.length });
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("✅ Sign-in successful for user:", user.uid);

      toast({
        variant: "success",
        title: "Login Successful",
        description: `Welcome back!`,
      });
      
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDoc = await getDoc(staffDocRef);
      if (staffDoc.exists()) {
        const staffData = staffDoc.data() as Staff;
        if (staffData.role === 'Cashier') {
          router.push('/payments');
        } else if (staffData.role === 'Super Admin') {
          router.push('/dashboard'); // Super Admin has full access
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard'); // Default redirect
      }

    } catch (error: any) {
        console.error("❌ Sign-in error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        let errorMessage = "An unknown error occurred.";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                errorMessage = "Invalid email or password. Please try again.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Too many login attempts. Please try again later.";
                break;
            case 'auth/user-disabled':
                errorMessage = "This account has been disabled.";
                break;
            case 'auth/invalid-login-credentials':
                errorMessage = "Invalid login credentials. Please check your email and password, or create a new account.";
                break;
            default:
                errorMessage = `Authentication error: ${error.message}. Please try again or contact support.`;
                break;
        }
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-4">
            <CircleDollarSign className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">PanelPilot Pro</span>
        </div>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      
      {adminExists === false && (
         <div className="p-4 pt-0 text-center">
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800">
                 <div className="flex items-center gap-2 justify-center">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-semibold">No Admin Account Found</p>
                 </div>
                 <p className="text-sm mt-1">The system needs an administrator. Click below to create the first account.</p>
                 <Button className="mt-3 w-full" onClick={() => router.push('/setup')}>
                    Setup Admin Account
                 </Button>
            </div>
         </div>
      )}

      {adminExists === true && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                    <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        <span className="sr-only">Toggle password visibility</span>
                    </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" {...register("rememberMe")} />
                <Label htmlFor="remember-me" className="font-normal">
                  Remember me
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
      )}

      {adminExists === null && (
         <div className="p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground"/>
            <p className="text-sm text-muted-foreground mt-2">Verifying system status...</p>
         </div>
      )}
    </Card>
  );
}
