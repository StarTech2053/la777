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
  Trash2
} from "lucide-react";

export default function RulesPromotionPage() {
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
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
      });
      return;
    }

    // Here you would typically save to database
    console.log("Adding new rule:", newRule);
    
    toast({
      title: "Success",
      description: "New rule added successfully!",
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

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="promotions">Active Promotions</TabsTrigger>
        </TabsList>

                 <TabsContent value="rules" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <CardTitle className="flex items-center gap-2">
                   <AlertTriangle className="h-5 w-5 text-orange-500" />
                   General Rules
                 </CardTitle>
                 <CardDescription>
                   Basic casino rules and guidelines
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Minimum age: 18 years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Valid ID required for verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">One account per person</span>
                  </div>
                </div>
              </CardContent>
            </Card>

                         <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <CardTitle className="flex items-center gap-2">
                   <Star className="h-5 w-5 text-yellow-500" />
                   Game Rules
                 </CardTitle>
                 <CardDescription>
                   Specific rules for different games
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">No cheating or collusion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Fair play policy enforced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">House rules apply</span>
                  </div>
                </div>
              </CardContent>
            </Card>

                         <Card>
               <CardHeader className="relative">
                 <div className="absolute top-2 right-2 flex items-center gap-1">
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
                 <CardTitle className="flex items-center gap-2">
                   <Clock className="h-5 w-5 text-blue-500" />
                   Operating Hours
                 </CardTitle>
                 <CardDescription>
                   Casino operating schedule
                 </CardDescription>
               </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">24/7 online gaming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Live support available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Instant withdrawals</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
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
              <CardHeader>
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
              <CardHeader>
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
