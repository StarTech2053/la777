
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlayersTable } from "@/components/players/players-table";
import { UserPlus, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Player, Transaction } from "@/lib/types";
import { TransactionDialog } from "@/components/players/transaction-dialog";
import { EditPlayerDialog } from "@/components/players/edit-player-dialog";
import { deletePlayers } from "./actions";
import { CreditDialog } from "@/components/players/credit-dialog";
import { ReferralDialog } from "@/components/players/referral-dialog";
import { useAuth } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players-store";
import { useFirebaseCollection } from "@/hooks/use-firebase-cache";

const ITEMS_PER_PAGE = 10;

export default function PlayersPage() {
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<Set<string>>(new Set());
  const [isTransactionOpen, setIsTransactionOpen] = React.useState(false);
  const [isCreditOpen, setIsCreditOpen] = React.useState(false);
  const [isReferralOpen, setIsReferralOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [playerForAction, setPlayerForAction] = React.useState<Player | undefined>(undefined);
  const [transactionType, setTransactionType] = React.useState<'deposit' | 'withdraw'>('deposit');
  const [creditType, setCreditType] = React.useState<'Freeplay' | 'Bonusplay'>('Freeplay');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useAuth();
  const { players, isLoading, refreshPlayers } = usePlayersStore();
  const { data: transactions } = useFirebaseCollection<Transaction>('transactions', { orderBy: 'date' });
  
  const selectionCount = selectedPlayerIds.size;

  // Debug logging
  React.useEffect(() => {
    console.log("🔍 Players data debug:", {
      playersCount: players.length,
      isLoading,
      players: players.slice(0, 3) // Log first 3 players
    });
  }, [players, isLoading]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPlayers();
      toast({
        variant: "success",
        title: "Success",
        description: "Players data refreshed successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh players data.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectionChange = (selectedIds: Set<string>) => {
    setSelectedPlayerIds(selectedIds);
  };
  
  const handleAddUser = () => {
    router.push('/players/add');
  };

  const getSingleSelectedPlayer = (): Player | undefined => {
    if(selectedPlayerIds.size !== 1) return undefined;
    const selectedId = selectedPlayerIds.values().next().value;
    return players.find(p => p.id === selectedId);
  }

  const handleEdit = (player?: Player) => {
    const playerToEdit = player || getSingleSelectedPlayer();
    if (playerToEdit) {
      setPlayerForAction(playerToEdit);
      setIsEditOpen(true);
    }
  };
  
  const handleTransaction = (type: 'deposit' | 'withdraw', player?: Player) => {
    const playerForTx = player || getSingleSelectedPlayer();
     if (playerForTx) {
        setPlayerForAction(playerForTx);
        setTransactionType(type);
        setIsTransactionOpen(true);
     }
  };
  
  const handleCredit = (type: 'Freeplay' | 'Bonusplay', player?: Player) => {
    const playerForTx = player || getSingleSelectedPlayer();
     if (playerForTx) {
        setPlayerForAction(playerForTx);
        setCreditType(type);
        setIsCreditOpen(true);
     }
  };

   const handleReferral = (player?: Player) => {
    const playerForAction = player || getSingleSelectedPlayer();
    if (playerForAction) {
      setPlayerForAction(playerForAction);
      setIsReferralOpen(true);
    }
  };

  const handleDelete = (player?: Player) => {
    if (player) {
      // If a specific player is passed (from row action), select only that one
      setSelectedPlayerIds(new Set([player.id]));
      setPlayerForAction(player);
    } else if (selectionCount > 0) {
      // For bulk delete from top button
      setPlayerForAction(undefined);
    }
    setIsDeleteOpen(true);
  };
  
  const confirmDelete = async () => {
    const playersToDelete = Array.from(selectedPlayerIds);
    if (playersToDelete.length === 0) return;

    try {
        const result = await deletePlayers(playersToDelete);
        
        if (result.success) {
            toast({
                variant: "success",
                title: "Success",
                description: `${playersToDelete.length} player(s) have been deleted.`,
            });
            // Refresh players data after deletion
            await refreshPlayers();
        }

        setSelectedPlayerIds(new Set()); // Clear selection
        setIsDeleteOpen(false);
        setPlayerForAction(undefined);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete player(s).";
        toast({
            variant: 'destructive',
            title: "Error",
            description: errorMessage,
        });
    }
  }

  // Sort players by latest activity and join date
  const sortedPlayers = React.useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return players.sort((a, b) => {
      // Get latest transaction for each player
      const playerATransactions = transactions.filter((t: Transaction) => t.playerName === a.name);
      const playerBTransactions = transactions.filter((t: Transaction) => t.playerName === b.name);
      
      const latestATransaction = playerATransactions.length > 0 
        ? new Date(Math.max(...playerATransactions.map((t: Transaction) => new Date(t.date).getTime())))
        : new Date(0);
      
      const latestBTransaction = playerBTransactions.length > 0 
        ? new Date(Math.max(...playerBTransactions.map((t: Transaction) => new Date(t.date).getTime())))
        : new Date(0);
      
      // Sort by latest activity first, then by join date
      if (latestATransaction.getTime() !== latestBTransaction.getTime()) {
        return latestBTransaction.getTime() - latestATransaction.getTime();
      }
      
      // If no recent activity, sort by join date
      const joinDateA = new Date(a.joinDate);
      const joinDateB = new Date(b.joinDate);
      return joinDateB.getTime() - joinDateA.getTime();
    });
  }, [players, transactions]);

  const filteredPlayers = React.useMemo(() => {
    if (!searchQuery) return sortedPlayers;
    return sortedPlayers.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedPlayers, searchQuery]);
  
  const refreshAndClose = async () => {
    setIsTransactionOpen(false);
    setIsCreditOpen(false);
    setIsReferralOpen(false);
    setIsEditOpen(false);
    setIsDeleteOpen(false);
    setPlayerForAction(undefined);
    setSelectedPlayerIds(new Set());
    // Refresh players data after any action
    await refreshPlayers();
  }

  const handleTransactionSuccess = async () => {
    toast({
        variant: "success",
        title: "Success",
        description: `Transaction has been recorded.`,
    });
    await refreshAndClose();
  };

  const handleCreditSuccess = async () => {
    toast({
        variant: "success",
        title: "Success",
        description: `Credit has been applied.`,
    });
    await refreshAndClose();
  };

  const handleReferralSuccess = async () => {
    toast({
      variant: "success",
      title: "Success",
      description: `Referral bonus has been applied.`,
    });
    await refreshAndClose();
  };

  const handleEditSuccess = async () => {
     toast({
        variant: "success",
        title: "Success",
        description: `Player has been updated.`,
    });
    await refreshAndClose();
  }


  const isAddUserDisabled = selectionCount > 0;
  const isDeleteDisabled = selectionCount === 0;

  // Pagination logic
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
  
  // Reset page to 1 when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Debug logging for table data
  console.log("🔍 Table data debug:", {
    filteredPlayersCount: filteredPlayers.length,
    currentPlayersCount: currentPlayers.length,
    currentPage,
    totalPages,
    isLoading
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
         <div className="flex-1">
          <Input 
            id="search-players"
            name="search-players"
            placeholder="Search players..." 
            className="max-w-sm" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="destructive" disabled={isDeleteDisabled} onClick={() => handleDelete()}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
          <Button disabled={isAddUserDisabled} onClick={handleAddUser}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Player
          </Button>
        </div>
      </div>
      <PlayersTable 
        playersData={currentPlayers}
        isLoading={isLoading}
        selectedPlayerIds={selectedPlayerIds}
        onSelectionChange={handleSelectionChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTransaction={handleTransaction}
        onCredit={handleCredit}
        onReferral={handleReferral}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalPlayers={filteredPlayers.length}
        itemsPerPage={ITEMS_PER_PAGE}
        role={role}
      />
      <TransactionDialog
        isOpen={isTransactionOpen}
        onOpenChange={setIsTransactionOpen}
        type={transactionType}
        player={playerForAction}
        onSuccess={handleTransactionSuccess}
      />
      <CreditDialog
        isOpen={isCreditOpen}
        onOpenChange={setIsCreditOpen}
        type={creditType}
        player={playerForAction}
        onSuccess={handleCreditSuccess}
      />
      <ReferralDialog
        isOpen={isReferralOpen}
        onOpenChange={setIsReferralOpen}
        player={playerForAction}
        onSuccess={handleReferralSuccess}
      />
      <EditPlayerDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        player={playerForAction}
        onSuccess={handleEditSuccess}
      />
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected player(s) and all of their associated transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
