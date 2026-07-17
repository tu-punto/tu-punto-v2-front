import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  badge: string;
  accentClassName: string;
  children: ReactNode;
  highlights: { title: string; value: string }[];
  heroImage: string;
  heroImageAlt: string;
  heroImageClassName?: string;
  highlightsPlacement?: "below" | "hero";
};

export default function AuthShell({
  title,
  subtitle,
  badge,
  accentClassName,
  children,
  highlights,
  heroImage,
  heroImageAlt,
  heroImageClassName = "object-cover",
  highlightsPlacement = "below",
}: AuthShellProps) {
  const hasHighlights = highlights.length > 0;
  const renderHighlights = (className = "") => (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${className}`}>
      {highlights.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-white/15 bg-white/12 p-2 shadow-lg shadow-black/10 backdrop-blur-md sm:rounded-2xl sm:p-4"
        >
          <div className="text-lg font-black leading-none text-sky-300 sm:text-3xl">{item.value}</div>
          <div className="mt-1 text-[10px] font-medium leading-tight text-white/72 sm:mt-3 sm:text-sm">{item.title}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`flex min-h-screen items-center justify-center bg-slate-950 px-3 py-3 text-white sm:px-6 sm:py-6 lg:px-8 ${accentClassName}`}>
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative flex flex-col justify-between gap-5 overflow-hidden p-3 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="h-[190px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 shadow-[0_24px_60px_rgba(2,6,23,0.25)] sm:h-[260px] sm:rounded-[2rem] lg:flex lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="relative isolate min-h-full flex-1">
                <img
                  src={heroImage}
                  alt={heroImageAlt}
                  className={`absolute inset-0 h-full w-full ${heroImageClassName}`}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.72))]" />
                <div className="absolute inset-x-0 top-0 p-4 sm:p-6 lg:p-8">
                  <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/85">
                    {badge}
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
                  {title && (
                    <h1 className="max-w-xl text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base lg:text-lg">
                      {subtitle}
                    </p>
                  )}
                  {hasHighlights && highlightsPlacement === "hero" && renderHighlights("mt-4 max-w-2xl sm:mt-5")}
                </div>
              </div>
            </div>

            {hasHighlights && highlightsPlacement === "below" && renderHighlights("mt-4")}
          </div>
        </section>

        <section className="flex items-start justify-center bg-slate-50 px-4 py-3 text-slate-900 sm:px-8 sm:py-5 lg:items-center lg:px-12 lg:py-10">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
