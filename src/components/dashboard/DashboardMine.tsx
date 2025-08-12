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
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-16 w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-60 left-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-60 left-8 w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 p-6 max-w-md mx-auto">
        {/* Header */}
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

        {/* Mining Wallet */}
        <Card className="w-full bg-gradient-to-br from-green-100 to-green-50 border-green-300 p-8 mb-6 relative overflow-hidden shadow-2xl rounded-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/40 to-transparent rounded-full"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <Gem className="w-6 h-6 text-green-700" />
                <span className="text-base font-semibold text-green-800">MINING WALLET</span>
              </div>
              <Sparkles className="w-5 h-5 text-green-700 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-green-700">Total Points</p>
                <p className={`text-3xl font-extrabold text-green-900 ${animatingPoints ? 'animate-pulse scale-110' : ''} transition-all duration-500`}>
                  {miningWallet?.total_points?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-green-700">Today's Points</p>
                  <p className="text-xl font-bold text-green-800">
                    {miningWallet?.today_points?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Today's Claims</p>
                  <p className="text-xl font-bold text-green-800">
                    {miningWallet?.today_claims || 0}/24
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Countdown Timer + Gems Animation */}
        <div className="p-6 mb-4 flex flex-col items-center relative">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border-4 ${canClaim ? 'border-green-400' : 'border-amber-300'} animate-spin-slow`} />
            <div className={`absolute inset-3 rounded-full border-2 border-dashed ${canClaim ? 'border-green-300' : 'border-amber-200'} animate-spin-reverse-slower`} />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-5 h-5 bg-yellow-300 rounded-full animate-bounce"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 80}%`,
                  animationDelay: `${i * 0.5}s`
                }}
              ></div>
            ))}
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

        {/* Daily Progress */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-green-100 to-blue-100 border-green-300 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Daily Progress</span>
            <span className="text-sm font-bold">{miningWallet?.today_claims || 0}/24</span>
          </div>
          <Progress value={dailyProgress} className="h-2 rounded-full bg-green-200" />
          <div className="flex justify-between text-xs text-green-700 mt-1">
            <span>0</span>
            <span>24,000 points</span>
          </div>
        </Card>

        {/* Collect Button */}
        <div className="relative mb-6">
          <Button 
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={`w-full h-14 text-lg font-bold rounded-xl shadow-md transition-all duration-300 ${
              canClaim 
                ? 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:scale-105' 
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isClaiming 
              ? 'Mining in Progress...' 
              : canClaim 
                ? 'COLLECT NOW +1000 POINTS' 
                : `Next mine: ${formatTime(timeLeft)}`
            }
          </Button>
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
