import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pickaxe, Coins, Clock, TrendingUp } from "lucide-react";
import { useEffect } from "react";

export function AdminMining() {
  const { data: miningStats, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ["admin-mining-stats"],
    queryFn: async () => {
      const { data: wallets, error: walletsError } = await supabase
        .from("mining_wallets")
        .select("*")
        .order("total_points", { ascending: false });
      
      if (walletsError) throw walletsError;
      
      if (!wallets || wallets.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", wallets.map(w => w.user_id));
      
      if (profilesError) throw profilesError;
      
      const walletsWithProfiles = wallets.map(wallet => ({
        ...wallet,
        profiles: profiles?.find(p => p.user_id === wallet.user_id) || null
      }));
      
      return walletsWithProfiles;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('mining-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_wallets'
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_sessions'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (loadingStats) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalMiners = miningStats?.length || 0;
  const totalPoints = miningStats?.reduce((sum, wallet) => sum + (Number(wallet.total_points) || 0), 0) || 0;
  const activeTodayMiners = miningStats?.filter(wallet => wallet.today_claims > 0).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mining Activity</h1>
        <p className="text-muted-foreground">
          Monitor user mining activity and performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miners</CardTitle>
            <Pickaxe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMiners.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Users with mining wallets</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total points mined</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTodayMiners.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Users active today</p>
          </CardContent>
        </Card>
      </div>

      {/* Mining Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mining Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {miningStats?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No mining wallets found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Details</TableHead>
                  <TableHead>Total Points</TableHead>
                  <TableHead>Today's Points</TableHead>
                  <TableHead>Today's Claims</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miningStats?.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {wallet.profiles?.name || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.profiles?.email || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {wallet.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{Number(wallet.total_points).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{Number(wallet.today_points).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wallet.today_claims > 0 ? "default" : "secondary"}>
                        {wallet.today_claims} claims
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(wallet.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}