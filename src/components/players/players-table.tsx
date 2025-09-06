
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Link as LinkIcon,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Gift,
  Award,
  Users,
} from "lucide-react";
import type { Player } from "@/lib/types";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

type PlayersTableProps = {
  playersData: Player[];
  isLoading: boolean;
  selectedPlayerIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onTransaction: (type: 'deposit' | 'withdraw', player: Player) => void;
  onCredit: (type: 'Freeplay' | 'Bonusplay', player: Player) => void;
  onReferral: (player: Player) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalPlayers: number;
  itemsPerPage: number;
  role: 'Admin' | 'Agent' | 'Cashier' | null;
};

export function PlayersTable({ 
    playersData,
    isLoading,
    selectedPlayerIds,
    onSelectionChange, 
    onEdit,
    onDelete,
    onTransaction,
    onCredit,
    onReferral,
    currentPage,
    totalPages,
    onPageChange,
    totalPlayers,
    role,
}: PlayersTableProps) {
  
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const newSelectedRows = new Set<string>();
    if (checked === true) {
      playersData.forEach((p) => newSelectedRows.add(p.id));
    }
    onSelectionChange(newSelectedRows);
  };

  const handleSelectRow = (playerId: string) => {
    const newSelectedRows = new Set(selectedPlayerIds);
    if (newSelectedRows.has(playerId)) {
      newSelectedRows.delete(playerId);
    } else {
      newSelectedRows.add(playerId);
    }
    onSelectionChange(newSelectedRows);
  };
  
  const isAllSelected = playersData.length > 0 && selectedPlayerIds.size === playersData.length;
  const isSomeSelected = selectedPlayerIds.size > 0 && selectedPlayerIds.size < playersData.length;
  
  const playerStatusVariant = {
      Active: 'success' as const,
      Inactive: 'warning' as const,
      Blocked: 'destructive' as const,
  };

  // Helper function to safely get stats values
  const getSafeStats = (player: Player) => {
    const defaultStats = {
      tFreePlay: 0,
      tDeposit: 0,
      tWithdraw: 0,
      tBonusPlay: 0,
      tDepositBonus: 0,
      tReferralBonus: 0,
      pAndL: 0
    };
    
    return player.stats || defaultStats;
  };

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                onCheckedChange={handleSelectAll}
                disabled={playersData.length === 0}
              />
            </TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>T-Free Play</TableHead>
            <TableHead>T-Deposit</TableHead>
            <TableHead>T-Withdraw</TableHead>
            <TableHead>T-Bonus Play</TableHead>
            <TableHead>T-Deposit Bonus</TableHead>
            <TableHead>T-Referral Bonus</TableHead>
            <TableHead>P&L</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
             Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Checkbox disabled /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))
          ) : playersData.length > 0 ? (
            playersData.map((player) => {
              const stats = getSafeStats(player);
              return (
                <TableRow
                  key={player.id}
                  data-state={selectedPlayerIds.has(player.id) && "selected"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedPlayerIds.has(player.id)}
                      onCheckedChange={() => handleSelectRow(player.id)}
                    />
                  </TableCell>
                  <TableCell>
                     <Link href={`/players/${player.id}`} className="font-medium hover:underline">
                        {player.name}
                     </Link>
                    <Link
                      href={player.facebookUrl}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      Facebook
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant={playerStatusVariant[player.status]}>{player.status}</Badge></TableCell>
                  <TableCell>{stats.tFreePlay.toLocaleString()}</TableCell>
                  <TableCell>${stats.tDeposit.toLocaleString()}</TableCell>
                  <TableCell>${stats.tWithdraw.toLocaleString()}</TableCell>
                  <TableCell>{stats.tBonusPlay.toLocaleString()}</TableCell>
                  <TableCell>${stats.tDepositBonus?.toLocaleString() || '0'}</TableCell>
                  <TableCell>{stats.tReferralBonus.toLocaleString()}</TableCell>
                  <TableCell>${stats.pAndL.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(player)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onTransaction('deposit', player)}>
                          <ArrowDownLeft className="mr-2 h-4 w-4" />
                          Deposit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onTransaction('withdraw', player)}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Withdraw
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => onCredit('Freeplay', player)}>
                          <Gift className="mr-2 h-4 w-4" />
                          Freeplay
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => onCredit('Bonusplay', player)}>
                          <Award className="mr-2 h-4 w-4" />
                          Bonusplay
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onReferral(player)}>
                          <Users className="mr-2 h-4 w-4" />
                          Referral
                        </DropdownMenuItem>
                        {role !== 'Agent' && (
                            <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(player)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                           </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                    No players found.
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
       <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedPlayerIds.size} of {totalPlayers} row(s) selected.
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 hidden sm:flex"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 hidden sm:flex"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
