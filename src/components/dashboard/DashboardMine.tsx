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
  TrendingUp,
  Star,
  Coins,
  Timer,
  Trophy,
  Sparkles
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
    if (!canClaim || isClaiming) return;

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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-16 w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-60 left-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-60 left-8 w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

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

        {/* Mining Wallet (moved to top under header) */}
        <Card className="w-full min-h-[200px] bg-gradient-to-br from-green-200/80 to-green-100 border-green-400 p-8 mb-8 relative overflow-hidden shadow-xl scale-105">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/50 to-transparent rounded-full"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Gem className="w-6 h-6 text-green-800" />
                <span className="text-base font-bold text-green-800">MINING WALLET</span>
              </div>
              <Sparkles className="w-5 h-5 text-green-700 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-green-900 uppercase">Total Points</p>
                <p className={`text-4xl font-extrabold text-green-900 ${animatingPoints ? 'animate-pulse scale-110' : ''} transition-all duration-500`}>
                  {miningWallet?.total_points?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-green-800">Today’s Points</p>
                  <p className="text-2xl font-bold text-green-700">
                    {miningWallet?.today_points?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-800">Today’s Claims</p>
                  <p className="text-2xl font-bold text-green-700">
                    {miningWallet?.today_claims || 0}/24
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Timer with animated gems/coins */}
        <div className="p-6 mb-4 flex flex-col items-center relative">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-5 h-5 rounded-full flex items-center justify-center
                ${i % 2 === 0 ? 'bg-yellow-300' : 'bg-cyan-300'}
                shadow-lg`}
              style={{
                top: `${Math.random() * 80}%`,
                left: `${Math.random() * 80}%`,
                animation: `${i % 2 === 0 ? 'bounce 2s infinite' : 'ping 3s infinite'}, rotate 5s linear infinite`,
                animationDelay: `${i * 0.4}s`
              }}
            >
              {i % 2 === 0 ? <Coins className="w-3 h-3 text-yellow-600" /> : <Gem className="w-3 h-3 text-cyan-600" />}
            </div>
          ))}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border-4 ${canClaim ? 'border-green-400' : 'border-amber-300'} animate-spin-slow`} />
            <div className={`absolute inset-3 rounded-full border-2 border-dashed ${canClaim ? 'border-green-300' : 'border-amber-200'} animate-spin-reverse-slower`} />
            {canClaim ? (
              <Pickaxe className="w-10 h-10 text-green-400 animate-bounce" />
            ) : (
              <Timer className="w-10 h-10 text-amber-400 animate-pulse" />
            )}
          </div>
          <div className="mt-4 text-center">
            {canClaim ? (
              <p className="text-lg font-bold text-green-500">Mining Ready!</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Next mine available:</p>
                <p className="text-2xl font-mono font-bold text-amber-400">
                  {formatTime(timeLeft)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Daily Progress - moved up */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-green-300 via-cyan-300 to-blue-300 rounded-xl shadow-lg border border-white/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Daily Progress</span>
            <span className="text-sm font-bold text-white">{miningWallet?.today_claims || 0}/24</span>
          </div>
          <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 shadow-[0_0_8px_rgba(0,255,200,0.8)]"
              style={{ width: `${dailyProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-white/80 mt-1">
            <span>0</span>
            <span>24,000 points</span>
          </div>
        </Card>

        {/* Collect Button below daily progress */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim || isClaiming}
          className={`w-full h-16 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 ${
            canClaim
              ? 'bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 hover:scale-105 shadow-[0_0_15px_rgba(0,255,200,0.6)] text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <Coins className={`w-6 h-6 ${canClaim ? 'animate-bounce' : ''}`} />
            <span>
              {isClaiming
                ? 'Mining...'
                : canClaim
                  ? 'COLLECT NOW +1000 POINTS'
                  : `Next mine: ${formatTime(timeLeft)}`}
            </span>
          </div>
        </Button>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <Card className="glass-card p-3 text-center">
            <Zap className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">today's mining</p>
            <p className="text-sm font-bold text-blue-400">
              {miningWallet?.today_points?.toLocaleString() || '0'}
            </p>
          </Card>
          
          <Card className="glass-card p-3 text-center">
            <Trophy className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">daily limit</p>
            <p className="text-sm font-bold text-purple-400">24,000</p>
          </Card>
          
          <Card className="glass-card p-3 text-center">
            <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">streak</p>
            <p className="text-sm font-bold text-yellow-400">
              {miningWallet?.today_claims || 0}
            </p>
          </Card>
        </div>

        {miningWallet?.today_claims === 24 && (
          <Card className="glass-card p-4 mt-4 border-orange-500/50">
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
