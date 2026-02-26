/**
 * WaveBackground (exported as SectionGeometry for backwards compatibility)
 *
 * Renders multi-layer SVG waves with pink/cyan gradients to create a 3D depth
 * effect in empty sections. Three layers at increasing opacity simulate
 * foreground/midground/background planes.
 */
type Variant = "hero" | "howItWorks" | "features" | "cta" | "platforms";

export function SectionGeometry({ variant }: { variant: Variant }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Shared gradient defs — each variant picks them up via fill/stroke references */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="wg-pink-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e10698" stopOpacity="1" />
            <stop offset="100%" stopColor="#14feee" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="wg-cyan-pink" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14feee" stopOpacity="1" />
            <stop offset="100%" stopColor="#e10698" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="wg-pink-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e10698" stopOpacity="1" />
            <stop offset="50%" stopColor="#e10698" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e10698" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wg-cyan-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14feee" stopOpacity="0" />
            <stop offset="50%" stopColor="#14feee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#14feee" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>

      {variant === "hero" && (
        <>
          {/* Back layer — large, low opacity, pink→cyan (static) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,700 C200,580 400,820 700,650 C1000,480 1200,720 1540,560"
              fill="none"
              stroke="url(#wg-pink-cyan)"
              strokeWidth="180"
              strokeLinecap="round"
              opacity="0.025"
            />
          </svg>
          {/* Mid layer — medium opacity, cyan→pink */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,760 C300,640 500,860 800,700 C1050,560 1280,740 1540,620"
              fill="none"
              stroke="url(#wg-cyan-pink)"
              strokeWidth="120"
              strokeLinecap="round"
              opacity="0.04"
            />
          </svg>
          {/* Front layer — highest opacity, tight curve (static) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,800 C250,720 550,880 850,760 C1100,660 1300,780 1540,700"
              fill="none"
              stroke="url(#wg-pink-fade)"
              strokeWidth="70"
              strokeLinecap="round"
              opacity="0.07"
            />
          </svg>
        </>
      )}

      {variant === "howItWorks" && (
        <>
          {/* Back wave — sweeps left to right across the section */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 600"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,200 C200,80 500,340 800,180 C1100,40 1280,300 1540,150"
              fill="none"
              stroke="url(#wg-cyan-pink)"
              strokeWidth="160"
              strokeLinecap="round"
              opacity="0.03"
            />
          </svg>
          {/* Mid wave */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 600"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,300 C250,160 500,420 850,280 C1100,160 1300,380 1540,260"
              fill="none"
              stroke="url(#wg-pink-cyan)"
              strokeWidth="100"
              strokeLinecap="round"
              opacity="0.045"
            />
          </svg>
          {/* Front wave */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 600"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,380 C300,260 600,460 900,340 C1150,240 1320,420 1540,320"
              fill="none"
              stroke="url(#wg-cyan-fade)"
              strokeWidth="60"
              strokeLinecap="round"
              opacity="0.07"
            />
          </svg>
        </>
      )}

      {variant === "features" && (
        <>
          {/* Waves rising from the bottom */}
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 400"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              d="M-100,300 C200,180 500,380 800,240 C1050,120 1280,320 1540,200"
              fill="none"
              stroke="url(#wg-pink-cyan)"
              strokeWidth="180"
              strokeLinecap="round"
              opacity="0.03"
            />
          </svg>
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 400"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              d="M-100,350 C250,230 550,400 850,300 C1100,210 1300,370 1540,280"
              fill="none"
              stroke="url(#wg-cyan-pink)"
              strokeWidth="100"
              strokeLinecap="round"
              opacity="0.05"
            />
          </svg>
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 400"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              d="M-100,390 C300,310 600,400 900,360 C1150,330 1300,400 1540,370"
              fill="none"
              stroke="url(#wg-pink-fade)"
              strokeWidth="55"
              strokeLinecap="round"
              opacity="0.08"
            />
          </svg>
        </>
      )}

      {variant === "cta" && (
        <>
          {/* Dramatic waves filling the CTA area */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-50,150 C100,60 250,220 400,120 C550,30 650,180 850,100"
              fill="none"
              stroke="url(#wg-pink-cyan)"
              strokeWidth="160"
              strokeLinecap="round"
              opacity="0.05"
            />
          </svg>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-50,250 C150,160 300,320 500,220 C650,130 750,280 850,200"
              fill="none"
              stroke="url(#wg-cyan-pink)"
              strokeWidth="100"
              strokeLinecap="round"
              opacity="0.07"
            />
          </svg>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-50,320 C200,260 380,360 550,300 C680,250 760,340 850,290"
              fill="none"
              stroke="url(#wg-pink-fade)"
              strokeWidth="55"
              strokeLinecap="round"
              opacity="0.1"
            />
          </svg>
        </>
      )}

      {variant === "platforms" && (
        <>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 300"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M-100,150 C300,60 600,240 900,120 C1150,20 1320,200 1540,100"
              fill="none"
              stroke="url(#wg-pink-cyan)"
              strokeWidth="100"
              strokeLinecap="round"
              opacity="0.04"
            />
          </svg>
        </>
      )}
    </div>
  );
}

export default SectionGeometry;
