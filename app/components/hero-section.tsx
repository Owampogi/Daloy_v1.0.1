import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Link } from "react-router";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        // style={{ background: "var(--gradient-soft)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        // style={{ background: "radial-gradient(closest-side, oklch(0.68 0.15 162 / 0.35), transparent)" }}
      />

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered Lead Flow OS — built for Philippine SMEs
          </div>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Keep Every Opportunity{" "}
            <span className="inline-block">
              {"MOVING.".split("").map((letter, i) => (
                <span
                  key={i}
                  className="inline-block animate-wave bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "var(--gradient-accent)",
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Capture, qualify, follow up, and convert leads automatically so no customer falls through the cracks.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary-hover hover:shadow-lg"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              Book a FREE Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#flow"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-semibold text-foreground transition-all hover:border-foreground/20 hover:bg-secondary"
            >
              <PlayCircle className="h-4 w-4 text-accent" />
              Watch Demo
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · 14-day trial · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}   