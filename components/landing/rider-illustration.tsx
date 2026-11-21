/**
 * Original DOORS hero illustration: a Nigerian delivery rider on a DOORS-red
 * scooter with a branded delivery box, surrounded by floating food and grocery
 * items. Flat, tonal style in DOORS colours. Classes are animation hooks for GSAP
 * (see landing-page.tsx): .speed-line, .bike-body, .bike-wheel-back/.bike-wheel-front,
 * .float-item, .rider-head.
 */
export function RiderIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 480" role="img" aria-labelledby="rider-art-title" className={className}>
      <title id="rider-art-title">A DOORS rider on a red scooter carrying a delivery box, with food and groceries floating around</title>
      <defs>
        <radialGradient id="blob" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FFF4F4" />
          <stop offset="100%" stopColor="#FBD9DA" />
        </radialGradient>
        <linearGradient id="bodyShade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E5242B" />
          <stop offset="100%" stopColor="#C8141B" />
        </linearGradient>
        <clipPath id="headClip"><circle cx="304" cy="166" r="25" /></clipPath>
      </defs>

      {/* Backdrop */}
      <circle cx="292" cy="250" r="214" fill="url(#blob)" />
      <path d="M78 300 C140 270 200 300 250 284" stroke="#F3B5B7" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" fill="none" />
      <ellipse cx="300" cy="446" rx="220" ry="14" fill="#171717" opacity="0.08" />

      {/* Speed lines */}
      <g>
        <rect className="speed-line" x="22" y="318" width="70" height="8" rx="4" fill="#D71920" opacity="0.55" />
        <rect className="speed-line" x="44" y="346" width="52" height="8" rx="4" fill="#171717" opacity="0.25" />
        <rect className="speed-line" x="10" y="374" width="80" height="8" rx="4" fill="#D71920" opacity="0.35" />
      </g>

      <g className="bike-body">
        {/* Wheels */}
        <g className="bike-wheel-back">
          <circle cx="170" cy="396" r="46" fill="#171717" />
          <circle cx="170" cy="396" r="25" fill="#E9E9E9" />
          <circle cx="170" cy="396" r="8" fill="#171717" />
          <rect x="167" y="373" width="6" height="14" rx="3" fill="#9E9E9E" />
          <rect x="167" y="405" width="6" height="14" rx="3" fill="#9E9E9E" />
        </g>
        <g className="bike-wheel-front">
          <circle cx="424" cy="396" r="46" fill="#171717" />
          <circle cx="424" cy="396" r="25" fill="#E9E9E9" />
          <circle cx="424" cy="396" r="8" fill="#171717" />
          <rect x="421" y="373" width="6" height="14" rx="3" fill="#9E9E9E" />
          <rect x="421" y="405" width="6" height="14" rx="3" fill="#9E9E9E" />
        </g>

        {/* Exhaust + rack */}
        <rect x="104" y="372" width="64" height="11" rx="5.5" fill="#A3A3A3" />
        <rect x="100" y="288" width="118" height="9" rx="4.5" fill="#3A3A3A" />

        {/* Delivery box */}
        <g>
          <rect x="92" y="178" width="128" height="112" rx="16" fill="#171717" />
          <rect x="92" y="178" width="128" height="26" rx="13" fill="#2B2B2B" />
          <rect x="92" y="252" width="128" height="10" fill="#D71920" />
          <image href="/brand/doors-mark-white.png" x="125" y="210" width="62" height="45" preserveAspectRatio="xMidYMid meet" />
          <rect x="104" y="268" width="104" height="5" rx="2.5" fill="#FFFFFF" opacity="0.12" />
        </g>

        {/* Scooter body */}
        <path d="M118 378 C104 330 132 300 186 298 L304 298 C324 298 332 314 334 334 L338 378 Z" fill="url(#bodyShade)" />
        <path d="M134 342 C150 318 176 312 210 312" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" fill="none" />
        <rect x="112" y="320" width="16" height="12" rx="4" fill="#7E0B10" />
        <path d="M300 362 L388 362 L396 382 L300 382 Z" fill="#171717" />
        <path d="M376 382 L402 252 C405 238 418 233 428 239 L434 243 L408 384 Z" fill="url(#bodyShade)" />
        <path d="M382 374 C396 344 444 340 468 374 L460 379 C444 357 402 358 392 380 Z" fill="#A50F15" />
        <rect x="414" y="296" width="9" height="98" rx="4.5" transform="rotate(4 418 345)" fill="#3A3A3A" />
        <circle cx="442" cy="236" r="11" fill="#FFF3C4" />
        <circle cx="442" cy="236" r="5" fill="#FFFFFF" />
        <path d="M178 294 C176 282 186 276 202 276 L292 276 C306 276 310 290 302 300 L182 300 Z" fill="#171717" />
        {/* Handlebar */}
        <path d="M424 244 L432 206" stroke="#171717" strokeWidth="8" strokeLinecap="round" />
        <path d="M414 202 L452 208" stroke="#171717" strokeWidth="9" strokeLinecap="round" />

        {/* Rider */}
        <g>
          {/* Leg */}
          <path d="M238 282 L320 292" stroke="#262626" strokeWidth="34" strokeLinecap="round" />
          <path d="M320 292 L340 352" stroke="#262626" strokeWidth="28" strokeLinecap="round" />
          <rect x="326" y="348" width="50" height="18" rx="9" fill="#FFFFFF" />
          <rect x="326" y="360" width="50" height="6" rx="3" fill="#D4D4D4" />
          {/* Torso: jacket */}
          <path d="M220 290 C210 246 230 208 264 200 L286 197 C306 199 312 224 304 250 L294 292 Z" fill="#A50F15" />
          <path d="M254 206 L240 288" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="5" strokeLinecap="round" />
          <path d="M268 200 C276 214 290 214 298 204" stroke="#7E0B10" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Arm */}
          <path d="M288 214 L338 238" stroke="#A50F15" strokeWidth="24" strokeLinecap="round" />
          <path d="M338 238 L408 206" stroke="#C8141B" strokeWidth="20" strokeLinecap="round" />
          <circle cx="412" cy="204" r="12" fill="#FFFFFF" />
          {/* Neck + head */}
          <rect x="292" y="182" width="16" height="22" rx="6" fill="#6B3E22" />
          <g className="rider-head">
            <circle cx="304" cy="166" r="25" fill="#7A4627" />
            <g clipPath="url(#headClip)">
              <ellipse cx="320" cy="180" rx="10" ry="6" fill="#6B3E22" />
            </g>
            <circle cx="318" cy="164" r="2.6" fill="#171717" />
            <path d="M313 176 Q320 180 326 175" stroke="#171717" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            {/* Helmet */}
            <path d="M272 172 A33 33 0 0 1 336 158 L341 166 C330 160 304 160 274 180 Z" fill="#D71920" />
            <path d="M282 150 A26 26 0 0 1 316 136" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M318 147 Q343 148 347 165 L333 166 Q330 156 318 154 Z" fill="#171717" opacity="0.9" />
            <path d="M282 176 L294 190" stroke="#171717" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </g>

      {/* Floating: jollof plate */}
      <g className="float-item">
        <ellipse cx="470" cy="128" rx="46" ry="16" fill="#171717" opacity="0.08" transform="translate(4 10)" />
        <ellipse cx="470" cy="122" rx="46" ry="16" fill="#FFFFFF" />
        <ellipse cx="470" cy="119" rx="34" ry="10" fill="#F1F1F1" />
        <path d="M442 118 C446 96 494 94 498 118 Z" fill="#E4572E" />
        <circle cx="456" cy="108" r="3" fill="#F5A25D" /><circle cx="476" cy="104" r="3" fill="#F5A25D" /><circle cx="486" cy="112" r="3" fill="#F5A25D" />
        <path d="M478 112 C486 92 506 92 506 104 C506 114 492 116 478 112 Z" fill="#8B4513" />
        <circle cx="448" cy="112" r="4" fill="#3FA34D" /><circle cx="464" cy="100" r="3.5" fill="#3FA34D" />
      </g>

      {/* Floating: grocery bag */}
      <g className="float-item">
        <path d="M58 92 L54 70 C54 60 62 56 70 64 L76 86" fill="#3FA34D" />
        <path d="M82 88 L92 50 C94 44 102 46 101 52 L94 90" fill="#F2C14E" />
        <rect x="44" y="86" width="74" height="76" rx="10" fill="#E6B57E" />
        <rect x="44" y="86" width="74" height="14" rx="7" fill="#D39B5D" />
        <rect x="62" y="118" width="38" height="26" rx="6" fill="#D71920" />
        <text x="81" y="136" textAnchor="middle" fontSize="12" fontWeight="800" fill="#FFFFFF" fontFamily="system-ui, sans-serif">D</text>
      </g>

      {/* Floating: location pin */}
      <g className="float-item">
        <path d="M368 60 C368 40 384 28 400 28 C416 28 432 40 432 60 C432 82 400 110 400 110 C400 110 368 82 368 60 Z" fill="#171717" />
        <circle cx="400" cy="58" r="12" fill="#FFFFFF" />
        <circle cx="400" cy="58" r="5" fill="#D71920" />
      </g>

      {/* Floating: drink */}
      <g className="float-item">
        <rect x="512" y="232" width="30" height="52" rx="8" fill="#171717" />
        <rect x="512" y="250" width="30" height="16" fill="#D71920" />
        <rect x="518" y="224" width="18" height="10" rx="3" fill="#9E9E9E" />
      </g>
    </svg>
  )
}
