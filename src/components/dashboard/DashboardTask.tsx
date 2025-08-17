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
            const { data: { user } = { user: null } } = await supabase.auth.getUser();
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
        return <IconComponent className="w-6 h-6 text-gray-700" />;
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
        <div className="p-6 max-w-md mx-auto bg-white text-gray-900 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-700 border border-blue-600">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Complete tasks and earn mining points
                    </h1>
                </div>
                
                <Card className="p-4 mb-4 bg-gradient-to-br from-blue-700 to-blue-900 border-none rounded-lg">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white mb-1">
                            {totalTaskPoints.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-300">total task points</p>
                        <p className="text-xs text-gray-400 mt-2">
                            All task points are automatically added to your mining wallet
                        </p>
                    </div>
                </Card>

                <Card className="p-4 mb-6 bg-blue-100 border-none rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Today's tasks are completed</span>
                        <span className="text-sm font-bold text-gray-900">{completedTasksToday}/8</span>
                    </div>
                    <Progress value={dailyProgress} className="h-2 mb-2 bg-blue-300 [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:to-blue-400" />
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span>8 tasks</span>
                    </div>
                </Card>
            </div>

            {/* Daily Check-in Task */}
            {getTasksByCategory('daily').map(task => {
                const status = getTaskStatus(task);
                const available = isTaskAvailableToday(task);
                return (
                    <Card key={task.id} className="p-4 mb-4 bg-blue-50 border-none rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-green-200">{getTaskIcon(task.icon)}</div>
                                <div>
                                    <h3 className="font-bold text-green-700">{task.title}</h3>
                                    <p className="text-xs text-gray-600">{task.description}</p>
                                    <p className="text-sm font-bold text-green-700">+{task.reward_points} points</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => handleTaskAction(task)}
                                disabled={!available || status === 'completed' || isLoading}
                                size="sm"
                                className={`${status === 'completed' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'} ${!available ? 'opacity-50' : ''}`}
                            >
                                {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : status === 'pending' ? <Clock className="w-4 h-4" /> : 'Check-in'}
                            </Button>
                        </div>
                    </Card>
                );
            })}

            {/* Social Media Tasks */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center text-gray-900">
                    <Star className="w-5 h-5 mr-2 text-yellow-400" />
                    Social Media Work
                </h2>
                
                <div className="grid gap-3">
                    {getTasksByCategory('social').map(task => {
                        const status = getTaskStatus(task);
                        return (
                            <Card key={task.id} className="p-4 bg-blue-50 border-none rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${
                                            task.platform === 'twitter' ? 'bg-cyan-500' :
                                            task.platform === 'telegram' ? 'bg-blue-400' :
                                            task.platform === 'instagram' ? 'bg-pink-500' :
                                            task.platform === 'facebook' ? 'bg-blue-600' :
                                            task.platform === 'youtube' ? 'bg-red-500' :
                                            'bg-purple-500'
                                        }`}>{getTaskIcon(task.icon)}</div>
                                        <div>
                                            <h3 className="font-semibold text-sm text-gray-900">{task.title}</h3>
                                            <p className="text-xs text-gray-600">{task.description}</p>
                                            <p className="text-sm font-bold text-green-700">+{task.reward_points} points</p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => handleTaskAction(task)}
                                        disabled={status === 'completed' || isLoading}
                                        size="sm"
                                        className={`${status === 'completed' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                                    >
                                        {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : status === 'pending' ? <Clock className="w-4 h-4" /> : 'Complete'}
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Referral System */}
            <Card className="p-6 mb-6 bg-blue-50 border-none rounded-lg">
                <div className="text-center mb-4">
                    <div className="p-3 rounded-full bg-blue-200 inline-flex mb-3">
                        <Users className="w-6 h-6 text-gray-700" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Refer and Earn</h2>
                    <p className="text-sm text-gray-600 mb-4">Earn $1 USDT per qualified referral</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{referralStats.count}</p>
                        <p className="text-xs text-gray-500">successful referral</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">${referralStats.earnings}</p>
                        <p className="text-xs text-gray-500">total earnings</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="p-3 bg-blue-200 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Your referral code:</p>
                        <p className="font-mono text-gray-900 text-sm">{referralCode}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={copyReferralLink} variant="outline" size="sm" className="bg-blue-300 text-gray-800 border-blue-400 hover:bg-blue-400">
                            <Copy className="w-4 h-4 mr-2" /> Copy
                        </Button>
                        <Button onClick={shareReferralLink} size="sm" className="bg-green-500 text-white hover:bg-green-600">
                            <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                    </div>
                    
                    <div className="text-xs text-gray-600 bg-blue-100 p-3 rounded-lg">
                        <p><strong>Terms & Conditions:</strong></p>
                        <p>1: Share your referral link with friends</p>
                        <p>2: Invite friends to sign up and deposit crypto worth more than $50</p>
                        <p>3: You will receive a $1 bonus reward within the next day</p>
                        <p>4: Your referral must be genuine</p>
                    </div>
                </div>
            </Card>

            {/* Achievement Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center bg-blue-50 border-none rounded-lg">
                    <Target className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Complete today</p>
                    <p className="text-sm font-bold text-yellow-400">{completedTasksToday}</p>
                </Card>
                
                <Card className="p-3 text-center bg-blue-50 border-none rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-700 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Total marks</p>
                    <p className="text-sm font-bold text-green-700">{totalTaskPoints.toLocaleString()}</p>
                </Card>
                
                <Card className="p-3 text-center bg-blue-50 border-none rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Referral</p>
                    <p className="text-sm font-bold text-purple-600">{referralStats.count}</p>
                </Card>
            </div>
        </div>
    );
};

export default DashboardTask;
