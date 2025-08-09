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
  Settings,
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

      // Fetch mining wallet
      const { data: wallet } = await supabase
        .from('mining_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMiningWallet(wallet);

      // Fetch last session
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
          title: "mining failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error claiming mining:', error);
      toast({
        title: "Error",
        description: "There was a problem with mining।",
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
        
        {/* Floating Particles */}
        <div className="floating absolute top-32 left-1/4 w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-60"></div>
        <div className="floating absolute top-48 right-1/3 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-60" style={{ animationDelay: '1s' }}></div>
        <div className="floating absolute bottom-32 left-1/3 w-2.5 h-2.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-60" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Pickaxe className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              ZTYX MINE
            </h1>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* MINING WALLET Display */}
        <Card className="bg-gradient-to-br from-accent/20 to-accent/10 border-accent/30 p-6 mb-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/20 to-transparent rounded-full"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Gem className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-accent">MINING WALLET</span>
              </div>
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">total points</p>
                <p className={`text-2xl font-bold text-amber-400 ${animatingPoints ? 'animate-pulse scale-110' : ''} transition-all duration-500`}>
                  {miningWallet?.total_points?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">today's points</p>
                  <p className="text-lg font-bold text-green-400">
                    {miningWallet?.today_points?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">today's claims</p>
                  <p className="text-lg font-bold text-blue-400">
                    {miningWallet?.today_claims || 0}/24
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Countdown Timer */}
        <Card className="glass-card p-6 mb-6">
          <div className="text-center">
            <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full border-4 mb-4 ${
              canClaim 
                ? 'border-green-400 bg-green-400/10 cyber-glow' 
                : 'border-amber-400/50 bg-amber-400/5'
            }`}>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-current animate-spin opacity-30" style={{ animationDuration: '10s' }}></div>
              {canClaim ? (
                <Pickaxe className="w-8 h-8 text-green-400 animate-bounce" />
              ) : (
                <Timer className="w-8 h-8 text-amber-400" />
              )}
            </div>
            
            <div className="space-y-2">
              {canClaim ? (
                <p className="text-lg font-bold text-green-400">Mining ready!</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">next mine available:</p>
                  <p className="text-xl font-mono font-bold text-amber-400">
                    {formatTime(timeLeft)}
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Daily Progress */}
        <Card className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">daily progress</span>
            <span className="text-sm font-bold">{miningWallet?.today_claims || 0}/24</span>
          </div>
          <Progress value={dailyProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>24,000 points</span>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Mining Button */}
        <div className="relative">
          <Button 
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={`w-full h-16 text-lg font-bold relative overflow-hidden transition-all duration-300 ${
              canClaim 
                ? 'btn-cyber hover:scale-105 cyber-glow' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <Coins className={`w-6 h-6 ${canClaim ? 'animate-bounce' : ''}`} />
              <span>
                {isClaiming 
                  ? 'Mining is going on...' 
                  : canClaim 
                    ? 'COLLECT NOW +1000 POINTS' 
                    : `Next mine: ${formatTime(timeLeft)}`
                }
              </span>
            </div>
            
            {canClaim && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
            )}
          </Button>
          
          {canClaim && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
          )}
        </div>

        {/* Daily Limit Warning */}
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
