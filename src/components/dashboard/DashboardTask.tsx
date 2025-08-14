// dashboardtask.tsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Gift, 
  Calendar, 
  Users, 
  Copy, 
  Share2,
  ExternalLink,
  CheckCircle,
  Clock,
  Star,
  Target,
  TrendingUp,
  Twitter,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Heart,
  Play,
  Sparkles
} from 'lucide-react';

interface Task {
  id: string;
  task_type: string;
  title: string;
  description: string;
  reward_points: number;
  icon: string;
  platform: string;
  external_url: string;
  verification_type: string;
  category: string;
  is_recurring: boolean;
}

interface UserTask {
  task_id: string;
  status: string;
  points_earned: number;
  completion_date: string;
}

interface TaskCompletionResult {
  success: boolean;
  points_earned?: number;
  verification_required?: boolean;
  error?: string;
  message?: string;
}

const DashboardTask = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [totalTaskPoints, setTotalTaskPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ count: 0, earnings: 0 });
  const [dailyProgress, setDailyProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasksData();
    fetchReferralData();
  }, []);

  const fetchTasksData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      setTasks(tasksData || []);

      const { data: userTasksData } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id);

      setUserTasks(userTasksData || []);

      const { data: miningWallet } = await supabase
        .from('mining_wallets')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      setTotalTaskPoints(miningWallet?.total_points || 0);

      const today = new Date().toISOString().split('T')[0];
      const completedToday = userTasksData?.filter(task => 
        task.completion_date && task.completion_date.startsWith(today)
      ).length || 0;
      
      setDailyProgress((completedToday / 8) * 100);

    } catch (error) {
      console.error('Error fetching tasks data:', error);
    }
  };

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: code } = await supabase.rpc('create_user_referral_code', {
        user_id_param: user.id
      });

      setReferralCode(code);

      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      const qualifiedReferrals = referrals?.filter(r => r.status === 'qualified').length || 0;
      const totalEarnings = referrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;
      
      setReferralStats({ count: qualifiedReferrals, earnings: totalEarnings });

    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const handleTaskAction = async (task: Task) => {
    const userTask = userTasks.find(ut => ut.task_id === task.id);
    
    if (userTask && userTask.status === 'verified' && !task.is_recurring) {
      toast({
        title: "work complete",
        description: "This task has already been completed.",
        variant: "destructive",
      });
      return;
    }

    if (task.task_type === 'daily_checkin') {
      await completeTask(task);
      return;
    }

    if (task.external_url) {
      window.open(task.external_url, '_blank');
    }

    setTimeout(() => {
      completeTask(task);
    }, 2000);
  };

  const completeTask = async (task: Task) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('complete_task', {
        user_id_param: user.id,
        task_id_param: task.id
      });

      if (error) throw error;

      const result = data as unknown as TaskCompletionResult;

      if (result.success) {
        toast({
          title: "task successful!",
          description: `You earned ${result.points_earned} points! ${result.verification_required ? 'Waiting for verification.' : ''}`,
        });
        fetchTasksData();
      } else {
        toast({
          title: "task failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "There was a problem completing the task.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "copied!",
      description: "Referral link has been copied.",
    });
  };

  const shareReferralLink = () => {
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    const text = `Join Zerthyx Genesis and earn money mining crypto! Join with my referral link: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({ text });
    } else {
      copyReferralLink();
    }
  };

  const getTaskIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      Twitter, MessageCircle, Instagram, Facebook, Youtube, Heart, Play, Calendar, Users, Gift
    };
    const IconComponent = iconMap[iconName] || Star;
    return <IconComponent className="w-6 h-6" />;
  };

  const getTaskStatus = (task: Task) => {
    const userTask = userTasks.find(ut => ut.task_id === task.id);
    if (!userTask) return 'available';
    if (userTask.status === 'verified') return 'completed';
    if (userTask.status === 'completed') return 'pending';
    return 'available';
  };

  const isTaskAvailableToday = (task: Task) => {
    if (!task.is_recurring) return true;
    const userTask = userTasks.find(ut => ut.task_id === task.id);
    if (!userTask) return true;
    const today = new Date().toISOString().split('T')[0];
    const completionDate = userTask.completion_date?.split('T')[0];
    return completionDate !== today;
  };

  const getTasksByCategory = (category: string) => {
    return tasks.filter(task => task.category === category);
  };

  const completedTasksToday = userTasks.filter(task => {
    const today = new Date().toISOString().split('T')[0];
    return task.completion_date && task.completion_date.startsWith(today);
  }).length;

  return (
    <div className="p-6 max-w-md mx-auto bg-white min-h-screen">
      {/* ... unchanged parts ... */}

      {/* Referral System */}
      <Card className="glass-card p-6 mb-6 border-amber-500/30">
        <div className="text-center mb-4">
          <div className="p-3 rounded-full bg-amber-500/20 inline-flex mb-3">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-amber-400 mb-2">Refer and Earn</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Earn $1 USDT per qualified referral
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{referralStats.count}</p>
            <p className="text-xs text-muted-foreground">successful referral</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">${referralStats.earnings}</p>
            <p className="text-xs text-muted-foreground">total earnings</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-gray-200 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">your referral code:</p>
            <p className="font-mono text-amber-400 text-sm">{referralCode}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copyReferralLink} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button onClick={shareReferralLink} size="sm" className="btn-cyber">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground bg-gray-100 p-3 rounded-lg">
            <p><strong>Terms & Conditions:</strong></p>
            <p>1: Share your referral link with friends</p>
            <p>2: Invite friends to sign up and Deposit crypto worth more than $50</p>
            <p>3: You will receive a $1 Bonus reward within Next Day</p>
            <p>4: Your referral must be genuine</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardTask;
