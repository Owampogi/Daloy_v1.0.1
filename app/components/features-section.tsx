import { Bot, Inbox, BarChart3, Workflow, ShieldCheck, Globe2 } from "lucide-react";

const features = [
  { icon: Bot, title: "AI Assistant", desc: "Drafts replies, summarizes conversations, and recommends next steps in your tone of voice." },
  { icon: Inbox, title: "Unified Inbox", desc: "Messenger, Viber, Instagram, SMS and email — every conversation in one clean view." },
  { icon: Workflow, title: "Smart Pipelines", desc: "Visual lead stages that move automatically as your team takes action." },
  { icon: BarChart3, title: "Real-time Insights", desc: "Know your response time, conversion rate, and revenue at a glance." },
  { icon: ShieldCheck, title: "Built for trust", desc: "Bank-grade security, role-based access, and audit trails for every action." },
  { icon: Globe2, title: "Made for PH SMEs", desc: "Tagalog-aware AI, local payment links, and pricing that fits Philippine businesses." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-[#6DDFF5]">Features</span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              An intelligent lead-flow platform.
            </h2>
            <p className="mt-4 text-lg text-white/75">
              DALOY does the busywork so your team can focus on what matters — closing more business.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="group bg-white/95 p-6 transition-colors hover:bg-white">
                <f.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
