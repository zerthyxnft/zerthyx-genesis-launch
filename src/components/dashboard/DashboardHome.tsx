import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import zerthyxLogo from "/lovable-uploads/f217c0ea-c71e-41f0-8c43-5386375820b6.png";
import { ArrowUp, ArrowDown, Wallet, Clock, Upload, DollarSign, TrendingUp, Copy, CheckCircle } from 'lucide-react';

const DashboardHome = () => {
    const { toast } = useToast();
    const [userId, setUserId] = useState(null);
    const [walletData, setWalletData] = useState(null);
    const [nftData, setNftData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [selectedBlockchain, setSelectedBlockchain] = useState('TRC20');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [depositAddresses, setDepositAddresses] = useState({ TRC20: 'T9yB7gH3kPqR2jF1mN5wX6yZ8eC4V0s9', BEP20: '0x1A2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' });
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [realTimeEarnings, setRealTimeEarnings] = useState(0);
    const [withdrawals, setWithdrawals] = useState([]);
    const fileInputRef = useRef(null);

    const presetAmounts = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Fetch wallet data
                const { data: wallet, error: walletError } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (walletError) {
                    console.error('Error fetching wallet:', walletError);
                } else {
                    setWalletData(wallet);
                }

                // Fetch active NFT data
                const { data: nft, error: nftError } = await supabase
                    .from('nfts')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .single();
                if (nftError) {
                    console.error('Error fetching NFT:', nftError);
                } else {
                    setNftData(nft);
                }

                // Fetch recent withdrawals
                const { data: withdrawalData, error: withdrawalError } = await supabase
                    .from('withdrawals')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (withdrawalError) {
                    console.error('Error fetching withdrawals:', withdrawalError);
                } else {
                    setWithdrawals(withdrawalData);
                }
            }
            setLoading(false);
        };

        fetchData();
        const interval = setInterval(() => {
            if (nftData && nftData.end_date) {
                const now = new Date();
                const maturityDate = new Date(nftData.end_date);
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
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nftData]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (nftData && walletData) {
                const dailyRate = nftData.daily_profit_percentage / 100;
                const secondlyIncrement = (walletData.total_deposit * dailyRate) / (24 * 60 * 60);
                const now = new Date();
                const lastUpdate = new Date(walletData.last_earnings_update);
                const timeDiffInSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
                const earnedSinceLastUpdate = timeDiffInSeconds * secondlyIncrement;
                setRealTimeEarnings((walletData.daily_earnings || 0) + earnedSinceLastUpdate);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [nftData, walletData]);

    const handlePresetAmount = (amount) => {
        setDepositAmount(amount.toString());
        setShowPaymentDetails(true);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0] ?? null;
        setUploadedFile(file);
    };

    const handleDepositSubmit = async () => {
        if (!uploadedFile) {
            toast({
                title: "Error",
                description: "Please upload payment screenshot",
                variant: "destructive"
            });
            return;
        }

        const fileName = `${userId}/${Date.now()}_${uploadedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('deposit-proofs')
            .upload(fileName, uploadedFile);

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            toast({
                title: "Error",
                description: "Failed to upload screenshot.",
                variant: "destructive"
            });
            return;
        }

        const { data, error } = await supabase
            .from('deposits')
            .insert({
                user_id: userId,
                amount: parseFloat(depositAmount),
                blockchain: selectedBlockchain,
                proof_url: uploadData.path,
                status: 'pending'
            });

        if (error) {
            console.error('Deposit Error:', error);
            toast({
                title: "Error",
                description: "Failed to submit deposit. Please try again.",
                variant: "destructive"
            });
        } else {
            toast({
                title: "Deposit Submitted",
                description: "Your deposit has been submitted and is pending admin approval.",
                className: "bg-green-500 text-white"
            });
            setShowDepositModal(false);
            setShowPaymentDetails(false);
            setDepositAmount('');
            setUploadedFile(null);
        }
    };

    const handleWithdrawSubmit = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!withdrawAddress) {
            toast({
                title: "Error",
                description: "Please enter your wallet address",
                variant: "destructive"
            });
            return;
        }
        if (isNaN(amount) || amount < 5 || amount > 5000) {
            toast({
                title: "Error",
                description: "Withdrawal amount must be between 5 and 5000 USDT.",
                variant: "destructive"
            });
            return;
        }

        const availableBalance = (walletData?.total_profit || 0) + realTimeEarnings;
        if (amount > availableBalance) {
            toast({
                title: "Error",
                description: "Insufficient Balance. Please try a smaller amount.",
                variant: "destructive"
            });
            return;
        }

        const { data, error } = await supabase
            .from('withdrawals')
            .insert({
                user_id: userId,
                amount: amount,
                blockchain: selectedBlockchain,
                wallet_address: withdrawAddress,
                status: 'pending'
            });

        if (error) {
            console.error('Withdrawal Error:', error);
            toast({
                title: "Error",
                description: "Failed to submit withdrawal. Please try again.",
                variant: "destructive"
            });
        } else {
            toast({
                title: "Withdrawal Submitted",
                description: "Your withdrawal request is pending approval.",
                className: "bg-green-500 text-white"
            });
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setWithdrawAddress('');
        }
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "Address copied to clipboard.",
        });
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const totalBalance = (walletData?.total_deposit || 0) + (walletData?.total_profit || 0) + realTimeEarnings;
    const progressPercentage = nftData?.start_date && nftData?.end_date ? Math.max(0, Math.min(100, ((45 - countdown.days) / 45) * 100)) : 0;
    const availableProfit = (walletData?.total_profit || 0) + realTimeEarnings;

    return (
        <div className="w-full min-h-screen bg-white p-4 space-y-6 text-gray-900 font-sans">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={zerthyxLogo} alt="Zerthyx Logo" className="w-10 h-10 rounded-full" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Zerthyx</h1>
                        <p className="text-sm text-gray-600">Welcome back!</p>
                    </div>
                </div>
            </div>

            <Card className="w-full rounded-xl shadow-xl overflow-hidden p-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
                <CardContent className="p-0 space-y-4">
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
                            <Button className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full p-0" onClick={() => setShowDepositModal(true)}>
                                <ArrowDown className="w-4 h-4 text-white" />
                            </Button>
                            <Button className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full p-0" onClick={() => setShowWithdrawModal(true)}>
                                <ArrowUp className="w-4 h-4 text-white" />
                            </Button>
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-1">${totalBalance.toFixed(2)} USDT</h2>
                        <div className="flex items-center justify-center text-white/90 text-sm">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            +2.2% Daily Growth
                        </div>
                    </div>
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
                </CardContent>
            </Card>

            <div className="w-full bg-white flex flex-col items-center space-y-3">
                <img src="/lovable-uploads/nft-card.png" alt="NFT Card" className="w-48 h-auto object-contain" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">🚀 Zerthyx Power NFT</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        2.2% Daily Return — 45-Day Cycle. Auto rewards delivered every 24 hours.
                    </p>
                </div>
            </div>

            <Card className="w-full bg-blue-50 rounded-xl p-4 text-xs text-gray-900">
                <CardContent className="p-0 space-y-1">
                    <p><strong>🚀 Zerthyx Power NFT – Daily Rewards, Real Profits!</strong></p>
                    <p>💸 <strong>2.2% Daily Return</strong> – Lock your USDT for 45 days & earn daily profits automatically.</p>
                    <p>⏳ <strong>45-Day Cycle</strong> – Simple, secure, and predictable earning model.</p>
                    <p>🌟 <strong>Top Performing NFT</strong> – Highest ROI compared to any staking NFT so far.</p>
                    <p>🔒 <strong>Safe & Transparent</strong> – Fully blockchain-backed & smart contract powered.</p>
                    <p>⚡ <strong>Auto Rewards</strong> – No clicks needed. Profits come to you every 24 hours.</p>
                    <p>🔥 <strong>Limited Supply</strong> – Don’t miss your chance to hold this high-yield NFT.</p>
                </CardContent>
            </Card>

            {nftData && nftData.end_date && (
                <Card className="w-full bg-blue-50 rounded-xl p-4">
                    <CardContent className="p-0 space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-200">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">NFT Maturity Countdown</h3>
                                <p className="text-xs text-gray-600">45 Days Investment Period</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative w-full h-2 bg-blue-300 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-400" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <Card className="bg-white/60 rounded-lg p-3 shadow-none">
                                    <p className="text-2xl font-bold text-gray-900">{countdown.days}</p>
                                    <p className="text-xs text-gray-600">Days</p>
                                </Card>
                                <Card className="bg-white/60 rounded-lg p-3 shadow-none">
                                    <p className="text-2xl font-bold text-gray-900">{countdown.hours}</p>
                                    <p className="text-xs text-gray-600">Hours</p>
                                </Card>
                                <Card className="bg-white/60 rounded-lg p-3 shadow-none">
                                    <p className="text-2xl font-bold text-gray-900">{countdown.minutes}</p>
                                    <p className="text-xs text-gray-600">Min</p>
                                </Card>
                                <Card className="bg-white/60 rounded-lg p-3 shadow-none">
                                    <p className="text-2xl font-bold text-gray-900">{countdown.seconds}</p>
                                    <p className="text-xs text-gray-600">Sec</p>
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {availableProfit >= 5 && (
                <Card className="w-full bg-blue-50 rounded-xl p-4">
                    <CardContent className="p-0">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => setShowWithdrawModal(true)}>
                            <DollarSign className="w-5 h-5 mr-2" />
                            Withdraw Profit (${availableProfit.toFixed(2)} USDT)
                        </Button>
                    </CardContent>
                </Card>
            )}

            {showDepositModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                        <CardContent className="p-0 space-y-4">
                            <h2 className="text-xl font-bold text-gray-900">Deposit USDT</h2>
                            <div>
                                <label className="text-sm font-medium text-gray-900">Amount (USDT)</label>
                                <Input type="number" placeholder="Enter amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="mt-2" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block text-gray-900">Quick Select</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {presetAmounts.map(amount => (
                                        <Button key={amount} onClick={() => handlePresetAmount(amount)} variant="outline" className="bg-blue-100 text-gray-800 border-blue-200">${amount}</Button>
                                    ))}
                                </div>
                            </div>
                            {showPaymentDetails && (
                                <div className="space-y-4 border-t pt-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-900">Blockchain</label>
                                        <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="Select blockchain" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                                                <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="bg-blue-100 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-gray-900">Deposit Address:</p>
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(depositAddresses[selectedBlockchain])}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs break-all font-mono bg-blue-50 p-2 rounded text-gray-900">
                                            {depositAddresses[selectedBlockchain]}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-900">Upload Payment Screenshot</label>
                                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                            {uploadedFile ? (
                                                <div className="flex items-center justify-center gap-2 text-green-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm text-gray-900">{uploadedFile.name}</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Upload className="w-8 h-8 mx-auto text-gray-500" />
                                                    <p className="text-sm text-gray-900">Click to upload screenshot</p>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    </div>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDepositSubmit} disabled={!depositAmount || !uploadedFile}>
                                        Submit Deposit
                                    </Button>
                                </div>
                            )}
                            <Button variant="link" onClick={() => setShowDepositModal(false)} className="w-full text-center mt-2 text-sm text-gray-600 hover:text-gray-900">Close</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                        <CardContent className="p-0 space-y-4">
                            <h2 className="text-xl font-bold text-gray-900">WITHDRAW USDT</h2>
                            <div>
                                <label className="text-sm font-medium text-gray-900">Blockchain</label>
                                <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select blockchain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                                        <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-900">Amount (5 - 5000 USDT)</label>
                                <Input type="number" min={5} max={5000} placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-2" />
                                <p className="text-xs text-gray-600 mt-1">Available: ${availableProfit.toFixed(2)} USDT</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-900">Wallet Address</label>
                                <Input placeholder="Enter your wallet address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="mt-2" />
                            </div>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleWithdrawSubmit} disabled={!withdrawAddress || !withdrawAmount}>
                                Submit Withdrawal
                            </Button>
                            <Button variant="link" onClick={() => setShowWithdrawModal(false)} className="w-full text-center mt-2 text-sm text-gray-600 hover:text-gray-900">Close</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="w-full bg-blue-50 rounded-xl p-4">
                <CardContent className="p-0">
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
                                {withdrawals.length > 0 ? (
                                    withdrawals.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-2 text-gray-800">${item.amount.toFixed(2)}</td>
                                            <td className="py-2 text-gray-800">{item.blockchain}</td>
                                            <td className="py-2 text-gray-800">{item.wallet_address.substring(0, 8)}...{item.wallet_address.substring(item.wallet_address.length - 8)}</td>
                                            <td className="py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-2 text-center text-gray-600">No withdrawals found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardHome;
