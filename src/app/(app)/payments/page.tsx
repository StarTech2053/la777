"use client";

import { PaymentTagsCard } from "@/components/payments/payment-tags";
import { PaymentsTable } from "./(components)/payments-table";
import { WithdrawRequests } from "@/components/payments/withdraw-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWithdrawNotifications } from "@/hooks/use-withdraw-notifications";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const { hasNewRequests } = useWithdrawNotifications();

  return (
    <div className="space-y-4">
       <Tabs defaultValue="tag">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tag">Tag</TabsTrigger>
          <TabsTrigger 
            value="withdraw" 
            className={cn(
              "relative transition-all duration-300",
              hasNewRequests && "animate-flicker bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-[length:200%_100%] text-white font-semibold shadow-lg"
            )}
          >
            Withdraw
            {hasNewRequests && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
            <div className="rounded-lg border shadow-sm mt-4">
                <PaymentsTable title="Recent Transactions" description="An overview of all deposits and withdrawals." />
            </div>
        </TabsContent>
        <TabsContent value="tag">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-lg border shadow-sm">
                <PaymentTagsCard method="Chime" />
            </div>
            <div className="rounded-lg border shadow-sm">
                <PaymentTagsCard method="CashApp" />
            </div>
            <div className="rounded-lg border shadow-sm">
                <PaymentTagsCard method="PayPal" />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="withdraw">
          <div className="mt-4">
            <WithdrawRequests />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
