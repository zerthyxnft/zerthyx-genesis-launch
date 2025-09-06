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
  Info,
  LogOut,
  ExternalLink,
  Settings,
  Sparkles,
  Shield,
  FileText
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
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

  const showPrivacyPolicy = () => {
    setShowPrivacyModal(true);
  };

  const showAboutUs = () => {
    setShowAboutModal(true);
  };

  const closePrivacyModal = () => {
    setShowPrivacyModal(false);
  };

  const closeAboutModal = () => {
    setShowAboutModal(false);
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
      title: "Privacy Policy",
      subtitle: "Read our privacy policy",
      icon: FileText,
      action: showPrivacyPolicy,
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/20"
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

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-600">Privacy Policy</h2>
              <button onClick={closePrivacyModal} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>
            <div className="p-4 text-sm text-gray-700">
              <p><strong>Effective Date:</strong> [01/09/2025]</p>
              <p>At Zerthyx.com (and the Zerthyx mobile app), we respect your privacy and are committed to protecting it. This Privacy Policy explains how we handle user information.</p>
              
              <h3 className="font-bold mt-4 mb-2">1. Information We Collect</h3>
              <p>We do not collect, store, or share any personal data such as your name, phone number, email, or address without your consent.</p>
              <p>The app only uses basic information required for:</p>
              <ul className="list-disc pl-5 mb-2">
                <li>User authentication (for login / signup).</li>
                <li>Wallet transactions (deposits, withdrawals, and token mining).</li>
              </ul>
              
              <h3 className="font-bold mt-4 mb-2">2. How We Use Data</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>Data is used only for providing services such as mining, referrals, and task rewards.</li>
                <li>We do not sell, rent, or share your data with any third party.</li>
              </ul>
              
              <h3 className="font-bold mt-4 mb-2">3. Data Security</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>Your account and wallet are protected using secure blockchain technology.</li>
                <li>We do not store sensitive financial data on our servers.</li>
              </ul>
              
              <h3 className="font-bold mt-4 mb-2">4. No Illegal Activity</h3>
              <p>Our platform does not promote or allow any illegal activities. Zerthyx is built only for legal digital mining, NFT, token rewards, and community growth.</p>
              
              <h3 className="font-bold mt-4 mb-2">5. Children's Privacy</h3>
              <p>Our services are not directed at children under the age of 13.</p>
              
              <h3 className="font-bold mt-4 mb-2">6. Third-Party Services</h3>
              <p>Some features (like blockchain transactions) may use trusted third-party services. These providers follow their own strict privacy and security policies.</p>
              
              <h3 className="font-bold mt-4 mb-2">7. User Control</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>You can stop using the app anytime.</li>
                <li>No personal data is stored after you leave.</li>
              </ul>
              
              <h3 className="font-bold mt-4 mb-2">8. Changes to This Policy</h3>
              <p>We may update this Privacy Policy if needed. Any changes will be updated on zerthyx.com.</p>
              
              <h3 className="font-bold mt-4 mb-2">9. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, you can reach us at:</p>
              <p>📩 zerthyx.nft@gmail.com</p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button onClick={closePrivacyModal} className="bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* About Us Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-600">About Zerthyx</h2>
              <button onClick={closeAboutModal} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>
            <div className="p-4 text-sm text-gray-700">
              <h3 className="font-bold text-lg mb-3 text-center text-blue-700">About Us</h3>
              <p className="mb-3">
                Zerthyx.com is the next-generation platform where NFTs, token mining, refer & earn, and daily tasks come together to create endless earning opportunities.
              </p>
              <p className="mb-3">
                Our native token, ZTYX, is built on blockchain to be fast, secure, and highly rewarding. With Zerthyx, every user can mine ZTYX, complete tasks, or invite friends to earn more — building a stronger community every day.
              </p>
              
              <div className="mb-3">
                <div className="flex items-start mb-2">
                  <span className="text-blue-600 mr-2 font-bold">🔹</span>
                  <span><strong>Zerthyx NFT</strong> – Exclusive NFTs that work as digital mining assets, generating daily returns.</span>
                </div>
                <div className="flex items-start mb-2">
                  <span className="text-blue-600 mr-2 font-bold">🔹</span>
                  <span><strong>ZTYX Mining</strong> – Mine tokens directly through our platform and grow your balance.</span>
                </div>
                <div className="flex items-start mb-2">
                  <span className="text-blue-600 mr-2 font-bold">🔹</span>
                  <span><strong>Refer & Earn</strong> – Share Zerthyx with your friends and earn lifetime rewards.</span>
                </div>
                <div className="flex items-start mb-2">
                  <span className="text-blue-600 mr-2 font-bold">🔹</span>
                  <span><strong>Tasks & Rewards</strong> – Complete simple tasks daily to boost your ZTYX earnings.</span>
                </div>
              </div>
              
              <p className="mb-3">
                <span className="text-red-500 font-bold">🚀</span> Just like Bitcoin in its early days, ZTYX has the potential to grow massively and become a leading name in the crypto world. By joining now, you're not just earning — you're becoming part of a future digital revolution.
              </p>
              
              <p className="text-center font-bold text-blue-700 mt-4">
                Zerthyx.com – Mine. Earn. Grow.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button onClick={closeAboutModal} className="bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
