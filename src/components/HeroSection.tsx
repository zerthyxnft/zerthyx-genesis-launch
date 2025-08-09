import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, LogIn, Zap, TrendingUp } from "lucide-react";
import heroEarth from "@/assets/hero-earth.jpg";
import zerthyxLogo from "/lovable-uploads/f217c0ea-c71e-41f0-8c43-5386375820b6.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen animated-bg network-grid flex items-center justify-center overflow-hidden">
      {/* Animated Earth Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <img 
          src={heroEarth} 
          alt="Rotating Earth" 
          className="w-full h-full object-cover"
          style={{
            animation: "rotate-earth 30s linear infinite"
          }}
        />
      </div>

      {/* Pulse Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 border border-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] border border-primary/20 rounded-full" 
             style={{animation: "pulse-ring 4s infinite 1s"}}></div>
        <div className="absolute w-[600px] h-[600px] border border-primary/10 rounded-full" 
             style={{animation: "pulse-ring 4s infinite 2s"}}></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 text-center">
        {/* Logo */}
        <div className="mb-8 floating">
          <img 
            src={zerthyxLogo} 
            alt="Zerthyx Logo" 
            className="w-24 h-24 mx-auto cyber-glow rounded-full"
          />
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-glow">
          <span className="text-highlight">Zerthyx</span>
        </h1>
        
        <p className="text-lg mb-2 text-foreground/90">
          Next Generation <span className="text-highlight">NFT & Mining</span> Platform
        </p>
        
        <p className="text-sm mb-8 text-muted-foreground">
          Powerful token that can compete with Bitcoin, Ethereum, Solana
          <span className="text-highlight font-semibold"> ZTYX Token</span>
        </p>

        {/* Power Stats */}
        <Card className="glass-card p-4 mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-highlight text-xl font-bold">28$</div>
              <div className="text-muted-foreground">ZTYX Price</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 text-xl font-bold flex items-center justify-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +600%
              </div>
              <div className="text-muted-foreground">24h Growth</div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button className="btn-cyber w-full">
            <Download className="w-5 h-5 mr-2" />
            Download App
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full glass-card border-primary/50 hover:bg-primary/10"
            onClick={() => window.location.href = '/auth'}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Login Now
          </Button>
        </div>

        {/* Power Indicator */}
        <div className="mt-8 flex items-center justify-center text-sm text-muted-foreground">
          <Zap className="w-4 h-4 mr-2 text-primary" />
          More Powerful than Bitcoin
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
