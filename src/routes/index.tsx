import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/verbo/Logo";
import { Footer } from "@/components/verbo/Footer";
import { Preloader } from "@/components/verbo/Preloader";
import { PhotoPlaceholder } from "@/components/verbo/ui";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verbo Language Solutions — The Language of Global Growth" },
      { name: "description", content: "Premium B2B English training for global teams. Private platform with live sessions, structured curriculum and measurable progress." },
      { property: "og:title", content: "Verbo Language Solutions" },
      { property: "og:description", content: "The Language of Global Growth." },
    ],
  }),
  component: Landing,
});

/** Reveal a group of elements with a staggered fade-up when they enter the viewport. */
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Landing() {
  const cardsRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <>
      <Preloader />
      <div className="font-marketing min-h-screen bg-background">
        {/* Nav */}
        <header className="sticky top-0 z-30 border-b border-[var(--navy-700)]/8 bg-white/75 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-[0_1px_0_rgba(1,48,74,0.04),0_8px_24px_-16px_rgba(1,48,74,0.15)]">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Logo />
            <span className="verbo-spin-ring">
              <Link
                to="/login"
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.96]"
              >
                Sign in
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </Link>
            </span>
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="relative overflow-hidden bg-secondary">
            <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                {/* Left: photo composition */}
                <div
                  className="verbo-fade-up relative mx-auto h-[520px] w-full max-w-[480px]"
                  style={{ animationDelay: "0ms" }}
                >
                  <div
                    className="absolute -left-6 top-8 h-32 w-32 rounded-full bg-[var(--navy-100)]"
                    aria-hidden
                  />
                  <div
                    className="verbo-float absolute bottom-0 right-4 h-[380px] w-[300px] rounded-[2rem] bg-[var(--orange-500)] shadow-elevated"
                    aria-hidden
                  />
                  <div className="verbo-float-delayed absolute left-8 top-6">
                    <PhotoPlaceholder
                      tone="light"
                      className="aspect-[3/4] w-[300px] rotate-[-3deg] shadow-elevated"
                    />
                  </div>
                </div>

                {/* Right: text */}
                <div>
                  <h1
                    className="verbo-fade-up text-5xl font-semibold tracking-tight text-[var(--navy-700)] md:text-6xl"
                    style={{ animationDelay: "80ms", textWrap: "balance" }}
                  >
                    Growth has a language.
                    <span className="text-[var(--orange-500)]"> Speak it.</span>
                  </h1>

                  <p
                    className="verbo-fade-up mt-6 text-lg leading-relaxed text-[var(--navy-700)]/75"
                    style={{ animationDelay: "160ms" }}
                  >
                    Verbo Academy trains executives and global teams to work in English with the
                    confidence their role demands. Real business scenarios, structured practice, and
                    measurable progress — built for the meetings that actually matter.
                  </p>

                  <div
                    className="verbo-fade-up mt-10 flex flex-wrap items-center gap-3"
                    style={{ animationDelay: "240ms" }}
                  >
                    <Link
                      to="/login"
                      className="group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-elevated transition-[transform,box-shadow,opacity] duration-150 ease-out hover:-translate-y-0.5 hover:opacity-95 hover:shadow-floating active:scale-[0.97] active:translate-y-0"
                    >
                      Access your account
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      to="/"
                      hash="how"
                      className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--navy-700)]/15 bg-white px-6 py-3 text-sm font-medium text-[var(--navy-700)] shadow-soft transition-[transform,box-shadow,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-elevated active:scale-[0.97] active:translate-y-0"
                    >
                      How it works
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section id="how" className="relative overflow-hidden bg-secondary">
            <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
              <div className="mb-16 max-w-3xl">
                <h2
                  className="verbo-fade-up text-3xl font-semibold tracking-tight text-[var(--navy-700)] md:text-5xl"
                  style={{ animationDelay: "0ms", textWrap: "balance" }}
                >
                  Built around you, not the other way around.
                </h2>
                <p
                  className="verbo-fade-up mt-5 text-lg leading-relaxed text-[var(--navy-700)]/70"
                  style={{ animationDelay: "80ms" }}
                >
                  A learning experience shaped by how executives actually work — flexible on time,
                  serious on outcomes.
                </p>
              </div>

              <div ref={cardsRef} className="grid gap-6 md:grid-cols-3">
                {/* Card 1 — Navy */}
                <div
                  data-reveal
                  className="verbo-reveal group flex h-full flex-col justify-between rounded-[2rem] card-gradient-navy p-8 text-white shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[6px] hover:shadow-card-hover"
                  style={{ animationDelay: "0ms" }}
                >
                  <div>
                    <PhotoPlaceholder tone="dark" className="aspect-[4/3] w-full" />
                    <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Your schedule
                    </div>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-white">
                      Learning that fits your calendar
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/80">
                      Book sessions when they work for you — before a board meeting, between flights,
                      or on a quiet Sunday. Your materials, your pace, available every day of the year.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--navy-700)] transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Card 2 — Lime */}
                <div
                  data-reveal
                  className="verbo-reveal group flex h-full flex-col justify-between rounded-[2rem] card-gradient-lime p-8 text-[var(--navy-900)] shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[6px] hover:shadow-card-hover"
                  style={{ animationDelay: "70ms" }}
                >
                  <div>
                    <PhotoPlaceholder tone="dark" className="aspect-[4/3] w-full" />
                    <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy-900)]/75">
                      Your progress
                    </div>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-[var(--navy-900)]">
                      Progress you can measure
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--navy-900)]/80">
                      Clear benchmarks, unit-by-unit tracking, and feedback after every session.
                      You see exactly how your fluency evolves — and so does your team.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--navy-900)] transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Card 3 — Orchid */}
                <div
                  data-reveal
                  className="verbo-reveal group flex h-full flex-col justify-between rounded-[2rem] card-gradient-orchid p-8 text-[var(--navy-900)] shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[6px] hover:shadow-card-hover"
                  style={{ animationDelay: "140ms" }}
                >
                  <div>
                    <PhotoPlaceholder tone="dark" className="aspect-[4/3] w-full" />
                    <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy-900)]/75">
                      Your people
                    </div>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-[var(--navy-900)]">
                      Practice with peers at your level
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--navy-900)]/80">
                      Join conversation clubs with professionals facing the same challenges as you.
                      Rehearse the scenarios that matter — pitches, negotiations, difficult calls.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--navy-900)] transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Closing CTA */}
          <section className="relative overflow-hidden bg-white">
            <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:py-28">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--navy-700)] md:text-4xl" style={{ textWrap: "balance" }}>
                Your team is one conversation away from a stronger year.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--navy-700)]/70 md:text-lg">
                Step back into the platform and pick up exactly where you left off — sessions,
                progress, and materials, all in one place.
              </p>
              <div className="mt-10 flex justify-center">
                <Link
                  to="/login"
                  className="group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-accent-foreground shadow-elevated transition-[transform,box-shadow,opacity] duration-150 ease-out hover:-translate-y-0.5 hover:opacity-95 hover:shadow-floating active:scale-[0.97] active:translate-y-0"
                >
                  Access your account
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <Footer />

        </main>
      </div>
    </>
  );
}
