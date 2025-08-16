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
  TrendingUp,
  Star,
  Coins,
  Timer,
  Trophy,
  Sparkles,
  Wallet,
  Home,
  CheckSquare,
  User,
  Power,
  Fuel,
  Rocket,
  Users,
  LayoutGrid
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
          setTimeLeft(Math.floor(difference / 1000));
          setCanClaim(false);
        } else {
          setTimeLeft(0);
          setCanClaim(true);
        }
      } else {
        setCanClaim(true);
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
          description: `You earned ${result.points_earned} points!`,
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}H : ${minutes.toString().padStart(2, '0')}M : ${secs.toString().padStart(2, '0')}S`;
  };

  const currentMiningPoints = (oneHourInSeconds - timeLeft) * (pointsPerHour / oneHourInSeconds);
  const totalPointsDisplay = (miningWallet?.total_points || 0) / 1000;
  const progressPercentage = (oneHourInSeconds - timeLeft) / oneHourInSeconds * 100;

  return (
    <div className="min-h-screen bg-gradient-to-t from-[#333300] to-[#000066] text-white flex flex-col items-center p-6 relative">
      <div className="w-full max-w-sm flex-1 flex flex-col items-center">
        {/* Header with ZTYX MINE only */}
        <div className="w-full flex justify-center items-center mb-10">
          <h1 className="text-2xl font-normal bg-gradient-to-r from-[#8a2be2] to-[#00bfff] bg-clip-text text-transparent">ZTYX MINE</h1>
        </div>

        {/* Circular Progress Bar */}
        <div className="relative w-full aspect-square max-w-[300px] flex flex-col items-center justify-center mx-auto mb-8">
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              className="text-gray-800 stroke-current"
              strokeWidth="12"
              fill="transparent"
              r="140"
              cx="50%"
              cy="50%"
            />
            <circle
              className="transition-all duration-1000 ease-linear"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 140}
              strokeDashoffset={2 * Math.PI * 140 - (progressPercentage / 100) * (2 * Math.PI * 140)}
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
          <div className="absolute flex flex-col items-center justify-center">
            <p className="text-xs text-gray-400">In storage</p>
            <p className="text-3xl font-normal text-white mb-2">
              {currentMiningPoints.toFixed(4)} ZTYX
            </p>
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-xl font-normal text-white mb-2">
              {totalPointsDisplay.toFixed(2)} ZTYX
            </p>
            <p className="text-xs text-gray-500">Fill</p>
            <p className="text-lg font-normal text-white">
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
        
        {/* Mining Rate Info */}
        <div className="text-center mb-8">
          <p className="text-xl font-normal text-white">0.01 ZTYX/hour</p>
        </div>

        {/* Claim Button */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim || isClaiming}
          className={`w-full h-16 text-lg font-normal rounded-xl shadow-lg transition-all duration-300 ${
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

        {/* Additional Buttons inside a div */}
        <div className="w-full mt-6 p-4 rounded-xl bg-[#1e1e1e] border border-gray-700">
          <div className="grid grid-cols-4 gap-3">
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
        </div>
      </div>
    </div>
  );
};

export default DashboardMine;
