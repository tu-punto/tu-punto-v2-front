import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  badge: string;
  accentClassName: string;
  children: ReactNode;
  panelLabel: string;
  panelTitle: string;
  panelDescription: string;
  highlights: { title: string; value: string }[];
  images?: { src: string; alt: string }[];
};

export default function AuthShell({
  title,
  subtitle,
  badge,
  accentClassName,
  children,
  panelLabel,
  panelTitle,
  panelDescription,
  highlights,
  images = [],
}: AuthShellProps) {
  return (
    <div className={`min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8 ${accentClassName}`}>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative z-10">
            {images.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {images.map((image) => (
                  <div
                    key={image.src}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-black/10"
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-32 w-full object-cover sm:h-40"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              {badge}
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/8 p-4 shadow-lg shadow-black/10">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/55">{item.title}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-10 rounded-[1.75rem] border border-white/10 bg-black/15 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-white/55">{panelLabel}</div>
            <div className="mt-2 text-2xl font-bold text-white">{panelTitle}</div>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">{panelDescription}</p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-12">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
