
"use client";

import type { Game } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, Edit, Copy, FileText } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

type GameCardProps = {
  game: Game;
  onEdit: () => void;
  onReport: () => void;
};

export function GameCard({ game, onEdit, onReport }: GameCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { role } = useAuth();

  const statusVariant = {
    Active: "success",
    Inactive: "secondary",
    Disabled: "destructive",
  } as const;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) {
        toast({
            variant: "destructive",
            title: "Nothing to copy",
            description: `${fieldName} is empty.`,
        });
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({
        variant: "success",
        title: "Copied to clipboard",
        description: `${fieldName} has been copied.`,
      });
    }, (err) => {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: `Could not copy ${fieldName}.`,
      });
    });
  };

  return (
    <Card className="flex flex-col transition-all">
      <CardHeader className="relative p-0">
        <Image
          src={game.imageUrl}
          alt={game.name}
          width={600}
          height={400}
          className="rounded-t-lg object-cover aspect-[3/2]"
          data-ai-hint="game cover"
        />
        <div className="absolute top-2 right-2">
            {role !== 'Agent' && (
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow space-y-3">
        <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg">{game.name}</h3>
            <Badge variant={statusVariant[game.status]}>{game.status}</Badge>
        </div>
        <div>
            <p className="text-2xl font-bold">${game.balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
                Last Recharge: {game.lastRechargeDate ? format(new Date(game.lastRechargeDate), "PPp") : 'N/A'}
            </p>
        </div>
         <div className="space-y-2">
            <div>
              <Label htmlFor={`username-${game.id}`} className="text-xs">Username</Label>
              <div className="flex items-center gap-2">
                <Input id={`username-${game.id}`} type="text" value={game.username || ''} readOnly className="h-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(game.username || '', 'Username')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
             <div>
              <Label htmlFor={`password-${game.id}`} className="text-xs">Password</Label>
               <div className="flex items-center gap-2">
                <Input id={`password-${game.id}`} type="password" value={game.password || ''} readOnly className="h-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(game.password || '', 'Password')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
        </div>

      </CardContent>
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => copyToClipboard(game.downloadUrl, 'Download URL')}>
           <Download className="mr-2 h-4 w-4" /> Download
        </Button>
        <Button asChild>
          <a href={game.panelUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Panel
          </a>
        </Button>
        <Button variant="outline" className="col-span-2" onClick={onReport}>
            <FileText className="mr-2 h-4 w-4" /> Report
        </Button>
      </CardFooter>
    </Card>
  );
}
