import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, XCircle, Download } from "lucide-react";

export function AdminDeposits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);

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

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('deposits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending-deposits"] });
          queryClient.invalidateQueries({ queryKey: ["deposit-history"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const approveDepositMutation = useMutation({
    mutationFn: async ({ depositId }: { depositId: string }) => {
      console.log("Approving deposit:", depositId);
      
      // Use the new approve_deposit_with_amount function which triggers all the necessary updates
      const { data, error } = await supabase.rpc('approve_deposit_with_amount', {
        deposit_id_param: depositId
      });

      if (error) {
        console.error("Error approving deposit:", error);
        throw error;
      }

      if (!data || (typeof data === 'object' && data !== null && 'success' in data && !data.success)) {
        const message = (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') ? data.message : "Failed to approve deposit";
        throw new Error(message);
      }

      console.log("Deposit approved successfully");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-history"] });
      setSelectedDeposit(null);
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
    if (!selectedDeposit) {
      toast({
        title: "Error",
        description: "No deposit selected.",
        variant: "destructive",
      });
      return;
    }

    approveDepositMutation.mutate({
      depositId: selectedDeposit.id,
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
                      <TableHead>Transaction Hash</TableHead>
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
                            <div className="font-mono text-xs bg-muted p-2 rounded max-w-xs">
                              <p className="break-all text-foreground">{deposit.transaction_screenshot}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No hash provided</span>
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
                                    <p><strong>Amount to Approve:</strong> ${selectedDeposit?.amount}</p>
                                    <p className="text-sm text-muted-foreground">
                                      The full deposit amount will be automatically added to the user's wallet.
                                    </p>
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
                               {deposit.status}
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
    </div>
  );
}