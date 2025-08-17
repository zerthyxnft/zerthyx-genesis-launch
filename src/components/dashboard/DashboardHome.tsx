import React, { useState, useEffect, useRef } from 'react';
import zerthyxLogo from "/lovable-uploads/f217c0ea-c71e-41f0-8c43-5386375820b6.png";
import { ArrowUp, ArrowDown, Wallet, Clock, Upload, DollarSign, TrendingUp, Copy, CheckCircle } from 'lucide-react';

const DashboardHome = () => {
    const [walletData, setWalletData] = useState({
        total_deposit: 1000,
        total_profit: 50,
        daily_earnings: 22,
        last_earnings_update: new Date().toISOString(),
        nft_maturity_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
    });
    
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
        // Mock data loading
        const mockData = {
            total_deposit: 1000,
            total_profit: 50,
            daily_earnings: 22,
            last_earnings_update: new Date(Date.now() - 50000).toISOString(),
            nft_maturity_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        };
        setWalletData(mockData);

        const dailyRate = 2.2;
        const secondlyIncrement = (mockData.total_deposit * dailyRate / 100) / (24 * 60 * 60);
        const now = new Date();
        const lastUpdate = new Date(mockData.last_earnings_update);
        const timeDiffInSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
        const earnedSinceLastUpdate = timeDiffInSeconds * secondlyIncrement;
        setRealTimeEarnings((mockData.daily_earnings || 0) + earnedSinceLastUpdate);
        
        // Countdown timer for NFT maturity
        const interval = setInterval(() => {
            const now = new Date();
            const maturityDate = new Date(mockData.nft_maturity_date);
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
    }, []);

    const handlePresetAmount = (amount) => {
        setDepositAmount(amount.toString());
        setShowPaymentDetails(true);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0] ?? null;
        setUploadedFile(file);
    };

    const handleDepositSubmit = () => {
        if (!uploadedFile) {
            alert("Please upload payment screenshot");
            return;
        }
        alert("Payment Submitted! Waiting for admin approval.");
        setShowDepositModal(false);
        setShowPaymentDetails(false);
        setDepositAmount('');
        setUploadedFile(null);
    };

    const handleWithdrawSubmit = () => {
        const amount = parseFloat(withdrawAmount);
        if (!withdrawAddress) {
            alert("Please enter your wallet address");
            return;
        }
        if (isNaN(amount) || amount < 5 || amount > 5000) {
            alert("Withdrawal amount must be between 5 and 5000 USDT.");
            return;
        }
        if (amount > (walletData.total_profit + realTimeEarnings)) {
            alert("Insufficient Balance");
            return;
        }
        alert("Withdrawal request submitted for processing.");
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawAddress('');
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert("Address copied to clipboard");
    };

    const totalBalance = walletData.total_deposit + walletData.total_profit + realTimeEarnings;
    const progressPercentage = walletData.nft_maturity_date ? Math.max(0, Math.min(100, ((45 - countdown.days) / 45) * 100)) : 0;

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

            <div className="w-full rounded-xl shadow-xl overflow-hidden p-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
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
                        <button className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center" onClick={() => setShowDepositModal(true)}>
                            <ArrowDown className="w-4 h-4 text-white" />
                        </button>
                        <button className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center" onClick={() => setShowWithdrawModal(true)}>
                            <ArrowUp className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
                <div className="text-center mt-4">
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
            </div>
            
            <div className="w-full bg-white flex flex-col items-center space-y-3">
                <img src="/lovable-uploads/nft-card.png" alt="NFT Card" className="w-48 h-auto object-contain" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">🚀 Zerthyx Power NFT</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        2.2% Daily Return — 45-Day Cycle. Auto rewards delivered every 24 hours.
                    </p>
                </div>
            </div>

            <div className="w-full bg-blue-50 rounded-xl p-4 text-xs text-gray-900">
                <p><strong>🚀 Zerthyx Power NFT – Daily Rewards, Real Profits!</strong></p>
                <p>💸 <strong>2.2% Daily Return</strong> – Lock your USDT for 45 days & earn daily profits automatically.</p>
                <p>⏳ <strong>45-Day Cycle</strong> – Simple, secure, and predictable earning model.</p>
                <p>🌟 <strong>Top Performing NFT</strong> – Highest ROI compared to any staking NFT so far.</p>
                <p>🔒 <strong>Safe & Transparent</strong> – Fully blockchain-backed & smart contract powered.</p>
                <p>⚡ <strong>Auto Rewards</strong> – No clicks needed. Profits come to you every 24 hours.</p>
                <p>🔥 <strong>Limited Supply</strong> – Don’t miss your chance to hold this high-yield NFT.</p>
            </div>

            {walletData.nft_maturity_date && (
                <div className="w-full bg-blue-50 rounded-xl p-4">
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

            {(walletData.total_profit + realTimeEarnings) >= 5 && (
                <div className="w-full bg-blue-50 rounded-xl p-4">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center" onClick={() => setShowWithdrawModal(true)}>
                        <DollarSign className="w-5 h-5 mr-2" />
                        Withdraw Profit (${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT)
                    </button>
                </div>
            )}
            
            {showDepositModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Deposit USDT</h2>
                        <div>
                            <label className="text-sm font-medium text-gray-900">Amount (USDT)</label>
                            <input type="number" placeholder="Enter amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="mt-2 w-full p-2 border rounded-lg bg-blue-50 border-blue-200" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-900">Quick Select</label>
                            <div className="grid grid-cols-4 gap-2">
                                {presetAmounts.map(amount => (
                                    <button key={amount} onClick={() => handlePresetAmount(amount)} className="bg-blue-100 text-gray-800 border border-blue-200 py-2 rounded-lg text-sm hover:bg-blue-200">${amount}</button>
                                ))}
                            </div>
                        </div>
                        {showPaymentDetails && (
                            <div className="space-y-4 border-t pt-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-900">Blockchain</label>
                                    <select value={selectedBlockchain} onChange={(e) => setSelectedBlockchain(e.target.value)} className="mt-2 w-full p-2 border rounded-lg bg-blue-50 border-blue-200">
                                        <option value="TRC20">TRC20 (Tron)</option>
                                        <option value="BEP20">BEP20 (BSC)</option>
                                    </select>
                                </div>
                                <div className="bg-blue-100 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-gray-900">Deposit Address:</p>
                                        <button onClick={() => copyToClipboard(depositAddresses[selectedBlockchain])} className="text-gray-800 hover:text-gray-900 p-1 rounded-full">
                                            <Copy className="w-4 h-4" />
                                        </button>
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
                                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg" onClick={handleDepositSubmit} disabled={!depositAmount || !uploadedFile}>
                                    Submit Deposit
                                </button>
                            </div>
                        )}
                        <button onClick={() => setShowDepositModal(false)} className="w-full text-center mt-2 text-sm text-gray-600 hover:text-gray-900">Close</button>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">WITHDRAW USDT</h2>
                        <div>
                            <label className="text-sm font-medium text-gray-900">Blockchain</label>
                            <select value={selectedBlockchain} onChange={(e) => setSelectedBlockchain(e.target.value)} className="mt-2 w-full p-2 border rounded-lg bg-blue-50 border-blue-200">
                                <option value="TRC20">TRC20 (Tron)</option>
                                <option value="BEP20">BEP20 (BSC)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-900">Amount (5 - 5000 USDT)</label>
                            <input type="number" min={5} max={5000} placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-2 w-full p-2 border rounded-lg bg-blue-50 border-blue-200" />
                            <p className="text-xs text-gray-600 mt-1">Available: ${(walletData.total_profit + realTimeEarnings).toFixed(2)} USDT</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-900">Wallet Address</label>
                            <input placeholder="Enter your wallet address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="mt-2 w-full p-2 border rounded-lg bg-blue-50 border-blue-200" />
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg" onClick={handleWithdrawSubmit} disabled={!withdrawAddress || !withdrawAmount}>
                            Submit Withdrawal
                        </button>
                        <button onClick={() => setShowWithdrawModal(false)} className="w-full text-center mt-2 text-sm text-gray-600 hover:text-gray-900">Close</button>
                    </div>
                </div>
            )}

            <div className="w-full bg-blue-50 rounded-xl p-4">
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
                            <tr>
                                <td colSpan={5} className="py-2 text-center text-gray-600">No withdrawals found.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
