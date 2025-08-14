
"use client";

import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <SearchX className="w-24 h-24 text-destructive" strokeWidth={1} />
        <h1 className="text-6xl font-bold text-destructive">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
          Sorry, we couldn&apos;t find the page you were looking for. It might
          have been moved or deleted.
        </p>
        <div className="flex gap-4 mt-6">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
