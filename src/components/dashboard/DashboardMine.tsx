import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Pickaxe,
  Gem,
  Zap,
  Clock,
  Star,
  Coins,
  Timer,
  Trophy,
  Sparkles,
  Loader,
  Play,
  Pause,
  Wallet
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
  const [animatingPoints, setAnimatingPoints] = useState(false);
  const { toast } = useToast();

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
        setAnimatingPoints(true);
        setTimeout(() => setAnimatingPoints(false), 2000);

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const dailyProgress = miningWallet ? (miningWallet.today_claims / 24) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#141414] text-white relative overflow-hidden">
      <div className="relative z-10 p-6 max-w-md mx-auto">
        {/* Header - ZTYX MINE top-left */}
        <div className="flex items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Pickaxe className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              ZTYX MINE
            </h1>
          </div>
        </div>

        {/* Wallet Section - Aesthetically Pleasing */}
        <Card className="w-full min-h-[150px] bg-[#1e1e1e] border-none p-6 rounded-xl shadow-md mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-400">MINE WALLET</h2>
            </div>
            <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <p className="text-xl font-bold text-gray-400 mb-2">TOTAL POINTS</p>
          <p className={`text-5xl font-extrabold text-white ${animatingPoints ? 'animate-pulse' : ''} transition-all duration-500`}>
            {miningWallet?.total_points?.toLocaleString() || '0'}
          </p>
        </Card>

        {/* Mining Animation and Counter */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <Gem className="w-32 h-32 text-purple-500 animate-pulse-slow" />
          </div>
          
          <p className="text-sm text-gray-400 font-bold mb-2">MINED THIS SESSION</p>
          <div className="flex items-center space-x-2">
            <Coins className="w-8 h-8 text-yellow-500" />
            <p className="text-4xl font-extrabold text-white">
              {canClaim ? 'Ready!' : '0'}
            </p>
          </div>
        </div>

        {/* Collect Button */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim || isClaiming}
          className={`w-full h-16 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 mb-4 ${
            canClaim
              ? 'bg-gradient-to-r from-green-500 to-green-700 hover:scale-105 shadow-green-500/50 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            {isClaiming ? (
              <Loader className="w-6 h-6 animate-spin" />
            ) : canClaim ? (
              <Coins className="w-6 h-6 animate-bounce" />
            ) : (
              <Timer className="w-6 h-6 animate-pulse" />
            )}
            <span>
              {isClaiming
                ? 'Claiming...'
                : canClaim
                ? 'COLLECT NOW'
                : `Next mine: ${formatTime(timeLeft)}`}
            </span>
          </div>
        </Button>

        {/* Daily Progress */}
        <Card className="p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">Daily Progress</span>
            <span className="text-sm font-bold text-white">{miningWallet?.today_claims || 0}/24</span>
          </div>
          <Progress value={dailyProgress} className="h-2 bg-gray-700" indicatorClassName="bg-gradient-to-r from-yellow-400 to-purple-400" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>24,000 points</span>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <Card className="p-3 text-center bg-gray-800 border-gray-700">
            <Zap className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">today's mining</p>
            <p className="text-sm font-bold text-blue-400">
              {miningWallet?.today_points?.toLocaleString() || '0'}
            </p>
          </Card>

          <Card className="p-3 text-center bg-gray-800 border-gray-700">
            <Trophy className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">daily limit</p>
            <p className="text-sm font-bold text-purple-400">24,000</p>
          </Card>

          <Card className="p-3 text-center bg-gray-800 border-gray-700">
            <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">streak</p>
            <p className="text-sm font-bold text-yellow-400">
              {miningWallet?.today_claims || 0}
            </p>
          </Card>
        </div>

        {miningWallet?.today_claims === 24 && (
          <Card className="p-4 mt-4 bg-gray-800 border-orange-500/50">
            <div className="flex items-center space-x-2 text-orange-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Daily limit reached today. Come back tomorrow!</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardMine;
