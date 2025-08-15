import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Wallet,
  Coins,
  Gem,
  Play,
  Pause,
  Sparkles,
  Pickaxe,
  Loader,
} from 'lucide-react';

interface MiningWallet {
  total_points: number;
}

const DashboardMine = () => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [minedSessionPoints, setMinedSessionPoints] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    let interval;
    if (isMining) {
      interval = setInterval(() => {
        setMinedSessionPoints(prev => prev + 1);
      }, 1000); // Simulates 1 point per second
    } else if (!isMining && minedSessionPoints !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isMining, minedSessionPoints]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('mining_wallets')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      if (data) {
        setTotalPoints(data.total_points);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMining = () => {
    if (isMining) {
      setIsMining(false);
      toast({
        title: "Mining Paused",
        description: "Your virtual miner is now paused.",
      });
    } else {
      setIsMining(true);
      toast({
        title: "Mining Started",
        description: "Your virtual miner is now active!",
      });
    }
  };

  const handleCollect = async () => {
    if (minedSessionPoints === 0) {
      toast({
        title: "No coins to collect",
        description: "Please start mining first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsMining(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTotalPoints = totalPoints + minedSessionPoints;
      
      const { error } = await supabase
        .from('mining_wallets')
        .update({ total_points: newTotalPoints })
        .eq('user_id', user.id);

      if (error) throw error;

      setTotalPoints(newTotalPoints);
      setMinedSessionPoints(0);

      toast({
        title: "Success",
        description: `Successfully collected ${minedSessionPoints} points!`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error collecting points:', error);
      toast({
        title: "Error",
        description: "Failed to collect points. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-6 flex flex-col items-center">
      {/* MINE WALLET Section */}
      <Card className="w-full max-w-sm bg-blue-100 border-none rounded-xl p-6 shadow-md mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-800" />
            <h2 className="text-sm font-bold text-blue-800">MINE WALLET</h2>
          </div>
          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
        </div>
        <p className="text-xl font-bold text-gray-700 mb-2">TOTAL POINTS</p>
        <p className="text-5xl font-extrabold text-blue-900">{totalPoints.toLocaleString()}</p>
      </Card>

      {/* Mining Animation and Counter */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
          {isMining ? (
            <div className="relative w-full h-full">
              <img
                src="https://www.freeiconspng.com/uploads/robot-png-4.png" // Replace with a better robot image if available
                alt="Robot 1"
                className="absolute top-1/2 left-0 w-20 h-20 transform -translate-y-1/2 -translate-x-1/2 animate-mining-left"
              />
              <img
                src="https://www.freeiconspng.com/uploads/robot-png-4.png" // Replace with a better robot image if available
                alt="Robot 2"
                className="absolute top-1/2 right-0 w-20 h-20 transform -translate-y-1/2 translate-x-1/2 scale-x-[-1] animate-mining-right"
              />
              <img
                src="https://storage.googleapis.com/zerthyx_tokens/icon.png" // Your ZTYX token image
                alt="ZTYX Token"
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32"
              />
            </div>
          ) : (
            <Gem className="w-32 h-32 text-blue-500 animate-pulse" />
          )}
        </div>
        
        <p className="text-sm text-gray-500 font-bold mb-2">MINED THIS SESSION</p>
        <div className="flex items-center space-x-2">
          <Coins className="w-8 h-8 text-yellow-500" />
          <p className="text-4xl font-extrabold text-black">{minedSessionPoints}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-4 mt-auto">
        <Button
          onClick={handleStartMining}
          className={`w-full h-12 rounded-full text-lg font-bold transition-colors ${
            isMining ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isMining ? (
            <>
              <Pause className="w-5 h-5 mr-2" />
              Stop Mining
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start Mining
            </>
          )}
        </Button>
        <Button
          onClick={handleCollect}
          disabled={minedSessionPoints === 0}
          className={`w-full h-12 rounded-full text-lg font-bold transition-colors ${
            minedSessionPoints > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'
          }`}
        >
          Collect
        </Button>
      </div>

      <style jsx>{`
        @keyframes mining-left {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          50% { transform: translate(-50%, -50%) rotate(15deg); }
          100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes mining-right {
          0% { transform: translate(50%, -50%) rotate(0deg) scaleX(-1); }
          50% { transform: translate(50%, -50%) rotate(-15deg) scaleX(-1); }
          100% { transform: translate(50%, -50%) rotate(0deg) scaleX(-1); }
        }
        .animate-mining-left {
          animation: mining-left 1s infinite;
        }
        .animate-mining-right {
          animation: mining-right 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default DashboardMine;
