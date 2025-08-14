"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePlayersStore } from "@/hooks/use-players-store";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, UserPlus, Activity, Clock } from "lucide-react";
import Link from "next/link";
import type { Transaction } from "@/lib/types";

export function NewPlayersOverview() {
  const { players } = usePlayersStore();
  const [recentActivities, setRecentActivities] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Get new players (joined in last 24 hours)
  const newPlayers = React.useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return players.filter(player => {
      const joinDate = new Date(player.joinDate);
      return joinDate >= oneDayAgo;
    }).sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
  }, [players]);

  React.useEffect(() => {
    // Get recent activities for new players
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, "transactions"), 
      where("date", ">=", oneDayAgo.toISOString()),
      orderBy("date", "desc"), 
      limit(15)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activities: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        activities.push({ ...doc.data(), id: doc.id } as Transaction);
      });
      setRecentActivities(activities);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching recent activities:", error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <span className="text-green-500">↓</span>;
      case 'Withdraw':
        return <span className="text-red-500">↑</span>;
      case 'Freeplay':
        return <span className="text-blue-500">🎁</span>;
      case 'Bonusplay':
        return <span className="text-purple-500">🏆</span>;
      case 'Referral':
        return <span className="text-orange-500">👥</span>;
      default:
        return <span>•</span>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours}h ago`;
    }
  };

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Players & Activities
          </CardTitle>
          <CardDescription>Recent player registrations and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* New Players Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Players (24h)
          </CardTitle>
          <CardDescription>Players who joined in the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          {newPlayers.length > 0 ? (
            <div className="space-y-4">
              {newPlayers.slice(0, 5).map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getPlayerInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/players/${player.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {player.name}
                    </Link>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatTime(player.joinDate)}
                    </div>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>
              ))}
              {newPlayers.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  +{newPlayers.length - 5} more new players
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No new players in the last 24 hours
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities (24h)
          </CardTitle>
          <CardDescription>Latest player activities and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="text-lg">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {activity.playerName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.type} • {activity.gameName || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {activity.type === 'Deposit' || activity.type === 'Withdraw' ? '$' : ''}
                      {activity.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(activity.date)}
                    </div>
                  </div>
                </div>
              ))}
              {recentActivities.length > 8 && (
                <div className="text-center text-sm text-muted-foreground">
                  +{recentActivities.length - 8} more activities
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activities in the last 24 hours
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
