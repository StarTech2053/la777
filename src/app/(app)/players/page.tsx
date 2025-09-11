
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlayersTable } from "@/components/players/players-table";
import { UserPlus, Trash2, Users, UserCheck, UserX, UserMinus, Download } from "lucide-react";
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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

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
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'Active' | 'Inactive' | 'Blocked' | 'New'>('all');
  
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useAuth();
  const { players, isLoading, refreshPlayers, statusCounts } = usePlayersStore();
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

  // Sort players: recent activity first, then new players, then by join date
  const sortedPlayers = React.useMemo(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const sorted = [...players].sort((a, b) => {
      // Check for recent activity (transactions within last 5 minutes)
      const aLastActivity = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
      const bLastActivity = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
      
      const aHasRecentActivity = aLastActivity > fiveMinutesAgo;
      const bHasRecentActivity = bLastActivity > fiveMinutesAgo;
      
      // If one has recent activity and other doesn't, prioritize recent activity
      if (aHasRecentActivity && !bHasRecentActivity) return -1;
      if (!aHasRecentActivity && bHasRecentActivity) return 1;
      
      // If both have recent activity, sort by lastActivity (most recent first)
      if (aHasRecentActivity && bHasRecentActivity) {
        return bLastActivity.getTime() - aLastActivity.getTime();
      }
      
      // If neither has recent activity, sort by creation date (newest players first)
      if (a.createdAt && b.createdAt) {
        const createdAtA = new Date(a.createdAt);
        const createdAtB = new Date(b.createdAt);
        const timeDiff = createdAtB.getTime() - createdAtA.getTime();
        if (timeDiff !== 0) return timeDiff;
      }
      
      // Fallback to joinDate
      const joinDateA = new Date(a.joinDate);
      const joinDateB = new Date(b.joinDate);
      const joinTimeDiff = joinDateB.getTime() - joinDateA.getTime();
      if (joinTimeDiff !== 0) return joinTimeDiff;
      
      // Final fallback to lastActivity (for older players)
      return bLastActivity.getTime() - aLastActivity.getTime();
    });
    
    // Debug: Log first 3 players to see sorting order
    console.log("🔍 Players sorted order (first 3):", 
      sorted.slice(0, 3).map(p => ({
        name: p.name,
        joinDate: p.joinDate,
        createdAt: p.createdAt,
        lastActivity: p.lastActivity,
        recentActivity: p.lastActivity ? new Date(p.lastActivity) > fiveMinutesAgo : false
      }))
    );
    
    return sorted;
  }, [players]);

  const filteredPlayers = React.useMemo(() => {
    let filtered = sortedPlayers;
    
    // Apply status filter
    if (statusFilter === 'Active' || statusFilter === 'Inactive' || statusFilter === 'Blocked') {
      filtered = filtered.filter(player => player.status === statusFilter);
    } else if (statusFilter === 'New') {
      const now = new Date().getTime();
      const TWO_MINUTES = 2 * 60 * 1000;
      filtered = filtered.filter(player => {
        const joinTime = new Date(player.joinDate).getTime();
        return now - joinTime < TWO_MINUTES;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [sortedPlayers, searchQuery, statusFilter]);
  
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

  const handleExportPlayers = () => {
    if (players.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No players found to export.",
      });
      return;
    }

    // Create CSV headers
    const headers = ['Player Name', 'Status', 'Facebook URL', 'Register Date', 'Total FreePlay', 'Total Bonus Play', 'Total Referral Bonus', 'Total Deposit Amount', 'Total Deposit Bonus', 'Total Withdraw Amount', 'P&L'];
    
    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...players.map(player => {
        const stats = player.stats || {
          tDeposit: 0,
          tWithdraw: 0,
          pAndL: 0,
          tDepositBonus: 0,
          tFreePlay: 0,
          tBonusPlay: 0,
          tReferralBonus: 0
        };
        
        return [
          `"${player.name}"`,
          `"${player.status}"`,
          `"${player.facebookUrl}"`,
          `"${format(new Date(player.joinDate), "MM/dd/yyyy")}"`,
          `"${stats.tFreePlay.toLocaleString()}"`,
          `"${stats.tBonusPlay.toLocaleString()}"`,
          `"${stats.tReferralBonus.toLocaleString()}"`,
          `"${(stats.tDeposit + stats.tDepositBonus).toLocaleString()}"`,
          `"${stats.tDepositBonus.toLocaleString()}"`,
          `"${stats.tWithdraw.toLocaleString()}"`,
          `"${stats.pAndL.toLocaleString()}"`
        ].join(',');
      })
    ];
    
    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `players-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      variant: "success",
      title: "Export Successful",
      description: `Exported ${players.length} players to CSV.`,
    });
  };

  // Function to update player status to inactive
  const updatePlayerStatusToInactive = async (playerId: string) => {
    try {
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        status: 'Inactive'
      });
      console.log(`✅ Player ${playerId} status updated to Inactive`);
    } catch (error) {
      console.error(`❌ Error updating player ${playerId} status:`, error);
    }
  };


  const isAddUserDisabled = selectionCount > 0;
  const isDeleteDisabled = selectionCount === 0;

  // Pagination logic
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
  
  // Reset page to 1 when search query or status filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Automatic player status update - check every 30 seconds
  React.useEffect(() => {
    const checkAndUpdatePlayerStatus = () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Find active players who haven't had any transactions in the last 5 minutes
      const activePlayersToUpdate = players.filter(player => {
        if (player.status !== 'Active') return false;
        
        // Check if player has any recent transactions
        const playerTransactions = transactions.filter(transaction => 
          transaction.playerName === player.name || 
          transaction.playerTag === player.name
        );
        
        if (playerTransactions.length === 0) {
          // No transactions at all, check join date
          const joinDate = new Date(player.joinDate);
          return joinDate < fiveMinutesAgo;
        }
        
        // Check last transaction date
        const lastTransaction = playerTransactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        
        const lastTransactionDate = new Date(lastTransaction.date);
        return lastTransactionDate < fiveMinutesAgo;
      });
      
      // Update status for players who should be inactive
      activePlayersToUpdate.forEach(player => {
        updatePlayerStatusToInactive(player.id);
      });
      
      if (activePlayersToUpdate.length > 0) {
        console.log(`🔄 Auto-updated ${activePlayersToUpdate.length} players to Inactive status`);
        // Refresh players data to reflect the changes
        refreshPlayers();
      }
    };

    // Run immediately
    checkAndUpdatePlayerStatus();
    
    // Set up interval to check every 30 seconds
    const interval = setInterval(checkAndUpdatePlayerStatus, 30000);
    
    return () => clearInterval(interval);
  }, [players, transactions, refreshPlayers]);

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
            variant={statusFilter === 'Active' ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              statusFilter === 'Active' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'hover:bg-green-50 hover:text-green-600 border-green-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'Active' ? 'all' : 'Active')}
          >
            <Users className="h-4 w-4" />
            Active Players ({statusCounts.Active})
          </Button>
          <Button 
            variant={statusFilter === 'New' ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              statusFilter === 'New' 
                ? 'bg-sky-600 hover:bg-sky-700 text-white' 
                : 'hover:bg-sky-50 hover:text-sky-600 border-sky-200 text-sky-600'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'New' ? 'all' : 'New')}
          >
            <UserCheck className="h-4 w-4" />
            New Players ({React.useMemo(() => {
              const now = new Date().getTime();
              const TWO_MINUTES = 2 * 60 * 1000;
              return players.filter(p => now - new Date(p.joinDate).getTime() < TWO_MINUTES).length;
            }, [players])})
          </Button>
          <Button 
            variant={statusFilter === 'Inactive' ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              statusFilter === 'Inactive' 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : 'hover:bg-yellow-50 hover:text-yellow-600 border-yellow-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'Inactive' ? 'all' : 'Inactive')}
          >
            <UserX className="h-4 w-4" />
            InActive Players ({statusCounts.Inactive})
          </Button>
          <Button 
            variant={statusFilter === 'Blocked' ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              statusFilter === 'Blocked' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'hover:bg-red-50 hover:text-red-600 border-red-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'Blocked' ? 'all' : 'Blocked')}
          >
            <UserMinus className="h-4 w-4" />
            Blocked Players ({statusCounts.Blocked})
          </Button>
          <Button variant="destructive" disabled={isDeleteDisabled} onClick={() => handleDelete()}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" onClick={handleExportPlayers} disabled={players.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export Players
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
