import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-svh grid place-items-center bg-[#070708] text-bone px-5 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(225,6,0,0.14),transparent_70%)]" />
      <span aria-hidden className="absolute font-display font-semibold text-[38vw] leading-none tracking-[-0.06em] text-white/[0.03] select-none">404</span>
      <div className="relative text-center max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#FF5A3C]/90">Off the racing line</p>
        <h1 className="mt-4 font-display font-semibold tracking-[-0.05em] text-5xl sm:text-6xl leading-[0.95]">
          <span className="gloss-text-static">This page </span><span className="font-serif-i gloss-red">isn&apos;t on the course.</span>
        </h1>
        <p className="mt-5 text-bone/55 text-[15px] leading-relaxed">The link may be old or mistyped. While you&apos;re here, the B-26 is warmed up.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/?play=1" className="btn-gloss rounded-full px-6 py-3.5 text-sm font-semibold text-white">Take the B-26 for a spin</Link>
          <Link href="/" className="btn-glass rounded-full px-6 py-3.5 text-sm text-bone">Back to the site</Link>
        </div>
      </div>
    </main>
  );
}
