import { PaymentTagsCard } from "@/components/payments/payment-tags";
import { PaymentsTable } from "./(components)/payments-table";
import { WithdrawRequests } from "@/components/payments/withdraw-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
       <Tabs defaultValue="tag">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tag">Tag</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
            <div className="rounded-lg border shadow-sm mt-4">
                <PaymentsTable title="Recent Transactions" description="An overview of all deposits and withdrawals." />
            </div>
        </TabsContent>
        <TabsContent value="tag">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border shadow-sm">
                <PaymentTagsCard method="Chime" />
            </div>
            <div className="rounded-lg border shadow-sm">
                <PaymentTagsCard method="CashApp" />
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
