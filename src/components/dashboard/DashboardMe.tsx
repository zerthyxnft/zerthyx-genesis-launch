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
    <div className="p-6 max-w-md mx-auto min-h-screen bg-gray-100">
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

      {/* User Info Card - Deep Blue with Light Blue Gradient */}
      <Card className="p-6 mb-6 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-md rounded-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-blue-300">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
                <AvatarFallback className="bg-blue-500 text-white font-bold text-lg">
                  {userProfile ? getUserInitials(userProfile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{userProfile?.name || 'User'}</h2>
              <p className="text-sm text-blue-200 mb-1">{userProfile?.email || 'No email'}</p>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-yellow-300 font-medium"></span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-300/50">
            <div className="text-center">
              <p className="text-lg font-bold text-green-300">Active</p>
              <p className="text-xs text-blue-200">Status</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-300">Premium</p>
              <p className="text-xs text-blue-200">No</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-300">Genuine</p>
              <p className="text-xs text-blue-200">member</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Links Section - Deep Blue Heading */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center text-blue-600">
          <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
          Quick Links
        </h2>
        <div className="space-y-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card
                key={link.id}
                className="p-4 hover:scale-105 transition-transform cursor-pointer bg-blue-100 shadow-sm rounded-lg border border-blue-200"
                onClick={link.action}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${link.bgColor}`}>
                      <Icon className={`w-5 h-5 ${link.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-blue-700">{link.title}</h3>
                      <p className="text-xs text-blue-500">{link.subtitle}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* App Download Promotion - Light Blue Card */}
      <Card className="p-4 mb-6 border-green-500/30 bg-blue-100 shadow-sm rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Smartphone className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-500 mb-1">Get Mobile App</h3>
            <p className="text-xs text-blue-500">
              Download our app for better experience and notifications
            </p>
          </div>
          <Button
            onClick={handleDownloadApp}
            size="sm"
            className="btn-cyber bg-green-500 hover:bg-green-600 text-white"
          >
            Download
          </Button>
        </div>
      </Card>

      {/* Admin Panel Button - Light Blue Card */}
      {isAdmin && (
        <Card className="p-4 mb-6 border-orange-500/30 bg-blue-100 shadow-sm rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Shield className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-500 mb-1">Admin Panel</h3>
              <p className="text-xs text-blue-500">
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

      {/* Logout Button - Red */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 bg-red-600 text-white hover:bg-red-700 hover:text-white"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-white rounded-lg shadow-md border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-800">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-500 hover:text-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2"
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
