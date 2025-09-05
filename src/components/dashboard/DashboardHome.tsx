import { useState, useEffect } from 'react';
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
  DollarSign,
  TrendingUp,
  Copy
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
  deposit_batch_count?: number;
  first_deposit_date?: string | null;
  latest_deposit_date?: string | null;
}

interface NFTDepositSummary {
  total_deposits: number;
  matured_amount: number;
  pending_amount: number;
  next_maturity_date: string | null;
  batches: NFTBatch[];
}

interface NFTBatch {
  batch_number: number;
  amount: number;
  deposit_date: string;
  maturity_date: string;
  is_matured: boolean;
  is_withdrawn: boolean;
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

interface DepositData {
  id: string;
  user_id: string;
  amount: number;
  blockchain: string;
  deposit_address: string;
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
  const [transactionHash, setTransactionHash] = useState('');
  const [depositAddresses, setDepositAddresses] = useState<DepositAddresses>({});
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [realTimeEarnings, setRealTimeEarnings] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [nftSummary, setNftSummary] = useState<NFTDepositSummary>({
    total_deposits: 0,
    matured_amount: 0,
    pending_amount: 0,
    next_maturity_date: null,
    batches: []
  });
  const { toast } = useToast();

  const presetAmounts = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  // Load wallet data, admin settings, withdrawals, deposits, and NFT summary
  useEffect(() => {
    loadWalletData();
    loadAdminSettings();
    loadUserWithdrawals();
    loadUserDeposits();
    loadNFTSummary();
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
  const updateEarningsInDatabase = async (currentEarnings: number) => {
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

  // Load NFT deposit summary
  const loadNFTSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_nft_deposit_summary', {
        user_id_param: user.id
      });

      if (!error && data) {
        setNftSummary(data as unknown as NFTDepositSummary);
      }
    } catch (error) {
      console.error('Error loading NFT summary:', error);
    }
  };

  // Countdown timer for NFT maturity
  useEffect(() => {
    if (nftSummary.next_maturity_date) {
      const interval = setInterval(() => {
        const now = new Date();
        const maturityDate = new Date(nftSummary.next_maturity_date!);
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
  }, [nftSummary.next_maturity_date]);

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
      data?.forEach((setting: any) => {
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

  // User deposits load
  const loadUserDeposits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setDeposits(data);
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };

  const handlePresetAmount = (amount: number) => {
    setDepositAmount(amount.toString());
    setShowPaymentDetails(true);
  };


  const handleDepositSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!transactionHash.trim()) {
        toast({
          title: "Error",
          description: "Please enter your transaction hash/txid",
          variant: "destructive"
        });
        return;
      }

      // Insert deposit with transaction hash
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(depositAmount),
          blockchain: selectedBlockchain,
          deposit_address: depositAddresses[selectedBlockchain],
          transaction_screenshot: transactionHash // Storing txid in this field
        });

      if (error) throw error;

      toast({
        title: "Payment Sent please wait",
        description: "Your deposit has been submitted with transaction hash"
      });

      setShowDepositModal(false);
      setShowPaymentDetails(false);
      setDepositAmount('');
      setTransactionHash('');
      loadUserDeposits(); // refresh deposits list
      loadNFTSummary(); // refresh NFT summary
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? 'Something went wrong',
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
      
      // Change minimum to 10 USDT as requested
      if (isNaN(amount) || amount < 10) {
        toast({
          title: "Minimum Withdraw",
          description: "Withdrawal amount must be at least 10 USDT.",
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

      // Check daily withdrawal limit
      const { data: walletInfo, error: walletError } = await supabase
        .from('user_wallets')
        .select('last_withdrawal_date')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      const today = new Date().toISOString().split('T')[0];
      if (walletInfo?.last_withdrawal_date === today) {
        toast({
          title: "Daily Limit Reached",
          description: "You can only withdraw once per day. Please try again tomorrow.",
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

      // Update last withdrawal date
      await supabase
        .from('user_wallets')
        .update({ last_withdrawal_date: today })
        .eq('user_id', user.id);

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for processing"
      });

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      loadUserWithdrawals(); // refresh withdrawals list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? 'Something went wrong',
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
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
    <div className="w-full min-h-screen bg-white p-4 space-y-6">
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

      {/* ---------- Wallet (ORANGE) ---------- */}
      <div className="w-full rounded-xl shadow-xl overflow-hidden p-6" style={{ backgroundColor: "#006eff" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-white/10">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Main Wallet</p>
              <p className="text-xs text-white/90">Total Deposit + Daily Profit</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-white/20 hover:bg-white/30"
              onClick={() => setShowDepositModal(true)}
            >
              <ArrowDown className="w-4 h-4 text-white" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-white/20 hover:bg-white/30"
              onClick={() => setShowWithdrawModal(true)}
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold text-white mb-1">${totalBalance.toFixed(2)} USDT</h2>
          <div className="flex items-center justify-center text-white/90 text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            +2.2% Daily Growth
          </div>
        </div>

        {/* Real-time NFT Daily Earnings (small pill inside wallet) */}
        <div className="mt-4 inline-block bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between min-w-[220px]">
            <div>
              <p className="text-sm font-medium text-white">NFT Daily Earnings</p>
              <p className="text-xs text-white/90">2.2% Live Growth</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">+${realTimeEarnings.toFixed(6)} USDT</p>
              <p className="text-xs text-white/90 animate-pulse">Growing every second...</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- NFT IMAGE & TEXT (NO BOX, WHITE BACKGROUND) ---------- */}
      <div className="w-full bg-white flex flex-col items-center space-y-3">
        <img 
          src="/lovable-uploads/nft-card.png"
          alt="NFT Card"
          className="w-48 h-auto object-contain"
        />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-black">🚀 Zerthyx Power NFT</h3>
          <p className="text-sm text-black mt-1">
            2.2% Daily Return — 45-Day Cycle. Auto rewards delivered every 24 hours.
          </p>
        </div>
      </div>

      {/* ---------- NFT FEATURES (light gray box) ---------- */}
      <div className="w-full bg-gray-100 rounded-xl p-4 text-xs">
        <div dangerouslySetInnerHTML={{
          __html: `
            <p style="color:#000"><strong>🚀 Zerthyx Power NFT – Daily Rewards, Real Profits!</strong></p>
            <p style="color:#000">💸 <strong>2.2% Daily Return</strong> – Lock your USDT for 45 days & earn daily profits automatically.</p>
            <p style="color:#000">⏳ <strong>45-Day Cycle</strong> – Simple, secure, and predictable earning model.</p>
            <p style="color:#000">🌟 <strong>Top Performing NFT</strong> – Highest ROI compared to any staking NFT so far.</p>
            <p style="color:#000">🔒 <strong>Safe & Transparent</strong> – Fully blockchain-backed & smart contract powered.</p>
            <p style="color:#000">⚡ <strong>Auto Rewards</strong> – No clicks needed. Profits come to you every 24 hours.</p>
            <p style="color:#000">🔥 <strong>Limited Supply</strong> – Don’t miss your chance to hold this high-yield NFT.</p>
          `
        }}/>
      </div>

      {/* ---------- 45 Day Countdown Timer (light) ---------- */}
      {nftSummary.next_maturity_date && (
        <div className="w-full bg-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-50">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">NFT Maturity Countdown</h3>
              <p className="text-xs text-gray-600">45 Days Investment Period</p>
            </div>
          </div>

          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{countdown.days}</p>
                <p className="text-xs text-gray-600">Days</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{countdown.hours}</p>
                <p className="text-xs text-gray-600">Hours</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{countdown.minutes}</p>
                <p className="text-xs text-gray-600">Min</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{countdown.seconds}</p>
                <p className="text-xs text-gray-600">Sec</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Profit Withdrawal Button (light) ---------- */}
      {(walletData.total_profit + realTimeEarnings) >= 10 && (
        <div className="w-full bg-gray-100 rounded-xl p-4">
          <Button 
            className="w-full bg-[#006eff] text-white font-semibold"
            onClick={() => setShowWithdrawModal(true)}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Withdraw Profit (${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT)
          </Button>
        </div>
      )}

      {/* ---------- Deposit Modal ---------- */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-white rounded-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-black">Deposit USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-black">Amount (USDT)</label>
              <Input 
                type="number" 
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Quick Select</label>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetAmount(amount)}
                    className="bg-white text-black"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
            {showPaymentDetails && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium text-black">Blockchain</label>
                  <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                      <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-black">Deposit Address:</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(depositAddresses[selectedBlockchain])}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs break-all font-mono bg-white p-2 rounded text-black">
                    {depositAddresses[selectedBlockchain]}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Transaction Hash/Txid</label>
                  <Input 
                    type="text"
                    placeholder="Submit Your Transaction TxHash/Txid"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Please enter the transaction hash from your payment
                  </p>
                </div>
                <Button 
                  className="w-full bg-[#006eff] text-white"
                  onClick={handleDepositSubmit}
                  disabled={!depositAmount || !transactionHash.trim()}
                >
                  Submit Deposit
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Withdraw Modal (light) ---------- */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-white rounded-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-black">WITHDRAW USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Blockchain Select */}
            <div>
              <label className="text-sm font-medium text-black">Blockchain</label>
              <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                <SelectTrigger className="mt-2">
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
              <label className="text-sm font-medium text-black">Amount (10 - 5000 USDT)</label>
              <Input 
                type="number"
                min={10}
                max={5000}
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-black mt-1">
                Available: ${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT
              </p>
            </div>

            {/* Withdraw Address */}
            <div>
              <label className="text-sm font-medium text-black">Wallet Address</label>
              <Input 
                placeholder="Enter your wallet address"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="mt-2"
              />
            </div>

            <Button 
              className="w-full bg-[#006eff] text-white"
              onClick={handleWithdrawSubmit}
              disabled={!withdrawAddress || !withdrawAmount}
            >
              Submit Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Transaction History - Deposits and Withdrawals ---------- */}
      <div className="w-full bg-gray-100 rounded-xl p-4">
        <h3 className="font-bold mb-4 text-gray-900">Transaction History</h3>
        
        {/* Deposits Table */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2 text-gray-800">NFT Deposits</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 text-gray-700">Amount</th>
                  <th className="text-left py-1 text-gray-700">Blockchain</th>
                  <th className="text-left py-1 text-gray-700">Status</th>
                  <th className="text-left py-1 text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-gray-600">
                      No deposits found.
                    </td>
                  </tr>
                )}
                {deposits.map(d => (
                  <tr key={d.id}>
                    <td className="py-1 font-bold text-gray-800">${d.amount}</td>
                    <td className="py-1 text-gray-800">{d.blockchain}</td>
                    <td className="py-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        d.status === 'approved' ? 'bg-green-100 text-green-800' :
                        d.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {d.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-1 text-gray-700">{d.created_at ? new Date(d.created_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div>
          <h4 className="font-semibold mb-2 text-gray-800">Profit Withdrawals</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 text-gray-700">Amount</th>
                  <th className="text-left py-1 text-gray-700">Blockchain</th>
                  <th className="text-left py-1 text-gray-700">Address</th>
                  <th className="text-left py-1 text-gray-700">Status</th>
                  <th className="text-left py-1 text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-2 text-center text-gray-600">
                      No withdrawals found.
                    </td>
                  </tr>
                )}
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td className="py-1 font-bold text-gray-800">${w.amount}</td>
                    <td className="py-1 text-gray-800">{w.blockchain}</td>
                    <td className="py-1 break-all font-mono text-gray-700">{w.wallet_address}</td>
                    <td className="py-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        w.status === 'approved' ? 'bg-green-100 text-green-800' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {w.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-1 text-gray-700">{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
