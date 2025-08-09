import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle } from "lucide-react";
import indianReview1 from "@/assets/review-indian-1.jpg";
import americanReview1 from "@/assets/review-american-1.jpg";

const ReviewsSection = () => {
  const reviews = [
    {
      name: "Raj Kumar Sharma",
      location: "Mumbai, India",
      image: indianReview1,
      rating: 5,
      review: "I had invested 10000 usdt in NFT of this website and I am withdrawing 450 usdt daily.",
      earnings: "₹2,50,000/month"
    },
    {
      name: "Michael Johnson",
      location: "New York, USA",
      image: americanReview1,
      rating: 5,
      review: "Incredible platform! ZTYX token performance is phenomenal. Made $15,000 in first month. The NFT collection is worth every penny. Best investment of 2024!",
      earnings: "$15,000/month"
    },
    {
      name: "Priya Singh",
      location: "Delhi, India",
      rating: 4,
      review: "I have invested 12000 usdt on nft and now they have also started their mining, I am happy, I have got a very good platform",
      earnings: "₹1,50,000/month"
    },
    {
      name: "David Chen",
      location: "Singapore",
      rating: 5,
      review: "Revolutionary technology! The automated mining system works flawlessly. ZTYX has outperformed all major cryptocurrencies. Zerthyx team delivers excellence.",
      earnings: "$12,000/month"
    },
    {
      name: "Amit Patel", 
      location: "Ahmedabad, India",
      rating: 5,
      review: "Zerthyx NFTs value is constantly increasing. ZTYX token gave me financial freedom. Best crypto investment platform in India!",
      earnings: "₹3,00,000/month"
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
      />
    ));
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-muted/10 to-background">
      <div className="max-w-md mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <MessageCircle className="w-4 h-4 mr-2" />
            Customer Reviews
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            <span className="text-highlight">User</span> Success Stories
          </h2>
          <p className="text-muted-foreground">
            Real Users, Real Profits, Real Success Stories
          </p>
        </div>

        {/* Reviews */}
        <div className="space-y-6 mb-8">
          {reviews.map((review, index) => (
            <Card key={index} className="glass-card p-6 hover:scale-105 transition-all duration-300">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                {review.image ? (
                  <img 
                    src={review.image} 
                    alt={review.name}
                    className="w-12 h-12 rounded-full object-cover cyber-glow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                    {review.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{review.name}</h4>
                  <p className="text-xs text-muted-foreground">{review.location}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  {review.earnings}
                </Badge>
              </div>

              {/* Review Text */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                "{review.review}"
              </p>
            </Card>
          ))}
        </div>

        {/* Trust Metrics */}
        <Card className="glass-card p-6 text-center">
          <h3 className="text-lg font-bold mb-4 text-highlight">
            Success Metrics
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-green-400 font-bold text-xl">10,000+</div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold text-xl">4.9★</div>
              <div className="text-muted-foreground">Average Rating</div>
            </div>
            <div>
              <div className="text-primary font-bold text-xl">₹500Cr+</div>
              <div className="text-muted-foreground">Total Earnings</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ReviewsSection;
