"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Gift, 
  Calendar, 
  Users, 
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Copy
} from "lucide-react";

export default function RulesPromotionPage() {
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [rules, setRules] = useState([
    {
      id: 1,
      title: "General Rules",
      description: "Basic casino rules and guidelines",
      category: "withdraw",
      details: "Minimum age: 18 years, Valid ID required, One account per person"
    },
    {
      id: 2,
      title: "Game Rules",
      description: "Specific rules for different games",
      category: "freeplay-withdraw",
      details: "No cheating or collusion, Fair play policy enforced, House rules apply"
    },
    {
      id: 3,
      title: "Operating Hours",
      description: "Casino operating schedule",
      category: "bonusplay-withdraw",
      details: "24/7 online gaming, Live support available, Instant withdrawals"
    }
  ]);
  const [newRule, setNewRule] = useState({
    title: "",
    description: "",
    category: "",
    details: ""
  });
  const { toast } = useToast();



  const handleAddRule = () => {
    if (!newRule.title || !newRule.description || !newRule.category) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
        className: "bg-red-500 text-white border-red-600",
      });
      return;
    }

    // Add new rule to the rules array
    const newRuleWithId = {
      ...newRule,
      id: Math.max(...rules.map(r => r.id)) + 1
    };
    setRules([...rules, newRuleWithId]);
    
    toast({
      title: "Success",
      description: "New rule added successfully!",
      className: "bg-green-500 text-white border-green-600",
    });

    // Reset form
    setNewRule({
      title: "",
      description: "",
      category: "",
      details: ""
    });
    
    setIsAddRuleDialogOpen(false);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setIsEditRuleDialogOpen(true);
  };

  const handleUpdateRule = () => {
    if (!editingRule.title || !editingRule.description || !editingRule.category) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
        className: "bg-red-500 text-white border-red-600",
      });
      return;
    }

    // Update the rule in the rules array
    setRules(rules.map(rule => 
      rule.id === editingRule.id ? editingRule : rule
    ));
    
    toast({
      title: "Success",
      description: "Rule updated successfully!",
      className: "bg-green-500 text-white border-green-600",
    });

    setEditingRule(null);
    setIsEditRuleDialogOpen(false);
  };

  const handleDeleteRule = (rule) => {
    setDeletingRule(rule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRule = () => {
    // Remove the rule from the rules array
    setRules(rules.filter(rule => rule.id !== deletingRule.id));
    
    toast({
      title: "Success",
      description: "Rule deleted successfully!",
      className: "bg-green-500 text-white border-green-600",
    });

    setDeletingRule(null);
    setIsDeleteDialogOpen(false);
  };

  const handleCopyRule = (rule) => {
    // Copy only the details field
    const detailsText = rule.details;
    
    // Copy to clipboard
    navigator.clipboard.writeText(detailsText).then(() => {
      toast({
        title: "Success",
        description: "Rule details copied to clipboard!",
        className: "bg-green-500 text-white border-green-600",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        className: "bg-red-500 text-white border-red-600",
      });
    });
  };

  const handleCopyPromotion = (promotion) => {
    // Copy promotion details
    const promotionText = `Title: ${promotion.title}\nDescription: ${promotion.description}\nBonus Amount: ${promotion.bonusAmount}\nWagering: ${promotion.wagering}\nValid Until: ${promotion.validUntil}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(promotionText).then(() => {
      toast({
        title: "Success",
        description: "Promotion details copied to clipboard!",
        className: "bg-green-500 text-white border-green-600",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        className: "bg-red-500 text-white border-red-600",
      });
    });
  };

  const handleEditPromotion = (promotion) => {
    // For now, just show a toast
    toast({
      title: "Info",
      description: "Edit promotion functionality coming soon!",
      className: "bg-blue-500 text-white border-blue-600",
    });
  };

  const handleDeletePromotion = (promotion) => {
    // For now, just show a toast
    toast({
      title: "Info",
      description: "Delete promotion functionality coming soon!",
      className: "bg-blue-500 text-white border-blue-600",
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Rules & Promotion</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Rule</DialogTitle>
                <DialogDescription>
                  Create a new rule for the casino. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={newRule.title}
                    onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter rule title"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description *
                  </Label>
                  <Input
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    className="col-span-3"
                    placeholder="Brief description"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category *
                  </Label>
                                     <Select value={newRule.category} onValueChange={(value) => setNewRule({ ...newRule, category: value })}>
                     <SelectTrigger className="col-span-3">
                       <SelectValue placeholder="Select category" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="withdraw">Withdraw</SelectItem>
                       <SelectItem value="freeplay-withdraw">Freeplay Withdraw</SelectItem>
                       <SelectItem value="bonusplay-withdraw">Bonusplay Withdraw</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="details" className="text-right">
                    Details
                  </Label>
                  <Textarea
                    id="details"
                    value={newRule.details}
                    onChange={(e) => setNewRule({ ...newRule, details: e.target.value })}
                    className="col-span-3"
                    placeholder="Detailed rule information"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddRuleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRule}>
                  Add Rule
                </Button>
              </DialogFooter>
            </DialogContent>
                     </Dialog>
           <Button variant="outline">
             <Gift className="mr-2 h-4 w-4" />
             Create Promotion
           </Button>
         </div>
       </div>

       {/* Edit Rule Dialog */}
       <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Edit Rule</DialogTitle>
             <DialogDescription>
               Update the rule details below.
             </DialogDescription>
           </DialogHeader>
           {editingRule && (
             <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit-title" className="text-right">
                   Title *
                 </Label>
                 <Input
                   id="edit-title"
                   value={editingRule.title}
                   onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                   className="col-span-3"
                   placeholder="Enter rule title"
                 />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit-description" className="text-right">
                   Description *
                 </Label>
                 <Input
                   id="edit-description"
                   value={editingRule.description}
                   onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                   className="col-span-3"
                   placeholder="Brief description"
                 />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit-category" className="text-right">
                   Category *
                 </Label>
                 <Select value={editingRule.category} onValueChange={(value) => setEditingRule({ ...editingRule, category: value })}>
                   <SelectTrigger className="col-span-3">
                     <SelectValue placeholder="Select category" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="withdraw">Withdraw</SelectItem>
                     <SelectItem value="freeplay-withdraw">Freeplay Withdraw</SelectItem>
                     <SelectItem value="bonusplay-withdraw">Bonusplay Withdraw</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit-details" className="text-right">
                   Details
                 </Label>
                 <Textarea
                   id="edit-details"
                   value={editingRule.details}
                   onChange={(e) => setEditingRule({ ...editingRule, details: e.target.value })}
                   className="col-span-3"
                   placeholder="Detailed rule information"
                   rows={3}
                 />
               </div>
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditRuleDialogOpen(false)}>
               Cancel
             </Button>
             <Button onClick={handleUpdateRule}>
               Update Rule
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Delete Confirmation Dialog */}
       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Delete Rule</DialogTitle>
             <DialogDescription>
               Are you sure you want to delete "{deletingRule?.title}"? This action cannot be undone.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
               Cancel
             </Button>
             <Button variant="destructive" onClick={confirmDeleteRule}>
               Delete Rule
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="promotions">Active Promotions</TabsTrigger>
        </TabsList>

                          <TabsContent value="rules" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {rules.map((rule) => (
               <Card key={rule.id}>
                                   <CardHeader className="relative">
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                        onClick={() => handleCopyRule(rule)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteRule(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                   <CardTitle className="flex items-center gap-2">
                     <AlertTriangle className="h-5 w-5 text-orange-500" />
                     {rule.title}
                   </CardTitle>
                   <CardDescription>
                     {rule.description}
                   </CardDescription>
                 </CardHeader>
                                   <CardContent>
                    <div className="space-y-3">
                      {rule.details.split(', ').map((detail, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
               </Card>
                          ))}
           </div>
         </TabsContent>

                 <TabsContent value="promotions" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0"
                     onClick={() => handleEditPromotion({ title: "Welcome Bonus", description: "New player welcome package" })}
                   >
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                     onClick={() => handleCopyPromotion({ 
                       title: "Welcome Bonus", 
                       description: "New player welcome package",
                       bonusAmount: "₹1000",
                       wagering: "25x",
                       validUntil: "Dec 31, 2024"
                     })}
                   >
                     <Copy className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                     onClick={() => handleDeletePromotion({ title: "Welcome Bonus" })}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2">
                     <Gift className="h-5 w-5 text-purple-500" />
                     Welcome Bonus
                   </CardTitle>
                   <Badge variant="secondary" className="bg-green-100 text-green-800">
                     Active
                   </Badge>
                 </div>
                 <CardDescription>
                   New player welcome package
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Bonus Amount:</span>
                    <span className="text-sm">₹1000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Wagering:</span>
                    <span className="text-sm">25x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valid Until:</span>
                    <span className="text-sm">Dec 31, 2024</span>
                  </div>
                  <Separator />
                  <Button className="w-full" size="sm">
                    Claim Bonus
                  </Button>
                </div>
              </CardContent>
            </Card>

                         <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0"
                     onClick={() => handleEditPromotion({ title: "Referral Program", description: "Earn rewards for referring friends" })}
                   >
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                     onClick={() => handleCopyPromotion({ 
                       title: "Referral Program", 
                       description: "Earn rewards for referring friends",
                       bonusAmount: "₹500",
                       wagering: "10%",
                       validUntil: "Ongoing"
                     })}
                   >
                     <Copy className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                     onClick={() => handleDeletePromotion({ title: "Referral Program" })}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2">
                     <Users className="h-5 w-5 text-blue-500" />
                     Referral Program
                   </CardTitle>
                   <Badge variant="secondary" className="bg-green-100 text-green-800">
                     Active
                   </Badge>
                 </div>
                 <CardDescription>
                   Earn rewards for referring friends
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Referral Bonus:</span>
                    <span className="text-sm">₹500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Commission:</span>
                    <span className="text-sm">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Min Deposit:</span>
                    <span className="text-sm">₹1000</span>
                  </div>
                  <Separator />
                  <Button className="w-full" size="sm" variant="outline">
                    Get Referral Link
                  </Button>
                </div>
              </CardContent>
            </Card>

                         <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0"
                     onClick={() => handleEditPromotion({ title: "Weekly Cashback", description: "Get cashback on weekly losses" })}
                   >
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                     onClick={() => handleCopyPromotion({ 
                       title: "Weekly Cashback", 
                       description: "Get cashback on weekly losses",
                       bonusAmount: "15%",
                       wagering: "₹10,000",
                       validUntil: "Every Monday"
                     })}
                   >
                     <Copy className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                     onClick={() => handleDeletePromotion({ title: "Weekly Cashback" })}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2">
                     <Calendar className="h-5 w-5 text-red-500" />
                     Weekly Cashback
                   </CardTitle>
                   <Badge variant="secondary" className="bg-green-100 text-green-800">
                     Active
                   </Badge>
                 </div>
                 <CardDescription>
                   Get cashback on weekly losses
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Cashback Rate:</span>
                    <span className="text-sm">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Max Amount:</span>
                    <span className="text-sm">₹10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Processed:</span>
                    <span className="text-sm">Every Monday</span>
                  </div>
                  <Separator />
                  <Button className="w-full" size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
