export default function Loading() {
  return (
    <div className="min-h-screen bg-carbon-900 text-white flex flex-col items-center justify-center font-mono gap-4 scanlines">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
        <div className="absolute inset-0 border-4 border-torque-orange border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="space-y-1 text-center">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block animate-pulse">
          SCANNING TRANSMISSION BLOCKS...
        </span>
        <span className="text-[9px] text-slate-500 font-normal block">
          Synchronizing vehicle specs & roster registries
        </span>
      </div>
    </div>
  );
}
