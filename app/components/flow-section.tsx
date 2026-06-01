import { MessageSquare, Zap, Filter, Bell, CalendarCheck, HeartHandshake } from "lucide-react";

const stages = [
  { icon: MessageSquare, title: "Inquiry", desc: "Capture leads from every channel — Messenger, Viber, Instagram, web forms." },
  { icon: Zap, title: "Response", desc: "AI replies instantly with the right context, day or night." },
  { icon: Filter, title: "Qualification", desc: "Score and route leads automatically based on intent and fit." },
  { icon: Bell, title: "Follow-up", desc: "Smart nudges and reminders so nothing slips through the cracks." },
  { icon: CalendarCheck, title: "Appointment", desc: "Book meetings or visits without back-and-forth messaging." },
  { icon: HeartHandshake, title: "Customer", desc: "Convert and nurture into long-term, repeat buyers." },
];

export function FlowSection() {
  return (
    <section id="flow" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#6DDFF5]">The Lead Flow</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            One System. The Whole Journey.
          </h2>
          <p className="mt-4 text-lg text-white/75">
            From the first message to a loyal customer — DALOY orchestrates every step of your sales motion.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-white/10 bg-white/95 p-6 transition-all hover:-translate-y-0.5 hover:border-[#6DDFF5]/40"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
