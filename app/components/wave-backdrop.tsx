type WaveBackdropProps = {
  variant?: "hero" | "section";
};

export function WaveBackdrop({ variant = "hero" }: WaveBackdropProps) {
  const isHero = variant === "hero";

  return (
    <div aria-hidden className="wave-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute rounded-full blur-3xl ${
          isHero ? "left-[8%] top-[8%] h-64 w-64 opacity-40" : "left-[12%] top-[10%] h-48 w-48 opacity-35"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgb(255 214 165 / 0.42) 0%, rgb(255 214 165 / 0.12) 40%, transparent 72%)",
        }}
      />

      <svg
        viewBox="0 0 1440 540"
        className={`absolute right-[-8%] top-[-6%] h-[78%] w-[72%] ${isHero ? "opacity-70" : "opacity-70"}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="daloy-wave-stroke" x1="1040" y1="40" x2="1440" y2="420" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6DDFF5" stopOpacity="0.05" />
            <stop offset="0.45" stopColor="#3FA8FF" stopOpacity="0.20" />
            <stop offset="1" stopColor="#1F6FE5" stopOpacity="0.58" />
          </linearGradient>
          <radialGradient id="daloy-splash" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1190 160) rotate(136) scale(220 160)">
            <stop stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="0.32" stopColor="#A8F1FF" stopOpacity="0.11" />
            <stop offset="1" stopColor="#1F6FE5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M1230 18C1295 78 1370 136 1438 182"
          stroke="url(#daloy-wave-stroke)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M1175 54C1260 126 1345 194 1440 254"
          stroke="url(#daloy-wave-stroke)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M1116 96C1208 170 1304 244 1440 320"
          stroke="url(#daloy-wave-stroke)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M1048 138C1145 220 1268 304 1440 398"
          stroke="url(#daloy-wave-stroke)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.42"
        />
        <circle cx="1218" cy="150" r="120" fill="url(#daloy-splash)" />
      </svg>

      <svg
        viewBox="0 0 1440 180"
        className={`absolute bottom-0 left-0 h-[28%] w-full ${isHero ? "opacity-100" : "opacity-75"}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="daloy-bottom-line" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6DDFF5" stopOpacity="0" />
            <stop offset="0.24" stopColor="#6DDFF5" stopOpacity="0.45" />
            <stop offset="0.6" stopColor="#3FA8FF" stopOpacity="0.25" />
            <stop offset="1" stopColor="#1F6FE5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-20 118C150 76 250 156 410 118C580 76 682 156 848 118C1005 81 1126 154 1460 108" stroke="url(#daloy-bottom-line)" strokeWidth="1.4" opacity="0.8" />
        <path d="M-20 132C145 94 262 170 420 132C590 94 706 170 862 132C1018 95 1142 167 1460 122" stroke="url(#daloy-bottom-line)" strokeWidth="1.1" opacity="0.55" />
        <path d="M-20 146C156 113 272 180 430 146C600 114 714 180 870 146C1030 113 1148 176 1460 136" stroke="url(#daloy-bottom-line)" strokeWidth="1" opacity="0.35" />
        <path d="M-20 160C165 131 286 190 442 160C612 131 726 190 880 160C1048 131 1164 185 1460 150" stroke="url(#daloy-bottom-line)" strokeWidth="0.9" opacity="0.22" />
      </svg>
    </div>
  );
}
