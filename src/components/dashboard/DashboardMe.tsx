import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  User,
  MessageCircle,
  Download,
  Info,
  LogOut,
  ExternalLink,
  Smartphone,
  Settings,
  Crown,
  Sparkles,
  Shield
} from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
}

const DashboardMe = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    checkAdminStatus();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .single();
      setUserProfile({
        name: profile?.name || user.user_metadata?.name || 'User',
        email: profile?.email || user.email || '',
        avatar_url: user.user_metadata?.avatar_url
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          name: user.user_metadata?.name || 'User',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const goToAdmin = () => {
    navigate('/admin');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openTelegramSupport = () => {
    const telegramUrl = 'https://t.me/zerthyx_support';
    window.open(telegramUrl, '_blank');
  };

  const handleDownloadApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android/i.test(userAgent)) {
      window.open('https://play.google.com/store/apps/details?id=com.zerthyx.app', '_blank');
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open('https://apps.apple.com/app/zerthyx/id123456789', '_blank');
    } else {
      toast({
        title: "Download App",
        description: "Visit our website to download the mobile app for your device.",
      });
    }
  };

  const showAboutUs = () => {
    toast({
      title: "About Zerthyx Genesis",
      description: "A revolutionary crypto mining and task-based earning platform. Join the future of digital earnings!",
    });
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const quickLinks = [
    {
      id: 1,
      title: "Telegram Support",
      subtitle: "Get help from our support team",
      icon: MessageCircle,
      action: openTelegramSupport,
      iconColor: "text-cyan-400",
      bgColor: "bg-cyan-500/20"
    },
    {
      id: 2,
      title: "Download App",
      subtitle: "Get our mobile app",
      icon: Download,
      action: handleDownloadApp,
      iconColor: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      id: 3,
      title: "About Us",
      subtitle: "Learn more about Zerthyx",
      icon: Info,
      action: showAboutUs,
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/20"
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 max-w-md mx-auto flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Profile
          </h1>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* User Info Card */}
      <Card className="p-6 mb-6 relative overflow-hidden bg-[#CCCC00]"> {/* Arbitrary value for dark yellow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-primary/30">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg">
                  {userProfile ? getUserInitials(userProfile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">
                {userProfile?.name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">
                {userProfile?.email || 'No email'}
              </p>
              <div className="flex items-center space-x-1">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">Premium Member</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">Active</p>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400">2.5k</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-400">15</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Links Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center text-black"> {/* Black text class */}
          <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
          Quick Links
        </h2>
        <div className="space-y-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card
                key={link.id}
                className="p-4 hover:scale-105 transition-transform cursor-pointer bg-gray-200" {/* Tailwind's built-in light gray */}
                onClick={link.action}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${link.bgColor}`}>
                      <Icon className={`w-5 h-5 ${link.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{link.title}</h3>
                      <p className="text-xs text-muted-foreground">{link.subtitle}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* App Download Promotion */}
      <Card className="p-4 mb-6 border-green-500/30 bg-gray-200"> {/* Tailwind's built-in light gray */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Smartphone className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-400 mb-1">Get Mobile App</h3>
            <p className="text-xs text-muted-foreground">
              Download our app for better experience and notifications
            </p>
          </div>
          <Button
            onClick={handleDownloadApp}
            size="sm"
            className="btn-cyber"
          >
            Download
          </Button>
        </div>
      </Card>

      {/* Admin Panel Button - Only for Admins */}
      {isAdmin && (
        <Card className="p-4 mb-6 border-orange-500/30 bg-gray-200"> {/* Tailwind's built-in light gray */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Shield className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-400 mb-1">Admin Panel</h3>
              <p className="text-xs text-muted-foreground">
                Access admin dashboard and platform management
              </p>
            </div>
            <Button
              onClick={goToAdmin}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Open
            </Button>
          </div>
        </Card>
      )}

      {/* Logout Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 border-red-500/50 hover:bg-red-500/10 hover:text-red-300 bg-red-600 text-black" {/* Tailwind's red color palette */}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-gray-200"> {/* Tailwind's built-in light gray */}
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardMe;
