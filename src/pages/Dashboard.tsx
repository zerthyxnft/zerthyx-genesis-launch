import { useState } from 'react';
import { Home, Pickaxe, CheckSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardHome from '@/components/dashboard/DashboardHome';
import DashboardMine from '@/components/dashboard/DashboardMine';
import DashboardTask from '@/components/dashboard/DashboardTask';
import DashboardMe from '@/components/dashboard/DashboardMe';

type TabType = 'home' | 'mine' | 'task' | 'me';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const tabs = [
    { id: 'home' as TabType, icon: Home, label: 'Home' },
    { id: 'mine' as TabType, icon: Pickaxe, label: 'Mine' },
    { id: 'task' as TabType, icon: CheckSquare, label: 'Task' },
    { id: 'me' as TabType, icon: User, label: 'Me' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardHome />;
      case 'mine':
        return <DashboardMine />;
      case 'task':
        return <DashboardTask />;
      case 'me':
        return <DashboardMe />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1 w-full pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-background/95 backdrop-blur-lg border-t border-border">
          <div className="flex items-center justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center py-2 px-4 transition-all duration-300",
                    isActive 
                      ? "text-primary cyber-glow" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-6 h-6 mb-1",
                    isActive && "animate-pulse"
                  )} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
