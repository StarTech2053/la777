
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { 
    ArrowLeft, 
    Plus, 
    Upload, 
    Link as LinkIcon, 
    Download, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    User,
    TrendingUp,
    Gamepad2,
    Users,
    Activity
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { usePlayersStore } from '@/hooks/use-players-store';
import { updatePlayerAvatar } from '@/app/(app)/players/actions';
import Link from 'next/link';
import type { Player, Transaction, GamingAccount } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';
import { AddGameAccountDialog } from '@/components/players/add-game-account-dialog';
import { UpdateAvatarUrlDialog } from '@/components/players/update-avatar-url-dialog';
import { ReferralDialog } from '@/components/players/referral-dialog';

const ACTIVITY_ITEMS_PER_PAGE = 3;

function DetailItem({ label, value, isLoading }: { label: string, value: React.ReactNode, isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
        );
    }
    
    return (
        <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}

export default function PlayerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const { players: allPlayers, isLoading: arePlayersLoading, getPlayerById, refreshPlayers } = usePlayersStore();

    const [player, setPlayer] = useState<Player | null | undefined>(undefined);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isAddGameOpen, setIsAddGameOpen] = useState(false);
    const [isUpdateUrlOpen, setIsUpdateUrlOpen] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const [selectedReferralPlayer, setSelectedReferralPlayer] = useState<Player | null>(null);
    const [activityPage, setActivityPage] = useState(1);
    const [avatarKey, setAvatarKey] = useState(0); // Force re-render

    const loadPlayerData = useCallback(() => {
        if (!id) return;

        console.log("🔄 Setting up real-time player data listeners...");
        
        const playerDocRef = doc(db, 'players', id);
        const unsubscribePlayer = onSnapshot(playerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const playerData = { id: docSnap.id, ...docSnap.data() } as Player;
                console.log("✅ Real-time player update received:", playerData.name);
                
                const transactionsQuery = query(
                    collection(db, 'transactions'), 
                    where('playerName', '==', playerData.name),
                    orderBy('date', 'desc')
                );

                const unsubscribeTransactions = onSnapshot(transactionsQuery, (querySnapshot) => {
                    const playerTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                    console.log("✅ Real-time transactions update received:", playerTransactions.length, "transactions");

                    // Recalculate stats based on transactions
                    const tDeposit = playerTransactions.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + t.amount, 0);
                    const tWithdraw = playerTransactions.filter(t => t.type === 'Withdraw').reduce((sum, t) => sum + t.amount, 0);
                    const tFreePlay = playerTransactions.filter(t => t.type === 'Freeplay').reduce((sum, t) => sum + t.amount, 0);
                    const tBonusPlay = playerTransactions.filter(t => t.type === 'Bonusplay').reduce((sum, t) => sum + t.amount, 0);
                    const tReferralBonus = playerTransactions.filter(t => t.type === 'Referral').reduce((sum, t) => sum + t.amount, 0);
                    
                    // Calculate deposit bonus correctly
                    const tDepositBonus = playerTransactions.filter(t => t.type === 'Deposit').reduce((sum, t) => {
                        // If depositBonus field exists, use it (it's the percentage)
                        if (t.depositBonus && t.amount) {
                            const bonusAmount = (t.amount * t.depositBonus / 100);
                            console.log("💰 Deposit Bonus Calculation:", {
                                transactionId: t.id,
                                amount: t.amount,
                                depositBonusPercent: t.depositBonus,
                                bonusAmount: bonusAmount
                            });
                            return sum + bonusAmount;
                        }
                        return sum;
                    }, 0);
                    
                    const pAndL = tDeposit - tWithdraw;
                    
                    const updatedPlayer: Player = {
                        ...playerData,
                        stats: {
                            ...playerData.stats,
                            tDeposit,
                            tWithdraw,
                            tFreePlay,
                            tBonusPlay,
                            tReferralBonus,
                            tDepositBonus,
                            pAndL,
                        },
                    };

                    setPlayer(updatedPlayer);
                    setTransactions(playerTransactions);
                    setIsLoading(false);
                });
                
                return () => unsubscribeTransactions();

            } else {
                console.log("📄 Player document does not exist");
                setPlayer(null);
                setIsLoading(false);
            }
        });

        return () => unsubscribePlayer();
    }, [id]);

    useEffect(() => {
        const unsubscribe = loadPlayerData();
        return () => unsubscribe?.();
    }, [loadPlayerData]);

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!player) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const avatarUrl = reader.result as string;
            await updateAvatar(avatarUrl);
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to read the image file.",
            });
            setIsUploading(false);
        };
    };

    const updateAvatar = async (avatarUrl: string) => {
        if (!player) return;
        setIsUploading(true);
        try {
            console.log("🔄 Updating avatar for player:", player.id, "URL:", avatarUrl);
            
            const result = await updatePlayerAvatar({ playerId: player.id, avatarUrl });
            if (result.success) {
                console.log("✅ Avatar update successful");
                
                // Refresh the players cache to get updated data
                await refreshPlayers();
                
                // Force re-render by updating local state
                setPlayer(prev => prev ? { ...prev, avatarUrl } : prev);
                
                // Force Avatar component to re-render
                setAvatarKey(prev => prev + 1);
                
                toast({
                    variant: "success",
                    title: "Success",
                    description: "Profile picture has been updated."
                });
            } else {
                throw new Error(result.error || "Failed to update avatar");
            }
        } catch (error) {
            console.error("❌ Error updating avatar:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to update profile picture.";
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            });
        } finally {
            setIsUploading(false);
            setIsUpdateUrlOpen(false);
        }
    };

    const handleAddGameSuccess = (newAccount: GamingAccount) => {
        toast({
            variant: "success",
            title: "Success",
            description: `Gaming account for ${newAccount.gameName} has been added.`,
        });
        setIsAddGameOpen(false);
    };

    const handleReferralSuccess = () => {
        toast({
            variant: "success",
            title: "Success",
            description: "Referral bonus has been processed successfully.",
        });
        setIsReferralOpen(false);
        setSelectedReferralPlayer(null);
    };

    const referrer = useMemo(() => {
        if (!player?.referredBy) return null;
        return allPlayers.find((p: Player) => p.name === player.referredBy);
    }, [player, allPlayers]);

    // Find players who were referred by this player with bonus status
    const referrals = useMemo(() => {
        if (!player) return [];
        
        const referredPlayers = allPlayers.filter((p: Player) => p.referredBy === player.name);
        
        // Check which referred players have received bonus
        return referredPlayers.map(referredPlayer => {
            // Check if this player has received referral bonus for this referred player
            const hasReceivedBonus = transactions.some(t => 
                t.type === 'Referral' && 
                t.referralId === referredPlayer.id
            );
            
            return {
                ...referredPlayer,
                hasReceivedBonus
            };
        });
    }, [player, allPlayers, transactions]);

    if (isLoading || arePlayersLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (player === null || player === undefined) {
        return notFound();
    }
    
    const playerStatusVariant = {
        Active: 'default' as const,
        Inactive: 'secondary' as const,
        Blocked: 'destructive' as const,
    };
    
    const pnlColor = player.stats.pAndL >= 0 ? 'text-emerald-500' : 'text-destructive';
    
    const totalActivityPages = Math.ceil(transactions.length / ACTIVITY_ITEMS_PER_PAGE);
    const paginatedActivities = transactions.slice(
        (activityPage - 1) * ACTIVITY_ITEMS_PER_PAGE,
        activityPage * ACTIVITY_ITEMS_PER_PAGE
    );

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-semibold md:text-2xl">
                        Player Profile
                    </h1>
                </div>

                {/* First Row - 3 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 1st Card - Player Name and Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Player Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group">
                                    <Avatar className="h-28 w-28 mb-4" key={`avatar-${player.id}-${avatarKey}`}>
                                        <AvatarImage src={player.avatarUrl || `https://i.pravatar.cc/150?u=${player.id}`} />
                                        <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                        <div className="flex gap-2">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8"
                                                onClick={() => avatarInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8"
                                                onClick={() => setIsUpdateUrlOpen(true)}
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                
                                <p className="text-xl font-bold">{player.name}</p>
                                <Badge variant={playerStatusVariant[player.status]} className="mt-1">
                                    {player.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2nd Card - Profile Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <DetailItem 
                                    isLoading={isLoading} 
                                    label="Join Date:" 
                                    value={format(new Date(player.joinDate), "dd-MMM-yyyy")} 
                                />
                                <DetailItem 
                                    isLoading={isLoading} 
                                    label="Profile URL:" 
                                    value={
                                        <Link href={player.facebookUrl || "#"} target="_blank" className="text-primary hover:underline">
                                            Facebook
                                        </Link>
                                    } 
                                />
                                                                 <DetailItem 
                                     isLoading={isLoading} 
                                     label="Referred by:" 
                                     value={
                                         player.referredBy ? (
                                             <Link 
                                                 href={`/players/${allPlayers.find(p => p.name === player.referredBy)?.id}`}
                                                 className="text-primary hover:underline font-medium"
                                             >
                                                 {player.referredBy}
                                             </Link>
                                         ) : (
                                             "N/A"
                                         )
                                     } 
                                 />
                                <DetailItem 
                                    isLoading={isLoading} 
                                    label="Last Activity:" 
                                    value={format(new Date(player.lastActivity), "dd-MMM-yyyy")} 
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3rd Card - Total Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <DetailItem label="FreePlay:" value={`$${player.stats.tFreePlay.toLocaleString()}`} />
                                <DetailItem label="Bonus Play:" value={`$${player.stats.tBonusPlay.toLocaleString()}`} />
                                <DetailItem label="Referral Bonus:" value={`$${player.stats.tReferralBonus.toLocaleString()}`} />
                                <DetailItem label="Deposit:" value={`$${player.stats.tDeposit.toLocaleString()}`} />
                                <DetailItem label="Deposit Bonus:" value={`$${player.stats.tDepositBonus.toLocaleString()}`} />
                                <DetailItem label="Withdraw:" value={`$${player.stats.tWithdraw.toLocaleString()}`} />
                                <DetailItem 
                                    label="P&L:" 
                                    value={<span className={pnlColor}>${player.stats.pAndL.toLocaleString()}</span>} 
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Second Row - 3 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 4th Card - Games */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gamepad2 className="h-5 w-5" />
                                Games
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Button 
                                    onClick={() => setIsAddGameOpen(true)} 
                                    size="sm" 
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Game
                                </Button>
                                
                                {player.gamingAccounts && player.gamingAccounts.length > 0 ? (
                                    <div className="space-y-2">
                                        {player.gamingAccounts.map((account, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                                <span className="text-sm font-medium">{account.gameName}</span>
                                                <span className="text-sm text-muted-foreground">{account.gamerId}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No games added yet.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5th Card - Referrals */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Referrals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                                                         {referrals.length > 0 ? (
                                 <div className="space-y-2">
                                     {referrals.map((referredPlayer) => (
                                         <div key={referredPlayer.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                             <Link 
                                                 href={`/players/${referredPlayer.id}`}
                                                 className={`text-sm font-medium hover:underline ${
                                                     referredPlayer.hasReceivedBonus 
                                                         ? 'text-primary' 
                                                         : 'text-orange-500'
                                                 }`}
                                             >
                                                 {referredPlayer.name}
                                             </Link>
                                             {referredPlayer.hasReceivedBonus ? (
                                                 <span className="text-sm text-muted-foreground">
                                                     Referred
                                                 </span>
                                                                                           ) : (
                                                  <button
                                                      onClick={() => {
                                                          setSelectedReferralPlayer(referredPlayer);
                                                          setIsReferralOpen(true);
                                                      }}
                                                      className="text-sm text-orange-500 hover:text-orange-600 hover:underline cursor-pointer"
                                                  >
                                                      Pending Bonus
                                                  </button>
                                              )}
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No referrals yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* 6th Card - Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {paginatedActivities.length > 0 ? (
                                    <>
                                        {paginatedActivities.map((transaction) => (
                                            <div key={transaction.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{transaction.gameName}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(transaction.date), "dd-MMM-yy")}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-sm font-medium ${
                                                        transaction.type === 'Deposit' ? 'text-emerald-500' : 'text-destructive'
                                                    }`}>
                                                        {transaction.type === 'Deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground block">
                                                        {transaction.type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {totalActivityPages > 1 && (
                                            <div className="flex justify-center items-center gap-2 mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                                                    disabled={activityPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-sm">
                                                    {activityPage} of {totalActivityPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActivityPage(prev => Math.min(totalActivityPages, prev + 1))}
                                                    disabled={activityPage === totalActivityPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No recent activity.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddGameAccountDialog
                isOpen={isAddGameOpen}
                onOpenChange={setIsAddGameOpen}
                player={player}
                onSuccess={handleAddGameSuccess}
            />

            <UpdateAvatarUrlDialog
                isOpen={isUpdateUrlOpen}
                onOpenChange={setIsUpdateUrlOpen}
                onSuccess={updateAvatar}
            />

            <ReferralDialog
                isOpen={isReferralOpen}
                onOpenChange={setIsReferralOpen}
                player={player}
                selectedReferralPlayer={selectedReferralPlayer}
                onSuccess={handleReferralSuccess}
            />
        </>
    );
}