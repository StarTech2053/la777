
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun, PanelLeft, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { SidebarNav } from "./sidebar-nav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { RealTimeNotification, useRealTimeStatus } from "@/components/ui/real-time-notification";

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { role, name } = useAuth();
  const { status, lastUpdate } = useRealTimeStatus();

  const handleLogout = async () => {
    try {
      // Clear any cached data first
      if (typeof window !== 'undefined') {
        // Clear any localStorage or sessionStorage if needed
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Force a hard redirect to prevent hooks issues
      window.location.href = '/sign-in';
    } catch (error) {
      console.error("Error signing out: ", error);
      // Fallback redirect
      window.location.href = '/sign-in';
    }
  };


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 pt-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs p-0">
          <SidebarNav />
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        {/* Page titles are now handled within their respective page components */}
      </div>
      <div className="flex items-center gap-4">
        <RealTimeNotification status={status} lastUpdate={lastUpdate} className="hidden md:flex" />
        <span className="text-sm text-muted-foreground hidden md:inline-block">Welcome: {name} [{role}]</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${name || 'AU'}`} alt="Admin User" />
                <AvatarFallback>{name ? name.substring(0, 2).toUpperCase() : 'AU'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
