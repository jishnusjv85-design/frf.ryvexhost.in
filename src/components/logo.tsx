export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="FRF Developers logo"
      className={`rounded-xl object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function LogoFull({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={40} />
      <div className="leading-tight">
        <div className={`text-[15px] font-bold tracking-wide ${light ? "text-white" : "text-slate-900 dark:text-white"}`}>
          FRF DEVELOPERS
        </div>
        <div className={`text-[10.5px] font-medium tracking-[0.22em] ${light ? "text-blue-200/80" : "text-blue-600/80 dark:text-blue-300/70"}`}>
          CONSTRUCTION ERP
        </div>
        <div className="text-[8.5px] font-bold tracking-[0.16em] uppercase mt-0.5">
          <span className={light ? "text-slate-300/90" : "text-slate-900/90 dark:text-slate-300/90"}>by </span>
          <span className="text-emerald-500 dark:text-emerald-400">RyvexHost</span>
        </div>
      </div>
    </div>
  );
}
