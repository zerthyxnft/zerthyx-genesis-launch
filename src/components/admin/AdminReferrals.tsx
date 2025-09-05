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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Gift, UserPlus, Download } from "lucide-react";

export function AdminReferrals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rewardAmount, setRewardAmount] = useState("1");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);

  // Fetch all users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      console.log("Fetching users data...");
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_wallets (
            total_deposit,
            total_profit
          ),
          deposits (
            amount,
            status,
            created_at
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching users data:", error);
        throw error;
      }
      console.log("Users data:", data);
      return data || [];
    },
  });

  // Fetch pending referral rewards (referred users who deposited but reward not paid)
  const { data: pendingReferrals, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-referrals"],
    queryFn: async () => {
      console.log("Fetching pending referrals...");
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("reward_paid", false)
        .not("referred_id", "is", null)
        .order("signup_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching pending referrals:", error);
        throw error;
      }
      console.log("Pending referrals:", data);
      return data || [];
    },
  });

  // Fetch all referrals for stats
  const { data: allReferrals } = useQuery({
    queryKey: ["all-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*");
      
      if (error) {
        console.error("Error fetching all referrals:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["pending-referrals"] });
          queryClient.invalidateQueries({ queryKey: ["all-referrals"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const addReferralRewardMutation = useMutation({
    mutationFn: async ({ referrerId, referredId, amount }: { referrerId: string, referredId: string, amount: number }) => {
      console.log("Adding referral reward:", { referrerId, referredId, amount });
      
      const { data, error } = await supabase.rpc('add_referral_reward', {
        referrer_user_id: referrerId,
        referred_user_id: referredId,
        reward_amount: amount
      });

      if (error) {
        console.error("Error adding referral reward:", error);
        throw error;
      }

      if (!data || (typeof data === 'object' && data !== null && 'success' in data && !data.success)) {
        const message = (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') ? data.message : "Failed to add referral reward";
        throw new Error(message);
      }

      console.log("Referral reward added successfully");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-referrals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-referrals"] });
      setSelectedReferral(null);
      setRewardAmount("1");
      toast({
        title: "Reward Added",
        description: "Referral reward has been added to user's wallet.",
      });
    },
    onError: (error) => {
      console.error("Error adding referral reward:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add referral reward. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddReward = () => {
    if (!selectedReferral) {
      toast({
        title: "Error",
        description: "No referral selected.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid reward amount.",
        variant: "destructive",
      });
      return;
    }

    addReferralRewardMutation.mutate({
      referrerId: selectedReferral.referrer_id,
      referredId: selectedReferral.referred_id,
      amount: amount
    });
  };

  // Helper function to get user name by ID
  const getUserName = (userId: string) => {
    return usersData?.find(user => user.user_id === userId)?.name || "Unknown User";
  };

  // Helper function to get user email by ID
  const getUserEmail = (userId: string) => {
    return usersData?.find(user => user.user_id === userId)?.email || "No email";
  };

  // Check if referred user has made deposits
  const hasReferredUserDeposited = (referral: any) => {
    return usersData?.find(user => user.user_id === referral.referred_id)?.deposits?.some((d: any) => d.status === 'approved') || false;
  };

  const exportToCSV = () => {
    if (!usersData || usersData.length === 0) {
      toast({
        title: "No Data",
        description: "No user data available to export.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["User ID", "Name", "Email", "Join Type", "Referrer", "Total Deposits", "Referred Count", "Rewards Earned"],
      ...usersData.map(user => {
        const isReferred = allReferrals?.find(r => r.referred_id === user.user_id);
        const referrerName = isReferred ? getUserName(isReferred.referrer_id) : "N/A";
        const totalDeposits = user.deposits?.filter((d: any) => d.status === 'approved')?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0;
        const referredCount = allReferrals?.filter(r => r.referrer_id === user.user_id && r.referred_id)?.length || 0;
        const rewardsEarned = allReferrals?.filter(r => r.referrer_id === user.user_id && r.reward_paid)?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;
        
        return [
          user.user_id.slice(0, 8) + "...",
          user.name || "N/A",
          user.email || "N/A",
          isReferred ? "Via Referral" : "Direct",
          referrerName,
          totalDeposits,
          referredCount,
          rewardsEarned
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Referral data has been exported to CSV.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referral Management</h1>
        <p className="text-muted-foreground">
          Manage user referrals and rewards manually
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Via Referral</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allReferrals?.filter(r => r.referred_id)?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReferrals?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Rewards ({pendingReferrals?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="users">
            All Users ({usersData?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Referral Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : pendingReferrals?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pending referral rewards found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred User</TableHead>
                      <TableHead>Signup Date</TableHead>
                      <TableHead>Deposit Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReferrals?.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getUserName(referral.referrer_id)}</p>
                            <p className="text-sm text-muted-foreground">{getUserEmail(referral.referrer_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getUserName(referral.referred_id)}</p>
                            <p className="text-sm text-muted-foreground">{getUserEmail(referral.referred_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {referral.signup_date ? new Date(referral.signup_date).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={hasReferredUserDeposited(referral) ? "default" : "secondary"}>
                            {hasReferredUserDeposited(referral) ? "Has Deposited" : "No Deposits"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasReferredUserDeposited(referral) ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedReferral(referral)}
                                >
                                  <Gift className="h-4 w-4 mr-1" />
                                  Add Reward
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Referral Reward</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <p><strong>Referrer:</strong> {getUserName(selectedReferral?.referrer_id || "")}</p>
                                    <p><strong>Referred User:</strong> {getUserName(selectedReferral?.referred_id || "")}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="reward-amount">Reward Amount (USDT)</Label>
                                    <Input
                                      id="reward-amount"
                                      type="number"
                                      value={rewardAmount}
                                      onChange={(e) => setRewardAmount(e.target.value)}
                                      placeholder="1.0"
                                      min="0"
                                      step="0.01"
                                    />
                                  </div>
                                  <Button 
                                    onClick={handleAddReward} 
                                    className="w-full"
                                    disabled={addReferralRewardMutation.isPending}
                                  >
                                    {addReferralRewardMutation.isPending ? "Adding Reward..." : "Add Reward"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Button size="sm" disabled variant="outline">
                              Waiting for Deposit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : usersData?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Join Type</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Total Deposits</TableHead>
                      <TableHead>Referred Users</TableHead>
                      <TableHead>Rewards Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.map((user) => {
                      const isReferred = allReferrals?.find(r => r.referred_id === user.user_id);
                      const totalDeposits = user.deposits?.filter((d: any) => d.status === 'approved')?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0;
                      const referredCount = allReferrals?.filter(r => r.referrer_id === user.user_id && r.referred_id)?.length || 0;
                      const rewardsEarned = allReferrals?.filter(r => r.referrer_id === user.user_id && r.reward_paid)?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;
                      
                      return (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name || "Unknown User"}</p>
                              <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                ID: {user.user_id.slice(0, 8)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isReferred ? "default" : "secondary"}>
                              {isReferred ? "Via Referral" : "Direct"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isReferred ? (
                              <div>
                                <p className="text-sm">{getUserName(isReferred.referrer_id)}</p>
                                <p className="text-xs text-muted-foreground">{getUserEmail(isReferred.referrer_id)}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${totalDeposits}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{referredCount}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${rewardsEarned}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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