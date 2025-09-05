import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

const SponsorsSection = () => {
  const sponsors = [
    {
      name: "Microsoft",
      logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      partnership: "Cloud Infrastructure Partner"
    },
    {
      name: "NVIDIA",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg",
      partnership: "GPU Mining Technology"
    },
    {
      name: "Amazon Web Services",
      logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
      partnership: "Blockchain Hosting"
    },
    {
      name: "Google",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
      partnership: "AI & Machine Learning"
    },
    {
      name: "Intel",
      logo: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Intel_logo_%282006-2020%29.svg",
      partnership: "Hardware Optimization"
    },
    {
      name: "IBM",
      logo: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
      partnership: "Enterprise Solutions"
    }
  ];

  return (
    <section className="py-16 px-6 bg-muted/10">
      <div className="max-w-md mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-4 h-4 mr-2" />
            Trusted Partners
          </Badge>
          <h2 className="text-2xl font-bold mb-3">
            <span className="text-highlight">Global</span> Partnerships
          </h2>
          <p className="text-sm text-muted-foreground">
            Trust of the world's biggest tech companies
          </p>
        </div>

        {/* Sponsors Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {sponsors.map((sponsor, index) => (
            <Card key={index} className="glass-card p-4 hover:cyber-glow transition-all duration-300">
              <div className="text-center">
                <div className="bg-white/10 rounded-lg p-3 mb-3 h-16 flex items-center justify-center">
                  <img 
                    src={sponsor.logo} 
                    alt={sponsor.name}
                    className="max-h-8 max-w-full object-contain filter brightness-0 invert opacity-80"
                  />
                </div>
                <h4 className="font-semibold text-sm mb-1">{sponsor.name}</h4>
                <p className="text-xs text-primary">{sponsor.partnership}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <Card className="glass-card p-6 text-center">
          <h3 className="text-lg font-bold mb-4 text-highlight">
            Enterprise Grade Security
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-green-400 font-bold text-xl">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-xl">256-bit</div>
              <div className="text-muted-foreground">Encryption</div>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-xl">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default SponsorsSection;
