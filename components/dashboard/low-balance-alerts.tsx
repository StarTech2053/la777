
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";
import { Game } from "@/lib/types";

export function LowBalanceAlerts() {
    const [lowBalanceGames, setLowBalanceGames] = React.useState<Game[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const gamesQuery = query(collection(db, "games"), where("balance", "<", 1000));
        const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
            const gamesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Game);
            setLowBalanceGames(gamesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching low balance games:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle>Low Balance Alerts</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    if (lowBalanceGames.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <CardTitle>Low Balance Alerts</CardTitle>
                </div>
                <CardDescription>
                    These games are running low on balance. Please recharge them.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    {lowBalanceGames.map(game => (
                        <li key={game.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                            <span className="font-semibold">{game.name}</span>
                            <span className="text-destructive font-bold">${game.balance.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
