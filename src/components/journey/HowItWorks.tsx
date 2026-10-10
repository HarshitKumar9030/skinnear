import { ScanFace, Wallet, MapPin, type LucideIcon } from "lucide-react";

const features = [
  { title: "Understand your skin.", description: "Visible skin insights, explained simply. A thoughtful starting point for your everyday care.", icon: ScanFace, tone: "lavender" },
  { title: "Stay within budget.", description: "Plan the whole routine, not just one product. Use what you own and explore alternatives.", icon: Wallet, tone: "sage" },
  { title: "Shop closer to home.", description: "Discover regional seller listings. Check stock and delivery directly with the retailer.", icon: MapPin, tone: "rose" },
];

function FeatureCard({ title, description, icon: Icon, tone, index }: { title: string; description: string; icon: LucideIcon; tone: string; index: number }) {
  return <article className={`feature-card ${tone}`}><div className="feature-card-top"><span className="feature-icon"><Icon size={25} strokeWidth={1.7} aria-hidden="true" /></span><span className="feature-index">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></article>;
}

export function HowItWorks() {
  return <section className="how-it-works shell" id="how-it-works">
    <h2>A routine made for real life.</h2>
    <div className="feature-columns">{features.map((feature, index) => <FeatureCard key={feature.title} {...feature} index={index} />)}</div>
  </section>;
}
