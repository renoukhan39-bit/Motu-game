import React from 'react';

/**
 * Hand-crafted Indian Bazaar Marquee SVG Title Emblem for "Samosa Rush: Furfuri Chase"
 */
export function BazaarTitleEmblem({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 176"
      className={className}
      role="img"
      aria-label="Samosa Rush: Furfuri Chase"
    >
      <defs>
        <filter id="titleDrop" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#1c0b04" floodOpacity="0.65" />
        </filter>
      </defs>

      {/* Ornate Indian Bazaar Arch Crest Plaque */}
      <g filter="url(#titleDrop)">
        <path
          d="M 28 36 Q 230 4 432 36 L 444 134 Q 230 162 16 134 Z"
          fill="#2d140a"
          stroke="#f3b63a"
          strokeWidth="5"
        />
        <path
          d="M 38 44 Q 230 15 422 44 L 432 125 Q 230 150 28 125 Z"
          fill="#992019"
          stroke="#ffda75"
          strokeWidth="2"
        />
        {/* Marigold Corner Rosettes */}
        <circle cx="48" cy="56" r="7" fill="#ff9419" stroke="#2d140a" strokeWidth="2" />
        <circle cx="412" cy="56" r="7" fill="#ff9419" stroke="#2d140a" strokeWidth="2" />
        <circle cx="42" cy="116" r="6" fill="#ffd23f" stroke="#2d140a" strokeWidth="2" />
        <circle cx="418" cy="116" r="6" fill="#ffd23f" stroke="#2d140a" strokeWidth="2" />

        {/* Crispy Golden Samosa Crest Medallion at Top Center */}
        <g transform="translate(230, 26)">
          <circle r="20" fill="#2d140a" stroke="#f3b63a" strokeWidth="3" />
          <path
            d="M 0 -13 L 13 10 Q 0 13 -13 10 Z"
            fill="#f4a828"
            stroke="#5c2808"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M -6 3 L 4 -4" stroke="#fff0b8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Main Display Wordmark */}
        <text
          x="230"
          y="97"
          textAnchor="middle"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="50"
          letterSpacing="1.5"
          fill="#fff6dc"
          stroke="#261006"
          strokeWidth="7"
          paintOrder="stroke fill"
        >
          SAMOSA RUSH
        </text>

        {/* Lower Subtitle Ribbon */}
        <rect
          x="108"
          y="113"
          width="244"
          height="26"
          rx="4"
          fill="#f2b705"
          stroke="#261006"
          strokeWidth="3"
        />
        <text
          x="230"
          y="131"
          textAnchor="middle"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="14.5"
          letterSpacing="2.2"
          fill="#261006"
        >
          FURFURI NAGAR CHASE
        </text>
      </g>
    </svg>
  );
}

/**
 * 3-State Vitality Socket Icon (Full / Cracked / Empty)
 */
export function VitalityHeartIcon({
  state,
  className = 'w-8 h-8',
}: {
  state: 'full' | 'cracked' | 'empty';
  className?: string;
}) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      {/* Dark outer silhouette socket */}
      <path
        d="M14 24.5 C14 24.5 3.5 17.8 3.5 10.2 C3.5 6.4 6.5 3.5 10 3.5 C12 3.5 13.4 4.5 14 5.8 C14.6 4.5 16 3.5 18 3.5 C21.5 3.5 24.5 6.4 24.5 10.2 C24.5 17.8 14 24.5 14 24.5 Z"
        fill={state === 'full' ? '#e5392e' : state === 'cracked' ? '#7a251c' : '#26140c'}
        stroke="#220e07"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {state === 'full' && (
        <>
          {/* Interior golden rim detail + top glossy highlight */}
          <path
            d="M14 21.8 C14 21.8 6 16.4 6 10.4 C6 7.8 8 5.8 10.2 5.8 C11.8 5.8 13.1 6.7 14 8 C14.9 6.7 16.2 5.8 17.8 5.8 C20 5.8 22 7.8 22 10.4 C22 16.4 14 21.8 14 21.8 Z"
            fill="none"
            stroke="#ff8a75"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <ellipse cx="9.6" cy="9.2" rx="2.2" ry="1.4" transform="rotate(-28 9.6 9.2)" fill="#fff2d6" opacity="0.85" />
        </>
      )}
      {state === 'cracked' && (
        <path
          d="M14 6.5 L12 12 L16 15 L13.2 21.5"
          fill="none"
          stroke="#ffd27d"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {state === 'empty' && (
        <path
          d="M14 21.5 C14 21.5 6.4 16.2 6.4 10.5 C6.4 8 8.2 6.2 10.2 6.2 C11.8 6.2 13.1 7.1 14 8.3 C14.9 7.1 16.2 6.2 17.8 6.2 C19.8 6.2 21.6 8 21.6 10.5 C21.6 16.2 14 21.5 14 21.5 Z"
          fill="none"
          stroke="#593524"
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

/**
 * Crispy Golden Samosa HUD Icon matching the in-world beveled 3D pickup
 */
export function SamosaIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <path
        d="M 14 3.5 L 25 22.5 Q 14 25.5 3 22.5 Z"
        fill="#f0a224"
        stroke="#241006"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M 14 7.5 L 21.5 20.5 Q 14 22.5 6.5 20.5 Z"
        fill="#ffcb47"
      />
      <path d="M 9.5 16 L 16.5 11.5" stroke="#fff4cc" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="18" r="1.4" fill="#c76914" />
      <circle cx="11" cy="19.5" r="1.1" fill="#c76914" />
    </svg>
  );
}

/**
 * Stylized Motu & Patlu Duo Portrait Badges
 */
export function RunnerPortrait({
  runner,
  className = 'w-9 h-9',
}: {
  runner: 'motu' | 'patlu';
  className?: string;
}) {
  if (runner === 'motu') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#c92b24" stroke="#241006" strokeWidth="2.5" />
        {/* Bald jolly head + side hair tufts */}
        <circle cx="18" cy="18" r="10.5" fill="#ebb085" stroke="#241006" strokeWidth="1.8" />
        <ellipse cx="7.5" cy="18" rx="2.5" ry="4" fill="#181313" />
        <ellipse cx="28.5" cy="18" rx="2.5" ry="4" fill="#181313" />
        {/* Eyes */}
        <circle cx="14.5" cy="15.5" r="1.6" fill="#181313" />
        <circle cx="21.5" cy="15.5" r="1.6" fill="#181313" />
        {/* Iconic curled handlebar mustache */}
        <path
          d="M 9 20.5 Q 13 23.5 18 20.5 Q 23 23.5 27 20.5"
          fill="none"
          stroke="#181313"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#ebb923" stroke="#241006" strokeWidth="2.5" />
      {/* Slim head */}
      <ellipse cx="18" cy="18.5" rx="8.5" ry="10.5" fill="#f0ba8e" stroke="#241006" strokeWidth="1.8" />
      {/* Round spectacles */}
      <circle cx="14" cy="17" r="3.6" fill="#ffffff" stroke="#181313" strokeWidth="2" />
      <circle cx="22" cy="17" r="3.6" fill="#ffffff" stroke="#181313" strokeWidth="2" />
      <line x1="17.6" y1="17" x2="18.4" y2="17" stroke="#181313" strokeWidth="2" />
      <circle cx="14.3" cy="17" r="1.2" fill="#181313" />
      <circle cx="22.3" cy="17" r="1.2" fill="#181313" />
      {/* Cheerful smile */}
      <path d="M 15 23 Q 18 25.2 21 23" fill="none" stroke="#5c2810" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Compact Square Utility Button Icons (Sound, Pause, Restart)
 */
export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M4 9.5H8.2L13.5 5V19L8.2 14.5H4V9.5Z"
        fill="#fff3d6"
        stroke="#241006"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M16.5 9L21.5 14M21.5 9L16.5 14" stroke="#ff725c" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <>
          <path d="M16.5 9.2C17.8 10.5 17.8 13.5 16.5 14.8" fill="none" stroke="#ffd24d" strokeWidth="2" strokeLinecap="round" />
          <path d="M19.2 6.8C21.6 9.4 21.6 14.6 19.2 17.2" fill="none" stroke="#ffd24d" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="#fff3d6" stroke="#241006" strokeWidth="1.4" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="#fff3d6" stroke="#241006" strokeWidth="1.4" />
    </svg>
  );
}

export function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M19 12A7 7 0 1 1 16.8 6.9"
        fill="none"
        stroke="#fff3d6"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M17 3.5V8H12.5" fill="none" stroke="#ffd24d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
