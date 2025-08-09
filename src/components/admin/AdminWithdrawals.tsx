import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Download } from "lucide-react";

export function AdminWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);

  const { data: pendingWithdrawals, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: withdrawalHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["withdrawal-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "approved" })
        .eq("id", withdrawalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-history"] });
      toast({
        title: "Withdrawal approved",
        description: "Withdrawal has been approved successfully.",
      });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "rejected" })
        .eq("id", withdrawalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-history"] });
      toast({
        title: "Withdrawal rejected",
        description: "Withdrawal has been rejected.",
        variant: "destructive",
      });
    },
  });

  const exportToCSV = () => {
    if (!withdrawalHistory) return;

    const csvContent = [
      ["Username", "Email", "Blockchain", "Wallet Address", "Amount", "Date", "Status"],
      ...withdrawalHistory.map(withdrawal => [
        withdrawal.profiles?.name || "N/A",
        withdrawal.profiles?.email || "N/A",
        withdrawal.blockchain,
        withdrawal.wallet_address,
        withdrawal.amount,
        new Date(withdrawal.created_at).toLocaleDateString(),
        withdrawal.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "withdrawal-history.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Withdrawal Management</h1>
        <p className="text-muted-foreground">
          Review and manage user withdrawal requests
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Withdrawals</TabsTrigger>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Details</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals?.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          <div>
                             <p className="font-medium">{withdrawal.profiles?.name || "N/A"}</p>
                            <p className="text-sm text-muted-foreground">{withdrawal.profiles?.email || "N/A"}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {withdrawal.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{withdrawal.blockchain}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {withdrawal.wallet_address.slice(0, 8)}...{withdrawal.wallet_address.slice(-8)}
                        </TableCell>
                        <TableCell>${withdrawal.amount}</TableCell>
                        <TableCell>
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedWithdrawal(withdrawal)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Withdrawal</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will approve the withdrawal request for ${withdrawal.amount} to {withdrawal.wallet_address}.
                                    Make sure you have processed the payment before approving.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      if (selectedWithdrawal) {
                                        approveWithdrawalMutation.mutate(selectedWithdrawal.id);
                                      }
                                    }}
                                  >
                                    Approve
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setSelectedWithdrawal(withdrawal)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Withdrawal</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reject the withdrawal request. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      if (selectedWithdrawal) {
                                        rejectWithdrawalMutation.mutate(selectedWithdrawal.id);
                                      }
                                    }}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Reject
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
              <CardTitle>Withdrawal History</CardTitle>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Details</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalHistory?.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{withdrawal.profiles?.name || "N/A"}</p>
                            <p className="text-sm text-muted-foreground">{withdrawal.profiles?.email || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{withdrawal.blockchain}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {withdrawal.wallet_address.slice(0, 8)}...{withdrawal.wallet_address.slice(-8)}
                        </TableCell>
                        <TableCell>${withdrawal.amount}</TableCell>
                        <TableCell>
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={withdrawal.status === "approved" ? "default" : "destructive"}
                          >
                            {withdrawal.status === "approved" ? "Approved" : "Rejected"}
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
