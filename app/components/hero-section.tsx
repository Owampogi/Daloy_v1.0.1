import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { WaveBackdrop } from "~/components/wave-backdrop";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,22,51,0.98) 0%, rgba(7,29,68,0.96) 55%, rgba(11,40,87,0.98) 100%)",
        }}
      />
      <WaveBackdrop variant="hero" />
      <div aria-hidden className="wave-glow -z-10 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(255 214 165 / 0.18), transparent)" }}
      />

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/85 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered Lead Flow OS - built for Philippine SMEs
          </div>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
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
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/82 drop-shadow-[0_1px_1px_rgba(4,22,51,0.25)]">
            Capture, qualify, follow up, and convert leads automatically so no customer falls through the cracks.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="group btn-primary h-12 px-6 hover:shadow-lg"
            >
              Book a FREE Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#flow"
              className="btn-secondary h-12 px-6"
            >
              <PlayCircle className="h-4 w-4 text-accent" />
              Watch Demo
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required - 14-day trial - Cancel anytime
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.03),transparent_40%)]"
      />
    </section>
  );
}
