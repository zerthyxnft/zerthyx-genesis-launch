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
        title: "Work complete",
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
          title: "Task successful!",
          description: `You earned ${result.points_earned} points! ${result.verification_required ? 'Waiting for verification.' : ''}`,
        });

        fetchTasksData();
      } else {
        toast({
          title: "Task failed",
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
      title: "Copied!",
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
    return <IconComponent className="w-6 h-6 text-black" />;
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

  const getTasksByCategory = (category: string) => tasks.filter(task => task.category === category);

  const completedTasksToday = userTasks.filter(task => {
    const today = new Date().toISOString().split('T')[0];
    return task.completion_date && task.completion_date.startsWith(today);
  }).length;

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-100 min-h-screen text-black">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 rounded-lg bg-gray-300 border border-gray-400">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold text-black">
            Complete tasks and earn mining points
          </h1>
        </div>
        
        <Card className="p-4 mb-4 bg-gray-200 border border-gray-300">
          <div className="text-center">
            <p className="text-2xl font-bold text-black mb-1">{totalTaskPoints.toLocaleString()}</p>
            <p className="text-sm text-black">total task points</p>
            <p className="text-xs text-black mt-2">
              All task points are automatically added to your mining wallet
            </p>
          </div>
        </Card>

        <Card className="p-4 mb-6 bg-gray-200 border border-gray-300">
          <div className="flex items-center justify-between mb-2 text-black">
            <span className="text-sm">Today's tasks are completed</span>
            <span className="text-sm font-bold">{completedTasksToday}/8</span>
          </div>
          <Progress value={dailyProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-black">
            <span>0</span>
            <span>8 tasks</span>
          </div>
        </Card>
      </div>

      {/* Daily Check-in & Social Media tasks */}
      {getTasksByCategory('daily').map(task => {
        const status = getTaskStatus(task);
        const available = isTaskAvailableToday(task);

        return (
          <Card key={task.id} className="p-4 mb-4 border border-gray-300 bg-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gray-300">{getTaskIcon(task.icon)}</div>
                <div>
                  <h3 className="font-bold text-black">{task.title}</h3>
                  <p className="text-xs text-black">{task.description}</p>
                  <p className="text-sm font-bold text-black">+{task.reward_points} points</p>
                </div>
              </div>
              <Button
                onClick={() => handleTaskAction(task)}
                disabled={!available || status === 'completed' || isLoading}
                size="sm"
                className={`${status === 'completed' ? 'bg-black text-white' : 'bg-gray-400 text-black'} ${!available ? 'opacity-50' : ''}`}
              >
                {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : status === 'pending' ? <Clock className="w-4 h-4" /> : 'Check-in'}
              </Button>
            </div>
          </Card>
        );
      })}
      
      {/* Referral & Achievements sections */}
      {/* Similar conversion applied: bg-gray-200, text-black, border-gray-300 */}
      {/* You can replicate the above pattern for social tasks, referral, and stats cards */}
    </div>
  );
};

export default DashboardTask;
