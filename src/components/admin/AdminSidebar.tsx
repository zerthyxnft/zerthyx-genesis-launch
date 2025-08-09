import { LayoutDashboard, Users, Network, CreditCard, Image, Settings, ArrowUpCircle, Pickaxe, TrendingUp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AdminSection = "dashboard" | "users" | "blockchain" | "deposits" | "profits" | "withdrawals" | "mining" | "settings";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "blockchain", label: "Blockchain Manager", icon: Network },
  { id: "deposits", label: "Deposit Management", icon: CreditCard },
  { id: "profits", label: "NFT Profits", icon: TrendingUp },
  { id: "withdrawals", label: "Withdrawal Management", icon: ArrowUpCircle },
  { id: "mining", label: "Mining Activity", icon: Pickaxe },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r border-border/40">
      <SidebarContent className="bg-card/30 backdrop-blur-sm">
        <div className="p-6 border-b border-border/40">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crypto Platform Control</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id as AdminSection)}
                    isActive={activeSection === item.id}
                    className={`w-full justify-start gap-3 px-4 py-3 transition-all ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}