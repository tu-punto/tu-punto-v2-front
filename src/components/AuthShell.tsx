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
}: AuthShellProps) {
  return (
    <div className={`min-h-screen bg-slate-950 px-3 py-3 text-white sm:px-6 sm:py-6 lg:px-8 ${accentClassName}`}>
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative flex flex-col justify-between gap-5 overflow-hidden p-4 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative z-10">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-[0_24px_60px_rgba(2,6,23,0.25)]">
              <div className="relative isolate h-[220px] sm:h-[280px] lg:h-[390px]">
                <img
                  src={heroImage}
                  alt={heroImageAlt}
                  className={`absolute inset-0 h-full w-full ${heroImageClassName}`}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.72))]" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-8">
                  <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/85">
                    {badge}
                  </div>
                  <h1 className="mt-4 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base lg:text-lg">
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/9 p-4 shadow-lg shadow-black/10 backdrop-blur-sm"
                >
                  <div className="text-3xl font-black leading-none text-white">{item.value}</div>
                  <div className="mt-3 text-sm font-medium text-white/72">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-10 lg:px-12">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
