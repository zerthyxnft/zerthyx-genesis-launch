import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Coins, 
  Pickaxe, 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe,
  Timer,
  Award
} from "lucide-react";
import miningRig from "@/assets/mining-rig.jpg";
import ztyxTokens from "@/assets/ztyx-tokens.jpg";

const FeaturesSection = () => {
  const features = [
    {
      icon: <Coins className="w-8 h-8 text-primary" />,
      title: "Zerthyx NFTs",
      description: "World's Most Valuable NFT Collection",
      highlight: "₹200B Value",
      image: ztyxTokens
    },
    {
      icon: <Pickaxe className="w-8 h-8 text-primary" />,
      title: "ZTYX Mining",
      description: "24/7 Automated Mining System",
      highlight: "Daily Income",
      image: miningRig
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      title: "Market Performance",
      description: "Token that will surpass any crypto",
      highlight: "+600% Growth",
      stats: [
        { label: "BTC", value: "+156%", color: "text-orange-400" },
        { label: "ETH", value: "+234%", color: "text-blue-400" },
        { label: "SOL", value: "+567%", color: "text-purple-400" },
        { label: "ZTYX", value: "+600%", color: "text-green-400" }
      ]
    }
  ];

  const powerFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Quantum Security",
      description: "Military-grade blockchain protection"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Speed",
      description: "1M+ transactions per second"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Network",
      description: "195+ countries supported"
    },
    {
      icon: <Timer className="w-6 h-6" />,
      title: "24/7 Mining",
      description: "Non-stop passive income"
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Award className="w-4 h-4 mr-2" />
            Premium Features
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            Power of <span className="text-highlight">ZTYX</span>
          </h2>
          <p className="text-muted-foreground">
            Unlimited Earning with Future Technology
          </p>
        </div>

        {/* Main Features */}
        <div className="space-y-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="glass-card p-6 hover:scale-105 transition-all duration-300">
              {feature.image && (
                <div className="relative mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="cyber-glow p-3 rounded-lg bg-primary/10">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-highlight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {feature.description}
                  </p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {feature.highlight}
                  </Badge>
                  
                  {feature.stats && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {feature.stats.map((stat, idx) => (
                        <div key={idx} className="text-center p-2 bg-background/50 rounded">
                          <div className="text-sm text-muted-foreground">{stat.label}</div>
                          <div className={`font-bold ${stat.color}`}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Power Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          {powerFeatures.map((feature, index) => (
            <Card key={index} className="glass-card p-4 text-center hover:cyber-glow transition-all duration-300">
              <div className="cyber-glow p-2 rounded-lg bg-primary/10 inline-flex mb-3">
                {feature.icon}
              </div>
              <h4 className="font-semibold mb-2 text-sm">{feature.title}</h4>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
