
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Banknote,
  FileText,
  Shield,
  Settings,
  CircleDollarSign,
  UserCheck,
} from "lucide-react";
import type { NavItem } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";


const allNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Players", href: "/players", icon: Users },
  { title: "Games", href: "/games", icon: Gamepad2 },
  { title: "Payments", href: "/payments", icon: Banknote },
  { title: "Reports", href: "/reports", icon: FileText },
  { title: "Users Manage", href: "/staff", icon: UserCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { role, isAuthenticated } = useAuth();

  const navItems = useMemo(() => {
    if (role === 'Admin') {
      return allNavItems;
    }
    if (role === 'Agent') {
      return allNavItems.filter(item => 
        item.title === 'Dashboard' || item.title === 'Players' || item.title === 'Games' || item.title === 'Payments'
      );
    }
    if (role === 'Cashier') {
        return allNavItems.filter(item =>
            item.title === 'Payments'
        );
    }
    return [];
  }, [role]);

  // Don't render the nav items until authentication is resolved
  // to prevent flicker or showing the wrong items.
  if (isAuthenticated === null) {
      return (
        <div className="flex h-full max-h-screen flex-col gap-2">
             <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <CircleDollarSign className="h-6 w-6 text-primary" />
                    <span className="">LA777 Casino</span>
                </Link>
            </div>
            <div className="flex-1 p-4">
                {/* You can add a loading skeleton here if you like */}
            </div>
        </div>
      );
  }


  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CircleDollarSign className="h-6 w-6 text-primary" />
          <span className="">LA777 Casino</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4">
        {/* Potentially a footer or other items can go here */}
      </div>
    </div>
  );
}
