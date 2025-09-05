import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon } from "lucide-react";

export function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});

  const { data: adminSettings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");
      
      if (error) throw error;
      
      // Convert array to object for easier handling
      const settingsObj: Record<string, string> = {};
      data.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      setSettings(settingsObj);
      return settingsObj;
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: key,
          setting_value: value,
        }, {
          onConflict: "setting_key"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({
        title: "Settings updated",
        description: "Admin settings have been updated successfully.",
      });
    },
  });

  const handleSave = () => {
    Object.entries(settings).forEach(([key, value]) => {
      updateSettingMutation.mutate({ key, value });
    });
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform settings and parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Platform Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform_name">Platform Name</Label>
              <Input
                id="platform_name"
                value={settings.platform_name || ""}
                onChange={(e) => updateSetting("platform_name", e.target.value)}
                placeholder="Enter platform name"
              />
            </div>
            
            <div>
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email || ""}
                onChange={(e) => updateSetting("support_email", e.target.value)}
                placeholder="support@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="telegram_support_link">Telegram Support Link</Label>
              <Input
                id="telegram_support_link"
                value={settings.telegram_support_link || ""}
                onChange={(e) => updateSetting("telegram_support_link", e.target.value)}
                placeholder="https://t.me/support"
              />
            </div>
            
            <div>
              <Label htmlFor="daily_profit_rate">Daily Profit Rate (%)</Label>
              <Input
                id="daily_profit_rate"
                type="number"
                step="0.01"
                value={settings.daily_profit_rate || ""}
                onChange={(e) => updateSetting("daily_profit_rate", e.target.value)}
                placeholder="2.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mining Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="points_per_claim">Points Per Claim</Label>
              <Input
                id="points_per_claim"
                type="number"
                value={settings.points_per_claim || ""}
                onChange={(e) => updateSetting("points_per_claim", e.target.value)}
                placeholder="1000"
              />
            </div>
            
            <div>
              <Label htmlFor="cooldown_hours">Cooldown Hours</Label>
              <Input
                id="cooldown_hours"
                type="number"
                value={settings.cooldown_hours || ""}
                onChange={(e) => updateSetting("cooldown_hours", e.target.value)}
                placeholder="1"
              />
            </div>
            
            <div>
              <Label htmlFor="daily_claim_limit">Daily Claim Limit</Label>
              <Input
                id="daily_claim_limit"
                type="number"
                value={settings.daily_claim_limit || ""}
                onChange={(e) => updateSetting("daily_claim_limit", e.target.value)}
                placeholder="24"
              />
            </div>
            
            <div>
              <Label htmlFor="referral_bonus">Referral Bonus (USDT)</Label>
              <Input
                id="referral_bonus"
                type="number"
                step="0.01"
                value={settings.referral_bonus || ""}
                onChange={(e) => updateSetting("referral_bonus", e.target.value)}
                placeholder="1.00"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>App Store Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="android_app_link">Android App Link</Label>
                <Input
                  id="android_app_link"
                  value={settings.android_app_link || ""}
                  onChange={(e) => updateSetting("android_app_link", e.target.value)}
                  placeholder="https://play.google.com/store/apps/..."
                />
              </div>
              
              <div>
                <Label htmlFor="ios_app_link">iOS App Link</Label>
                <Input
                  id="ios_app_link"
                  value={settings.ios_app_link || ""}
                  onChange={(e) => updateSetting("ios_app_link", e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="about_us_content">About Us Content</Label>
              <Textarea
                id="about_us_content"
                value={settings.about_us_content || ""}
                onChange={(e) => updateSetting("about_us_content", e.target.value)}
                placeholder="Enter your company information..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}