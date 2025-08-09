import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  LogIn, 
  Smartphone, 
  Shield, 
  Mail, 
  Phone,
  MessageCircle,
  Globe
} from "lucide-react";

const FooterSection = () => {
  return (
    <section className="py-20 px-6 animated-bg">
      <div className="max-w-md mx-auto">
        {/* Final CTA */}
        <Card className="glass-card p-8 text-center mb-12 cyber-glow">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Smartphone className="w-4 h-4 mr-2" />
            Mobile App Available
          </Badge>
          
          <h2 className="text-2xl font-bold mb-4">
            start now <span className="text-highlight">ZTYX</span> Mining
          </h2>
          
          <p className="text-muted-foreground mb-6 text-sm">
            App download
          </p>

          <div className="space-y-4 mb-6">
            <Button className="btn-cyber w-full text-lg py-6">
              <Download className="w-5 h-5 mr-2" />
              Mobile App Download
            </Button>
            
            <Button variant="outline" className="w-full glass-card border-primary/50 hover:bg-primary/10 py-4">
              <LogIn className="w-5 h-5 mr-2" />
              Create Account - FREE
            </Button>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Shield className="w-4 h-4 mr-2 text-green-400" />
            100% Secure & Verified Platform
          </div>
        </Card>

        {/* Contact & Support */}
        <Card className="glass-card p-6 mb-8">
          <h3 className="text-lg font-bold mb-4 text-center text-highlight">
            24/7 Support Available
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-primary" />
              <span className="text-muted-foreground">support@zerthyx.com</span>
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-primary" />
              <span className="text-muted-foreground"></span>
            </div>
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-2 text-primary" />
              <span className="text-muted-foreground">Live Chat</span>
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2 text-primary" />
              <span className="text-muted-foreground">Global Support</span>
            </div>
          </div>
        </Card>

        {/* Legal Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>© 2024 Zerthyx. All Rights Reserved.</p>
          <p>
            Cryptocurrency trading involves risk. Past performance does not guarantee future results.
          </p>
          <div className="flex justify-center space-x-4 mt-4">
            <span className="hover:text-primary cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer">Terms of Service</span>
            <span className="hover:text-primary cursor-pointer">Risk Disclosure</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FooterSection;
