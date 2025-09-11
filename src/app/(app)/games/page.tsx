
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/games/game-card";
import { Input } from "@/components/ui/input";
import type { Game } from "@/lib/types";
import { PlusCircle, Loader2 } from "lucide-react";
import { EditGameDialog } from "@/components/games/edit-game-dialog";
import { GameReportDialog } from "@/components/games/game-report-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGames } from "@/hooks/use-firebase-cache";

export default function GamesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [selectedGame, setSelectedGame] = React.useState<Game | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useAuth();

  // Use the centralized caching hook for real-time updates
  const { data: games, isLoading, error, refresh } = useGames();

  // Debug logging
  React.useEffect(() => {
    console.log("🔍 Games data debug:", {
      gamesCount: games?.length || 0,
      isLoading,
      error: error?.message,
      games: games?.map((g: any) => ({ id: g.id, name: g.name, status: g.status }))
    });
  }, [games, isLoading, error]);


  const handleEditClick = (game: any) => {
    setSelectedGame(game as Game);
    setIsEditOpen(true);
  }

  const handleReportClick = (game: any) => {
    setSelectedGame(game as Game);
    setIsReportOpen(true);
  }

  const handleEditSuccess = (updatedGames: Game[]) => {
    // Refresh the cache to get latest data
    refresh();
    setIsEditOpen(false);
    setSelectedGame(undefined);
    toast({
      variant: "success",
      title: "Success",
      description: "Game details have been updated.",
    });
  }

  const handleDeleteSuccess = (updatedGames: Game[]) => {
    // Refresh the cache to get latest data
    refresh();
    setIsEditOpen(false);
    setSelectedGame(undefined);
    toast({
      variant: 'success',
      title: "Success",
      description: "Game has been deleted.",
    });
  }

  const filteredGames = React.useMemo(() => {
    if (!searchQuery || !games) return games || [];
    return games.filter(game =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [games, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Error loading games: {error.message}</p>
          <Button onClick={refresh} className="mt-2">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold">Games</h1>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Input 
          id="search-games"
          name="search-games"
          placeholder="Search games..." 
          className="max-w-sm" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          {role !== 'Agent' && (
            <Button onClick={() => router.push('/games/add')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Game
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(filteredGames as Game[]).map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onEdit={() => handleEditClick(game)}
            onReport={() => handleReportClick(game)}
          />
        ))}
      </div>
       {filteredGames.length === 0 && !isLoading && (
          <div className="text-center col-span-full py-12 text-muted-foreground">
              No games found. Click 'Add Game' to create one.
          </div>
        )}
      <EditGameDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        game={selectedGame}
        allGames={games as Game[] || []}
        onSuccess={handleEditSuccess}
        onDelete={handleDeleteSuccess}
       />
      <GameReportDialog
        isOpen={isReportOpen}
        onOpenChange={setIsReportOpen}
        game={selectedGame}
      />
    </div>
  );
}
