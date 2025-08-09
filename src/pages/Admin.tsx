import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminBlockchain } from "@/components/admin/AdminBlockchain";
import { AdminDeposits } from "@/components/admin/AdminDeposits";

import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminWithdrawals } from "@/components/admin/AdminWithdrawals";
import { AdminMining } from "@/components/admin/AdminMining";
import { AdminProfits } from "@/components/admin/AdminProfits";

type AdminSection = "dashboard" | "users" | "blockchain" | "deposits" | "profits" | "withdrawals" | "mining" | "settings";

export default function Admin() {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      return !!data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <AdminUsers />;
      case "blockchain":
        return <AdminBlockchain />;
      case "deposits":
        return <AdminDeposits />;
      case "profits":
        return <AdminProfits />;
      case "withdrawals":
        return <AdminWithdrawals />;
      case "mining":
        return <AdminMining />;
      case "settings":
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader />
          
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}