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

  // Countdown timer for NFT maturity
  useEffect(() => {
    if (walletData.nft_maturity_date) {
      const interval = setInterval(() => {
        const now = new Date();
        const maturityDate = new Date(walletData.nft_maturity_date!);
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

  const handlePresetAmount = (amount: number) => {
    setDepositAmount(amount.toString());
    setShowPaymentDetails(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
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

      // Insert deposit with screenshot filename
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
      {walletData.nft_maturity_date && (
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
      {(walletData.total_profit + realTimeEarnings) >= 5 && (
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
                  <label className="text-sm font-medium text-black">Upload Payment Screenshot</label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm text-black">{uploadedFile.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-gray-500" />
                        <p className="text-sm text-black">Click to upload screenshot</p>
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
                  className="w-full bg-[#006eff] text-white"
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
              <label className="text-sm font-medium text-black">Amount (5 - 5000 USDT)</label>
              <Input 
                type="number"
                min={5}
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

      {/* ---------- Withdrawals List (light card) ---------- */}
      <div className="w-full bg-gray-100 rounded-xl p-4">
        <h3 className="font-bold mb-2 text-gray-900">Your Withdrawals</h3>
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
                  <td className="py-1 text-gray-800">{w.status || 'Pending'}</td>
                  <td className="py-1 text-gray-700">{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
