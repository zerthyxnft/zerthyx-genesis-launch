import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowUp, 
  ArrowDown, 
  Wallet, 
  Clock,
  Upload,
  DollarSign,
  TrendingUp,
  Copy,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import zerthyxLogo from "/lovable-uploads/f217c0ea-c71e-41f0-8c43-5386375820b6.png";

interface WalletData {
  total_deposit: number;
  total_profit: number;
  daily_earnings: number;
  last_earnings_update: string;
  nft_maturity_date: string | null;
  is_active: boolean;
}

interface DepositAddresses {
  TRC20?: string;
  BEP20?: string;
}

interface WithdrawalData {
  id: string;
  user_id: string;
  amount: number;
  blockchain: string;
  wallet_address: string;
  status?: string;
  created_at?: string;
}

const DashboardHome = () => {
  const [walletData, setWalletData] = useState<WalletData>({
    total_deposit: 0,
    total_profit: 0,
    daily_earnings: 0,
    last_earnings_update: new Date().toISOString(),
    nft_maturity_date: null,
    is_active: false
  });
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [selectedBlockchain, setSelectedBlockchain] = useState('TRC20');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [depositAddresses, setDepositAddresses] = useState<DepositAddresses>({});
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [realTimeEarnings, setRealTimeEarnings] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const presetAmounts = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  // Load wallet data, admin settings, withdrawals
  useEffect(() => {
    loadWalletData();
    loadAdminSettings();
    loadUserWithdrawals();
  }, []);

  // Real-time earnings counter with database sync
  useEffect(() => {
    if (walletData.is_active && walletData.total_deposit > 0) {
      const interval = setInterval(async () => {
        const dailyRate = 2.2;
        const secondlyIncrement = (walletData.total_deposit * dailyRate / 100) / (24 * 60 * 60);
        
        setRealTimeEarnings(prev => {
          const newEarnings = prev + secondlyIncrement;
          
          // Update database every 10 seconds to avoid too many requests
          if (Math.floor(Date.now() / 1000) % 10 === 0) {
            updateEarningsInDatabase(newEarnings);
          }
          
          return newEarnings;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [walletData]);

  // Function to update earnings in database
  const updateEarningsInDatabase = async (currentEarnings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_wallets')
        .update({
          daily_earnings: currentEarnings,
          last_earnings_update: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating earnings:', error);
      }
    } catch (error) {
      console.error('Error in updateEarningsInDatabase:', error);
    }
  };

  // Countdown timer for NFT maturity
  useEffect(() => {
    if (walletData.nft_maturity_date) {
      const interval = setInterval(() => {
        const now = new Date();
        const maturityDate = new Date(walletData.nft_maturity_date);
        const diff = maturityDate.getTime() - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setCountdown({ days, hours, minutes, seconds });
        } else {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [walletData.nft_maturity_date]);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWalletData(data);
        
        // Calculate real-time earnings from last update
        if (data.is_active && data.total_deposit > 0 && data.last_earnings_update) {
          const now = new Date();
          const lastUpdate = new Date(data.last_earnings_update);
          const timeDiffInSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
          
          const dailyRate = 2.2;
          const secondlyIncrement = (data.total_deposit * dailyRate / 100) / (24 * 60 * 60);
          const earnedSinceLastUpdate = timeDiffInSeconds * secondlyIncrement;
          
          setRealTimeEarnings((data.daily_earnings || 0) + earnedSinceLastUpdate);
        } else {
          setRealTimeEarnings(data.daily_earnings || 0);
        }
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', ['deposit_address_trc20', 'deposit_address_bep20']);

      if (error) throw error;

      const addresses: DepositAddresses = {};
      data?.forEach(setting => {
        if (setting.setting_key === 'deposit_address_trc20') {
          addresses.TRC20 = setting.setting_value;
        } else if (setting.setting_key === 'deposit_address_bep20') {
          addresses.BEP20 = setting.setting_value;
        }
      });
      setDepositAddresses(addresses);
    } catch (error) {
      console.error('Error loading admin settings:', error);
    }
  };

  // User withdrawals load
  const loadUserWithdrawals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setWithdrawals(data);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    }
  };

  const handlePresetAmount = (amount) => {
    setDepositAmount(amount.toString());
    setShowPaymentDetails(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDepositSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!uploadedFile) {
        toast({
          title: "Error",
          description: "Please upload payment screenshot",
          variant: "destructive"
        });
        return;
      }

      // Upload screenshot to storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('transaction-screenshots')
        .upload(fileName, uploadedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Error",
          description: "Failed to upload screenshot. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Get screenshot URL
      const { data: { publicUrl } } = supabase.storage
        .from('transaction-screenshots')
        .getPublicUrl(fileName);

      // Insert deposit with screenshot URL
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(depositAmount),
          blockchain: selectedBlockchain,
          deposit_address: depositAddresses[selectedBlockchain],
          transaction_screenshot: fileName
        });

      if (error) throw error;

      toast({
        title: "Payment Sent please wait",
        description: "Your deposit has been submitted with screenshot"
      });

      setShowDepositModal(false);
      setShowPaymentDetails(false);
      setDepositAmount('');
      setUploadedFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // -------- Withdraw Logic with blockchain, address, amount --------
  const handleWithdrawSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amount = parseFloat(withdrawAmount);
      if (!withdrawAddress) {
        toast({
          title: "Error",
          description: "Please enter your wallet address",
          variant: "destructive"
        });
        return;
      }
      if (isNaN(amount) || amount < 5) {
        toast({
          title: "Minimum Withdraw",
          description: "Withdrawal amount must be at least 5 USDT.",
          variant: "destructive"
        });
        return;
      }
      if (amount > 5000) {
        toast({
          title: "Maximum Withdraw",
          description: "Withdrawal amount cannot exceed 5000 USDT.",
          variant: "destructive"
        });
        return;
      }
      if (amount > (walletData.total_profit + realTimeEarnings)) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough profit to withdraw.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amount,
          wallet_address: withdrawAddress,
          blockchain: selectedBlockchain
        });

      if (error) throw error;

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for processing"
      });

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      loadUserWithdrawals(); // refresh withdrawals list
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    });
  };

  const totalBalance = walletData.total_deposit + walletData.total_profit + realTimeEarnings;
  const progressPercentage = walletData.nft_maturity_date ? 
    Math.max(0, Math.min(100, ((45 - countdown.days) / 45) * 100)) : 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={zerthyxLogo} 
            alt="Zerthyx Logo" 
            className="w-10 h-10 rounded-full cyber-glow"
          />
          <div>
            <h1 className="text-xl font-bold text-highlight">Zerthyx</h1>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
        </div>
      </div>

      {/* Main Wallet Card */}
      <Card className="bg-gradient-to-br from-accent/20 to-accent/10 border-accent/30 p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 bg-green-500/20 hover:bg-green-500/30"
            onClick={() => setShowDepositModal(true)}
          >
            <ArrowDown className="w-4 h-4 text-green-400" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 bg-orange-500/20 hover:bg-orange-500/30"
            onClick={() => setShowWithdrawModal(true)}
          >
            <ArrowUp className="w-4 h-4 text-orange-400" />
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-accent/20 p-3 rounded-lg border border-accent/40 shadow-lg">
            <Wallet className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent">Main Wallet</p>
            <p className="text-xs text-muted-foreground">Total Deposit + Daily Profit</p>
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-highlight mb-1">
            ${totalBalance.toFixed(2)} USDT
          </h2>
          <div className="flex items-center justify-center text-green-400 text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            +2.2% Daily Growth
          </div>
        </div>

        {/* Real-time NFT Daily Earnings */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">NFT Daily Earnings</p>
              <p className="text-xs text-muted-foreground">2.2% Live Growth</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-400">
                +${realTimeEarnings.toFixed(6)} USDT
              </p>
              <p className="text-xs text-muted-foreground animate-pulse">
                Growing every second...
              </p>
            </div>
          </div>
        </div>

        {/* NFT Card Image Below Wallet */}
        <div className="flex justify-center mt-4 mb-1">
          <img 
            src="/lovable-uploads/nft-card.png"
            alt="NFT Card"
            className="w-48 h-auto rounded-xl border-4 border-primary/20 shadow-lg"
          />
        </div>

        {/* NFT Features Below Image */}
        <div className="bg-muted/20 rounded-lg mt-2 mb-2 p-4 text-xs">
          <div dangerouslySetInnerHTML={{
            __html: `
              <p><strong>🚀 Zerthyx Power NFT – Daily Rewards, Real Profits!</strong></p>
              <p>💸 <strong>2.2% Daily Return</strong> – Lock your USDT for 45 days & earn daily profits automatically.</p>
              <p>⏳ <strong>45-Day Cycle</strong> – Simple, secure, and predictable earning model.</p>
              <p>🌟 <strong>Top Performing NFT</strong> – Highest ROI compared to any staking NFT so far.</p>
              <p>🔒 <strong>Safe & Transparent</strong> – Fully blockchain-backed & smart contract powered.</p>
              <p>⚡ <strong>Auto Rewards</strong> – No clicks needed. Profits come to you every 24 hours.</p>
              <p>🔥 <strong>Limited Supply</strong> – Don’t miss your chance to hold this high-yield NFT.</p>
            `
          }}/>
        </div>
      </Card>

      {/* 45 Day Countdown Timer */}
      {walletData.nft_maturity_date && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="cyber-glow p-2 rounded-lg bg-orange-500/10">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold">NFT Maturity Countdown</h3>
              <p className="text-xs text-muted-foreground">45 Days Investment Period</p>
            </div>
          </div>

          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{countdown.days}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{countdown.hours}</p>
                <p className="text-xs text-muted-foreground">Hours</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{countdown.minutes}</p>
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{countdown.seconds}</p>
                <p className="text-xs text-muted-foreground">Sec</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Profit Withdrawal Button */}
      {(walletData.total_profit + realTimeEarnings) >= 5 && (
        <Card className="glass-card p-4">
          <Button 
            className="w-full btn-cyber cyber-glow animate-pulse"
            onClick={() => setShowWithdrawModal(true)}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Withdraw Profit (${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT)
          </Button>
        </Card>
      )}

      {/* Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Deposit USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (USDT)</label>
              <Input 
                type="number" 
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="glass-card"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Select</label>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetAmount(amount)}
                    className="glass-card"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
            {showPaymentDetails && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium">Blockchain</label>
                  <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                    <SelectTrigger className="glass-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                      <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Deposit Address:</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(depositAddresses[selectedBlockchain])}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs break-all font-mono bg-background/50 p-2 rounded">
                    {depositAddresses[selectedBlockchain]}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Upload Payment Screenshot</label>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span>{uploadedFile.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload screenshot
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <Button 
                  className="w-full btn-cyber"
                  onClick={handleDepositSubmit}
                  disabled={!depositAmount || !uploadedFile}
                >
                  Submit Deposit
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>WITHDRAW USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Blockchain Select */}
            <div>
              <label className="text-sm font-medium">Blockchain</label>
              <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                <SelectTrigger className="glass-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                  <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Withdraw Amount */}
            <div>
              <label className="text-sm font-medium">Amount (5 - 5000 USDT)</label>
              <Input 
                type="number"
                min={5}
                max={5000}
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="glass-card"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: ${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT
              </p>
            </div>
            {/* Withdraw Address */}
            <div>
              <label className="text-sm font-medium">Wallet Address</label>
              <Input 
                placeholder="Enter your wallet address"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="glass-card"
              />
            </div>
            <Button 
              className="w-full btn-cyber"
              onClick={handleWithdrawSubmit}
              disabled={!withdrawAddress || !withdrawAmount}
            >
              Submit Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawals List (Admin/User Panel) */}
      <Card className="glass-card p-4">
        <h3 className="font-bold mb-2">Your Withdrawals</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1">Amount</th>
                <th className="text-left py-1">Blockchain</th>
                <th className="text-left py-1">Address</th>
                <th className="text-left py-1">Status</th>
                <th className="text-left py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-muted-foreground">
                    No withdrawals found.
                  </td>
                </tr>
              )}
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="py-1 font-bold">${w.amount}</td>
                  <td className="py-1">{w.blockchain}</td>
                  <td className="py-1 break-all font-mono">{w.wallet_address}</td>
                  <td className="py-1">{w.status || 'Pending'}</td>
                  <td className="py-1">{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default DashboardHome;
