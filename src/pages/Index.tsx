import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SponsorsSection from "@/components/SponsorsSection";
import ReviewsSection from "@/components/ReviewsSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <SponsorsSection />
      <ReviewsSection />
      <FooterSection />
    </div>
  );
};

export default Index;
