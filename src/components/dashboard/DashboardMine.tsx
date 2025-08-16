import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Pickaxe,
  Gem,
  Zap,
  Clock,
  Coins,
  Timer,
  Trophy,
  Sparkles,
  Wallet,
  Fuel,
  Rocket,
  Users,
  LayoutGrid,
  Home,
  CheckSquare,
  User,
  Power
} from 'lucide-react';

interface MiningWallet {
  total_points: number;
  today_points: number;
  today_claims: number;
  last_reset_date: string;
}

interface MiningSession {
  next_available_time: string;
  points_earned: number;
}

interface MiningClaimResult {
  success: boolean;
  points_earned?: number;
  total_points?: number;
  today_points?: number;
  today_claims?: number;
  next_available?: string;
  error?: string;
  message?: string;
}

const DashboardMine = () => {
  const [miningWallet, setMiningWallet] = useState<MiningWallet | null>(null);
  const [lastSession, setLastSession] = useState<MiningSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [currentMiningPoints, setCurrentMiningPoints] = useState(0);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const oneHourInSeconds = 3600;
  const pointsPerHour = 1000;

  useEffect(() => {
    fetchMiningData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSession?.next_available_time) {
        const nextTime = new Date(lastSession.next_available_time).getTime();
        const now = new Date().getTime();
        const difference = nextTime - now;
        
        if (difference > 0) {
          const secondsRemaining = Math.floor(difference / 1000);
          setTimeLeft(secondsRemaining);
          setCanClaim(false);
          setProgress(100 - (secondsRemaining / oneHourInSeconds) * 100);
          const pointsEarned = Math.round((oneHourInSeconds - secondsRemaining) * (pointsPerHour / oneHourInSeconds));
          setCurrentMiningPoints(pointsEarned);
        } else {
          setTimeLeft(0);
          setCanClaim(true);
          setProgress(100);
          setCurrentMiningPoints(pointsPerHour);
        }
      } else {
        setTimeLeft(0);
        setCanClaim(true);
        setProgress(100);
        setCurrentMiningPoints(pointsPerHour);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSession]);

  const fetchMiningData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet } = await supabase
        .from('mining_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMiningWallet(wallet);

      const { data: session } = await supabase
        .from('mining_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setLastSession(session);
    } catch (error) {
      console.error('Error fetching mining data:', error);
    }
  };

  const handleClaim = async () => {
    if (!canClaim || isClaiming) {
        toast({
            title: "Not Available",
            description: "Mining is not yet available. Please wait.",
            variant: "destructive"
        });
        return;
    }

    setIsClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('process_mining_claim', {
        user_id_param: user.id
      });

      if (error) throw error;

      const result = data as unknown as MiningClaimResult;

      if (result.success) {
        toast({
          title: "Mining successful!",
          description: `You earned ${result.points_earned} ZTYX!`,
        });
        fetchMiningData();
      } else {
        toast({
          title: "Mining failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error claiming mining:', error);
      toast({
        title: "Error",
        description: "There was a problem with mining.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleComingSoon = () => {
    toast({
      title: "Coming Soon!",
      description: "This feature is under development. Stay tuned!",
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}H : ${minutes.toString().padStart(2, '0')}M : ${secs.toString().padStart(2, '0')}S`;
  };

  const formattedMinedPoints = (currentMiningPoints / 1000).toFixed(4);
  const formattedTotalPoints = (miningWallet?.total_points / 1000).toFixed(2) || '0.00';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] text-white flex flex-col items-center">
      {/* Background circles animation */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute w-60 h-60 bg-[#ff00e5] rounded-full blur-[100px] -top-20 -left-20 animate-pulse-slow"></div>
        <div className="absolute w-80 h-80 bg-[#00e1ff] rounded-full blur-[120px] -bottom-40 -right-40 animate-pulse-slow-delay"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col items-center p-6">
        {/* Header with Logo */}
        <div className="w-full flex justify-between items-center mb-10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">ZTYX MINE</h1>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-medium">IVANNIKOV.PRO</span>
            <img src="/path/to/your/logo.png" alt="ZTYX Logo" className="w-8 h-8 rounded-full" />
          </div>
        </div>

        {/* Main Circular Progress & Timer */}
        <div className="relative w-full aspect-square max-w-[300px] flex items-center justify-center">
          {/* Progress SVG */}
          <svg className="absolute w-full h-full transform -rotate-90">
            {/* Outer Circle - Background */}
            <circle
              className="text-[#2c2c2c] stroke-current"
              strokeWidth="10"
              r="140"
              cx="50%"
              cy="50%"
              fill="transparent"
            />
            {/* Inner Circle - Progress */}
            <circle
              className="transition-all duration-1000 ease-linear"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 140}
              strokeDashoffset={2 * Math.PI * 140 - (progress / 100) * (2 * Math.PI * 140)}
              r="140"
              cx="50%"
              cy="50%"
              fill="transparent"
              style={{ stroke: 'url(#progressGradient)' }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#1E90FF" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner Content */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <p className="text-xl text-gray-400">In storage</p>
            <p className="text-4xl font-bold text-white mt-2 mb-2">{formattedMinedPoints} ZTYX</p>
            
            <p className="text-sm text-gray-500 mt-4">Balance</p>
            <p className="text-2xl font-bold text-white">{formattedTotalPoints} ZTYX</p>
            
            <p className="text-sm text-gray-500 mt-4">Fill</p>
            <p className="text-xl font-bold text-white">{formatTime(timeLeft)}</p>
          </div>
        </div>
        
        {/* Mining Rate Info */}
        <div className="text-center mt-8">
          <p className="text-2xl font-bold text-white">0.01 ZTYX/hour</p>
        </div>

        {/* Claim Button */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim || isClaiming}
          className={`w-full h-16 mt-8 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 ${
            canClaim
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 shadow-blue-500/50 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            {isClaiming ? (
              <Timer className="w-6 h-6 animate-spin" />
            ) : (
              <Coins className="w-6 h-6 animate-bounce" />
            )}
            <span>
              {isClaiming
                ? 'Claiming...'
                : 'Claim ZTYX'}
            </span>
          </div>
        </Button>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full max-w-sm mx-auto bg-[#1a1a1a] border-t border-gray-700 grid grid-cols-4 items-center justify-around py-4">
        <Button variant="ghost" className="flex flex-col items-center text-gray-400 hover:text-white" onClick={handleComingSoon}>
          <Fuel className="w-6 h-6" />
          <span className="text-xs mt-1">Gas</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-gray-400 hover:text-white" onClick={handleComingSoon}>
          <Rocket className="w-6 h-6" />
          <span className="text-xs mt-1">Boost</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-gray-400 hover:text-white" onClick={handleComingSoon}>
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Team</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-gray-400 hover:text-white" onClick={handleComingSoon}>
          <LayoutGrid className="w-6 h-6" />
          <span className="text-xs mt-1">Apps</span>
        </Button>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        @keyframes pulse-slow-delay {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s infinite ease-in-out;
        }
        .animate-pulse-slow-delay {
          animation: pulse-slow-delay 5s infinite ease-in-out 2s;
        }
      `}</style>
    </div>
  );
};

export default DashboardMine;
