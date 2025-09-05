import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Wallet, DollarSign } from "lucide-react";
import { useEffect } from "react";

export function AdminDashboard() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
      if (error) throw error;
      return data as {
        total_deposits: number;
        active_users: number;
        total_nft_locked: number;
        today_profit: number;
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      // Get recent deposits
      const { data: deposits, error: depositsError } = await supabase
        .from("deposits")
        .select(`
          amount,
          status,
          created_at,
          profiles (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (depositsError) throw depositsError;

      // Get recent user registrations
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (usersError) throw usersError;

      const activities = [
        ...deposits?.map(deposit => ({
          type: 'deposit' as const,
          message: `${deposit.profiles?.name || 'User'} made a deposit`,
          amount: deposit.amount,
          time: deposit.created_at,
          status: deposit.status
        })) || [],
        ...users?.map(user => ({
          type: 'registration' as const,
          message: `${user.name || 'New user'} registered`,
          time: user.created_at,
          amount: undefined,
          status: undefined
        })) || []
      ];

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits'
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
          table: 'profiles'
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Deposits",
      value: `$${stats?.total_deposits?.toLocaleString() || "0"}`,
      description: "Total USDT deposited",
      icon: DollarSign,
      trend: "+12.5%",
    },
    {
      title: "Active Users",
      value: stats?.active_users?.toLocaleString() || "0",
      description: "Users active in last 30 days",
      icon: Users,
      trend: "+8.2%",
    },
    {
      title: "Total NFT Locked",
      value: `$${stats?.total_nft_locked?.toLocaleString() || "0"}`,
      description: "USDT locked in staking",
      icon: Wallet,
      trend: "+15.3%",
    },
    {
      title: "Today's Profit",
      value: `$${stats?.today_profit?.toLocaleString() || "0"}`,
      description: "Profit distributed today",
      icon: TrendingUp,
      trend: "+5.7%",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your crypto staking platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-green-600">{stat.trend}</span>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity?.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{activity.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                    {activity.type === 'deposit' && (
                      <span className={`text-sm ${activity.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                        ${activity.amount}
                      </span>
                    )}
                    {activity.type === 'registration' && (
                      <span className="text-green-600 text-sm">+1 User</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Blockchain Networks</span>
                <span className="text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Database</span>
                <span className="text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>API Services</span>
                <span className="text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Running
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}