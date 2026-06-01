import { MailX, Clock, BellOff, EyeOff, CalendarX } from "lucide-react";

const problems = [
  { icon: MailX, title: "Missed inquiries", desc: "Messages from Messenger, Viber, and IG get buried before anyone replies." },
  { icon: Clock, title: "Slow response times", desc: "Hot leads cool down while your team is busy with everything else." },
  { icon: BellOff, title: "No follow-up", desc: "Prospects who said 'I'll think about it' are quietly forgotten." },
  { icon: EyeOff, title: "No visibility into leads", desc: "You can't tell which deals are moving and which are stuck." },
  { icon: CalendarX, title: "Lost appointments", desc: "No-shows and missed bookings cost you revenue every week." },
];

export function ProblemsSection() {
  return (
    <section id="problems" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">The problem</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Why Philippine SMEs lose leads.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most teams aren't losing because of bad product — they're losing because the flow breaks somewhere between inquiry and close.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/10"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}