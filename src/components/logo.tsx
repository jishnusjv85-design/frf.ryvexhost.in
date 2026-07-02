export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="FRF Developers logo"
    >
      <defs>
        <linearGradient id="frfGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#frfGrad)" />
      {/* Speed dashes (the F strokes of the mark) */}
      <path d="M9 15.5h15" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M7 23.5h11" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M12.5 31.5h5.5" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      {/* R monogram */}
      <path d="M25.5 11.5V38" stroke="white" strokeWidth="3.6" strokeLinecap="round" />
      <path
        d="M25.5 13h5.6c5.5 0 9.4 3.6 9.4 8.6s-3.9 8.6-9.4 8.6h-5.4"
        stroke="white"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path d="M31.5 30.5 40 39" stroke="white" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
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
      </div>
    </div>
  );
}
