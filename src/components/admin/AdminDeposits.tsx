
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Download, Image } from "lucide-react";

export function AdminDeposits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [approvalAmount, setApprovalAmount] = useState("");
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  const { data: pendingDeposits, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-deposits"],
    queryFn: async () => {
      console.log("Fetching pending deposits...");
      const { data, error } = await supabase
        .from("deposits")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching pending deposits:", error);
        throw error;
      }
      console.log("Pending deposits:", data);
      return data || [];
    },
  });

  const { data: depositHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["deposit-history"],
    queryFn: async () => {
      console.log("Fetching deposit history...");
      const { data, error } = await supabase
        .from("deposits")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching deposit history:", error);
        throw error;
      }
      console.log("Deposit history:", data);
      return data || [];
    },
  });

  const approveDepositMutation = useMutation({
    mutationFn: async ({ depositId, amount }: { depositId: string; amount: number }) => {
      console.log("Approving deposit:", depositId, "Amount:", amount);
      
      // Get deposit info first
      const { data: deposit, error: depositFetchError } = await supabase
        .from("deposits")
        .select("user_id")
        .eq("id", depositId)
        .maybeSingle();

      if (depositFetchError) {
        console.error("Error fetching deposit:", depositFetchError);
        throw depositFetchError;
      }

      if (!deposit) {
        throw new Error("Deposit not found");
      }

      // Update deposit status
      const { error: depositError } = await supabase
        .from("deposits")
        .update({ 
          status: "approved"
        })
        .eq("id", depositId);

      if (depositError) {
        console.error("Error updating deposit:", depositError);
        throw depositError;
      }

      // Check if user wallet exists, if not create one
      const { data: existingWallet } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", deposit.user_id)
        .maybeSingle();

      const maturityDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

      if (existingWallet) {
        // Update existing wallet
        const newTotalDeposit = (existingWallet.total_deposit || 0) + amount;
        const { error: walletError } = await supabase
          .from("user_wallets")
          .update({
            total_deposit: newTotalDeposit,
            is_active: true,
            nft_maturity_date: maturityDate,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", deposit.user_id);

        if (walletError) {
          console.error("Error updating wallet:", walletError);
          throw walletError;
        }
      } else {
        // Create new wallet
        const { error: walletError } = await supabase
          .from("user_wallets")
          .insert({
            user_id: deposit.user_id,
            total_deposit: amount,
            daily_earnings: 0,
            total_profit: 0,
            is_active: true,
            nft_maturity_date: maturityDate
          });

        if (walletError) {
          console.error("Error creating wallet:", walletError);
          throw walletError;
        }
      }

      console.log("Deposit approved successfully");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-history"] });
      setSelectedDeposit(null);
      setApprovalAmount("");
      toast({
        title: "Deposit Approved",
        description: "Deposit has been approved and amount added to user wallet.",
      });
    },
    onError: (error) => {
      console.error("Error approving deposit:", error);
      toast({
        title: "Error",
        description: "Failed to approve deposit. Please try again.",
        variant: "destructive",
      });
    }
  });

  const rejectDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      console.log("Rejecting deposit:", depositId);
      const { error } = await supabase
        .from("deposits")
        .update({ 
          status: "rejected"
        })
        .eq("id", depositId);

      if (error) {
        console.error("Error rejecting deposit:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-history"] });
      toast({
        title: "Deposit Rejected",
        description: "Deposit has been rejected.",
        variant: "destructive",
      });
    },
    onError: (error) => {
      console.error("Error rejecting deposit:", error);
      toast({
        title: "Error",
        description: "Failed to reject deposit. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleApprove = () => {
    if (!selectedDeposit || !approvalAmount) {
      toast({
        title: "Error",
        description: "Please enter the USDT amount to approve.",
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(approvalAmount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    approveDepositMutation.mutate({
      depositId: selectedDeposit.id,
      amount: amount,
    });
  };

  const exportToCSV = () => {
    if (!depositHistory || depositHistory.length === 0) {
      toast({
        title: "No Data",
        description: "No deposit history available to export.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["User ID", "User Name", "Email", "Blockchain", "Amount", "Date", "Status"],
      ...depositHistory.map(deposit => [
        deposit.user_id.slice(0, 8) + "...",
        deposit.profiles?.name || "N/A",
        deposit.profiles?.email || "N/A",
        deposit.blockchain,
        deposit.amount,
        new Date(deposit.created_at).toLocaleDateString(),
        deposit.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deposit-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Deposit history has been exported to CSV.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deposit Management</h1>
        <p className="text-muted-foreground">
          Review and manage user deposits
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Deposits ({pendingDeposits?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">
            Deposit History ({depositHistory?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : pendingDeposits?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pending deposits found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Screenshot</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDeposits?.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          <div>
                             <p className="font-medium">{deposit.profiles?.name || "Unknown User"}</p>
                             <p className="text-sm text-muted-foreground">{deposit.profiles?.email || "No email"}</p>
                             <p className="text-xs text-muted-foreground font-mono">
                               ID: {deposit.user_id.slice(0, 8)}...
                             </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deposit.blockchain}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${deposit.amount}</span>
                        </TableCell>
                        <TableCell>
                          {deposit.transaction_screenshot ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                const { data } = supabase.storage
                                  .from('transaction-screenshots')
                                  .getPublicUrl(deposit.transaction_screenshot);
                                setViewingScreenshot(data.publicUrl);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <div className="flex items-center text-muted-foreground">
                              <Image className="h-4 w-4 mr-1" />
                              No screenshot
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(deposit.created_at).toLocaleDateString()}
                            <br />
                            <span className="text-muted-foreground">
                              {new Date(deposit.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDeposit(deposit);
                                    setApprovalAmount(deposit.amount.toString());
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Deposit</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <p><strong>User:</strong> {selectedDeposit?.profiles?.name || "Unknown"}</p>
                                    <p><strong>Email:</strong> {selectedDeposit?.profiles?.email || "N/A"}</p>
                                    <p><strong>Blockchain:</strong> {selectedDeposit?.blockchain}</p>
                                    <p><strong>Requested Amount:</strong> ${selectedDeposit?.amount}</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="amount">Approve USDT Amount</Label>
                                    <Input
                                      id="amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={approvalAmount}
                                      onChange={(e) => setApprovalAmount(e.target.value)}
                                      placeholder="Enter USDT amount to approve"
                                    />
                                  </div>
                                  <Button 
                                    onClick={handleApprove} 
                                    className="w-full"
                                    disabled={approveDepositMutation.isPending}
                                  >
                                    {approveDepositMutation.isPending ? "Approving..." : "Approve Deposit"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to reject this deposit from ${deposit.profiles?.name || 'Unknown User'}?`)) {
                                  rejectDepositMutation.mutate(deposit.id);
                                }
                              }}
                              disabled={rejectDepositMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {rejectDepositMutation.isPending ? "Rejecting..." : "Reject"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deposit History</CardTitle>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : depositHistory?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No deposit history found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {depositHistory?.map((deposit) => (
                         <TableRow key={deposit.id}>
                           <TableCell>
                             <div>
                               <p className="font-medium">{deposit.profiles?.name || "Unknown User"}</p>
                               <p className="text-sm text-muted-foreground">{deposit.profiles?.email || "No email"}</p>
                               <p className="text-xs text-muted-foreground font-mono">
                                 ID: {deposit.user_id.slice(0, 8)}...
                               </p>
                             </div>
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline">{deposit.blockchain}</Badge>
                           </TableCell>
                           <TableCell>
                             <span className="font-medium">${deposit.amount}</span>
                           </TableCell>
                           <TableCell>
                             <div className="text-sm">
                               {new Date(deposit.created_at).toLocaleDateString()}
                               <br />
                               <span className="text-muted-foreground">
                                 {new Date(deposit.created_at).toLocaleTimeString()}
                               </span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <Badge
                               variant={deposit.status === "approved" ? "default" : "destructive"}
                             >
                               {deposit.status === "approved" ? "Approved" : "Rejected"}
                             </Badge>
                           </TableCell>
                         </TableRow>
                     ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Screenshot Viewer Dialog */}
      <Dialog open={!!viewingScreenshot} onOpenChange={() => setViewingScreenshot(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction Screenshot</DialogTitle>
          </DialogHeader>
          {viewingScreenshot && (
            <div className="flex justify-center">
              <img 
                src={viewingScreenshot} 
                alt="Transaction Screenshot" 
                className="max-w-full max-h-96 object-contain rounded-lg"
                onError={() => {
                  toast({
                    title: "Error",
                    description: "Failed to load screenshot image.",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
