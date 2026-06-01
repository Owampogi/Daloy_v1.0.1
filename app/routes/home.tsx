import { HeroSection } from "~/components/hero-section";
import { ProblemsSection } from "~/components/problem-section";
import { FlowSection } from "~/components/flow-section";
import { FeaturesSection } from "~/components/features-section";
import { PricingSection } from "~/components/pricing-section";
import { Navbar } from "~/components/nav-menu";
import { ChatbotWidget } from "~/components/chatbot-widget";
// Add as you build them:

// import { StatsSection } from "~/components/stats-section";
// import { TestimonialsSection } from "~/components/testimonials-section";
// import { CtaSection } from "~/components/cta-section";
// import { FooterSection } from "~/components/footer-section";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <ProblemsSection />
      <FlowSection />
      <FeaturesSection />
      <PricingSection />
      {/* <StatsSection /> */}
      {/* <TestimonialsSection /> */}
      {/* <CtaSection /> */}
      {/* <FooterSection /> */}
      <ChatbotWidget />
    </main>
  );
}