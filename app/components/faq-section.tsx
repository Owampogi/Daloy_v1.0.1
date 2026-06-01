import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "I already reply to customers. Why would I need Daloy?",
    a: "The real question is: are you replying to every customer, every time?\n\nMany businesses lose sales because inquiries get buried, forgotten, or delayed. Daloy helps make sure every lead gets acknowledged, followed up, and tracked—even when you're busy.",
  },
  {
    q: "We don't get that many inquiries. Is this still worth it?",
    a: "Sometimes missing just a few inquiries a month can mean losing significant revenue.\n\nDaloy helps businesses stay consistent with responses and follow-ups so potential customers don't slip through the cracks.",
  },
  {
    q: "Can't I just hire someone to answer messages?",
    a: "You can, but people get busy, take breaks, forget follow-ups, or work limited hours.\n\nDaloy works 24/7, responds instantly, and supports your team by handling repetitive tasks so they can focus on closing deals and serving customers.",
  },
  {
    q: "My team keeps forgetting to follow up. Can Daloy help with that?",
    a: "Yes.\n\nDaloy can automatically send follow-ups, reminders, and updates based on your workflow so prospects don't go cold simply because someone forgot to reach out.",
  },
  {
    q: "What if customers ask questions the AI doesn't know?",
    a: "No problem.\n\nDaloy can hand the conversation over to a real person whenever needed. The goal isn't to replace human interaction—it's to make sure customers get help faster.",
  },
  {
    q: "We use Facebook Messenger. Do I need to change how we work?",
    a: "No.\n\nDaloy can work alongside the channels you already use. Customers continue messaging you as usual while Daloy helps manage conversations behind the scenes.",
  },
  {
    q: "Is this only for big companies?",
    a: "Not at all.\n\nDaloy is built specifically for growing businesses, clinics, real estate teams, agencies, service providers, and SMEs that want a better way to manage customer inquiries without adding more manual work.",
  },
  {
    q: "How do I know if Daloy is right for my business?",
    a: "If you've ever said:\n\n• \"Ang daming messages, hindi ko na mabantayan.\"\n• \"May mga inquiry pala na hindi namin nareplyan.\"\n• \"Nakalimutan namin mag-follow up.\"\n• \"Sayang yung lead, hindi na bumalik.\"\n\nThen Daloy was built to solve exactly those problems.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="relative overflow-hidden bg-background py-24 px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full opacity-[0.04]"
          style={{ background: "var(--color-accent, #10b981)" , filter: "blur(80px)" }}
        />
        <div
          className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full opacity-[0.04]"
          style={{ background: "var(--color-primary, #09090b)", filter: "blur(80px)" }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            FAQ
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Frequently Asked
            <br />
            <span className="text-muted-foreground">Questions</span>
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`group rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-accent/30 bg-accent/5 shadow-sm"
                    : "border-border bg-background hover:border-border/80 hover:bg-secondary/40"
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
                >
                  <span
                    className={`text-sm font-semibold leading-snug transition-colors sm:text-base ${
                      isOpen ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                      isOpen
                        ? "bg-accent text-white"
                        : "bg-secondary text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 pb-6">
                    <div className="h-px w-full bg-border/60 mb-4" />
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-secondary/40 px-8 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Still have questions?
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            We'd love to help you figure out if Daloy is right for you.
          </p>
          <a
            href="mailto:support@daloy.app"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}