import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, DollarSign, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminProfits() {
  const { toast } = useToast();
  const [isTransferring, setIsTransferring] = useState(false);

  const { data: profitData, isLoading } = useQuery({
    queryKey: ["admin-profits"],
    queryFn: async () => {
      console.log("Fetching profit data...");
      const { data, error } = await supabase
        .from("user_wallets")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .eq("is_active", true)
        .order("total_profit", { ascending: false });
      
      if (error) {
        console.error("Error fetching profit data:", error);
        throw error;
      }
      console.log("Profit data:", data);
      return data || [];
    },
  });

  const { data: summaryStats } = useQuery({
    queryKey: ["profit-summary"],
    queryFn: async () => {
      console.log("Fetching profit summary...");
      const { data, error } = await supabase
        .from("user_wallets")
        .select("total_deposit, daily_earnings, total_profit")
        .eq("is_active", true);
      
      if (error) {
        console.error("Error fetching summary:", error);
        throw error;
      }

      const totalDeposits = data?.reduce((sum, wallet) => sum + (wallet.total_deposit || 0), 0) || 0;
      const totalProfits = data?.reduce((sum, wallet) => sum + (wallet.total_profit || 0), 0) || 0;
      const totalDailyEarnings = data?.reduce((sum, wallet) => sum + (wallet.daily_earnings || 0), 0) || 0;
      const activeUsers = data?.length || 0;

      return {
        totalDeposits,
        totalProfits,
        totalDailyEarnings,
        activeUsers
      };
    },
  });

  const exportToCSV = () => {
    if (!profitData || profitData.length === 0) {
      toast({
        title: "No Data",
        description: "No profit data available to export.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["User Name", "Email", "Total Deposit (USDT)", "Daily Earnings (USDT)", "Total Profit (USDT)", "Maturity Date", "Days Active"],
      ...profitData.map(wallet => {
        const maturityDate = wallet.nft_maturity_date ? new Date(wallet.nft_maturity_date) : null;
        const daysActive = maturityDate ? Math.max(0, 45 - Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
        
        return [
          wallet.profiles?.name || "Unknown User",
          wallet.profiles?.email || "No email",
          wallet.total_deposit || 0,
          wallet.daily_earnings || 0,
          wallet.total_profit || 0,
          maturityDate ? maturityDate.toLocaleDateString() : "N/A",
          daysActive
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nft-profits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Profit data has been exported to CSV.",
    });
  };

  const transferDailyEarnings = async () => {
    setIsTransferring(true);
    try {
      const { error } = await supabase.rpc('transfer_daily_earnings');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Transfer Successful",
        description: "Daily earnings have been transferred to total profit for all users.",
      });
      
      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error transferring earnings:', error);
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer daily earnings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NFT Profit Tracking</h1>
        <p className="text-muted-foreground">
          Monitor user NFT investments and profit distributions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats?.totalDeposits?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Total USDT invested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats?.totalProfits?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Total profits distributed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats?.totalDailyEarnings?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Total active NFT holders</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Profit Details</CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={transferDailyEarnings} 
              variant="default"
              disabled={isTransferring}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isTransferring ? "Transferring..." : "Transfer Daily Earnings"}
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : profitData?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active NFT investments found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Details</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Daily Earnings</TableHead>
                  <TableHead>Total Profit</TableHead>
                  <TableHead>Maturity Info</TableHead>
                  <TableHead>ROI %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitData?.map((wallet) => {
                  const maturityDate = wallet.nft_maturity_date ? new Date(wallet.nft_maturity_date) : null;
                  const daysActive = maturityDate ? Math.max(0, 45 - Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
                  const roi = wallet.total_deposit ? ((wallet.total_profit || 0) / wallet.total_deposit * 100) : 0;
                  
                  return (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{wallet.profiles?.name || "Unknown User"}</p>
                          <p className="text-sm text-muted-foreground">{wallet.profiles?.email || "No email"}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {wallet.user_id?.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">${wallet.total_deposit?.toFixed(2) || "0.00"}</p>
                          <p className="text-sm text-muted-foreground">USDT Deposited</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-green-600">${wallet.daily_earnings?.toFixed(2) || "0.00"}</p>
                          <p className="text-sm text-muted-foreground">Per Day</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-green-600">${wallet.total_profit?.toFixed(2) || "0.00"}</p>
                          <p className="text-sm text-muted-foreground">Total Earned</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{maturityDate ? maturityDate.toLocaleDateString() : "N/A"}</p>
                          <Badge variant={daysActive >= 45 ? "default" : "secondary"}>
                            {daysActive >= 45 ? "Matured" : `${daysActive}/45 days`}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roi > 0 ? "default" : "secondary"}>
                          {roi.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}