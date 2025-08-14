
"use client";

import { useMemo, useCallback } from 'react';
import { usePlayers } from './use-firebase-cache';
import type { Player } from '@/lib/types';

interface PlayersStore {
  players: Player[];
  isLoading: boolean;
  error: Error | null;
  newPlayers: Player[];
  statusCounts: Record<Player['status'], number>;
  getPlayerById: (id: string) => Player | undefined;
  refreshPlayers: () => Promise<void>;
}

export const usePlayersStore = (): PlayersStore => {
  const { data: players, isLoading, error, refresh } = usePlayers();

  // Memoized computations
  const newPlayers = useMemo(() => {
    const now = new Date().getTime();
    const TWO_MINUTES = 2 * 60 * 1000;
    return players.filter(p => now - new Date(p.joinDate).getTime() < TWO_MINUTES);
  }, [players]);

  const statusCounts = useMemo(() => {
    return players.reduce((acc, player) => {
      acc[player.status] = (acc[player.status] || 0) + 1;
      return acc;
    }, { Active: 0, Inactive: 0, Blocked: 0 } as Record<Player['status'], number>);
  }, [players]);

  const getPlayerById = useCallback((id: string): Player | undefined => {
    return players.find(p => p.id === id);
  }, [players]);

  const refreshPlayers = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return { 
    players, 
    isLoading, 
    error, 
    newPlayers, 
    statusCounts, 
    getPlayerById,
    refreshPlayers 
  };
};
