import React from 'react';
import type { HudSnapshot } from '../game/types';
import {
  PauseIcon,
  RestartIcon,
  RunnerPortrait,
  SamosaIcon,
  SoundIcon,
  VitalityHeartIcon,
} from './SvgAssets';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onSwitchRunner: () => void;
  onActivatePower: () => void;
  onTouchAction: (action: 'left' | 'right' | 'jump' | 'slide') => void;
}

export function GameHud({
  hud,
  muted,
  onToggleMute,
  onTogglePause,
  onRestart,
  onSwitchRunner,
  onActivatePower,
  onTouchAction,
}: GameHudProps) {
  const powerPct = hud.powerActive
    ? Math.max(0, Math.min(100, (hud.powerRemaining / hud.powerDuration) * 100))
    : Math.max(0, Math.min(100, (hud.samosaCharge / hud.samosaChargeMax) * 100));
  const powerReady = !hud.powerActive && hud.samosaCharge >= hud.samosaChargeMax;
  const distPct = Math.max(0, Math.min(100, (hud.distance / hud.targetDistance) * 100));

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5"
      aria-live="polite"
    >
      {/* Low-HP Subtle Crimson Peripheral Vignette */}
      {hud.hearts === 1 && hud.phase === 'playing' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 85px rgba(217, 43, 34, 0.55)',
          }}
          aria-hidden="true"
        />
      )}

      {/* TOP PERIMETER ROW */}
      <div className="flex items-start justify-between gap-3">
        {/* TOP-LEFT CLUSTER: Vitality Sockets + Duo Switcher */}
        <div className="flex flex-col gap-2 items-start">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[#e8a838]"
            style={{
              backgroundColor: 'rgba(38, 20, 11, 0.88)',
              boxShadow: '0 4px 12px rgba(20, 8, 3, 0.45)',
            }}
          >
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#f3cfa0] mr-0.5">
              HP
            </span>
            <div className="flex items-center gap-1" aria-label={`Health: ${hud.hearts} of ${hud.maxHearts}`}>
              {Array.from({ length: hud.maxHearts }).map((_, idx) => {
                let state: 'full' | 'cracked' | 'empty' = 'empty';
                if (idx < hud.hearts) state = 'full';
                else if (idx === hud.lastDamagedHeart && hud.invulnerable) state = 'cracked';
                return <VitalityHeartIcon key={idx} state={state} className="w-7 h-7 sm:w-8 sm:h-8" />;
              })}
            </div>
          </div>

          {/* Active Duo Control Button (Live mechanics switcher: Motu <-> Patlu) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onSwitchRunner();
            }}
            aria-label={`Switch character. Active: ${hud.runner === 'motu' ? 'Motu' : 'Patlu'}`}
            className="pointer-events-auto flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border-2 border-[#e8a838] transition-transform duration-150 active:scale-95 hover:brightness-110 cursor-pointer"
            style={{
              backgroundColor: 'rgba(38, 20, 11, 0.88)',
              boxShadow: '0 4px 10px rgba(20, 8, 3, 0.4)',
            }}
          >
            <RunnerPortrait runner={hud.runner} className="w-8 h-8 shrink-0" />
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm text-[#fff6dc] whitespace-nowrap">
                  {hud.runner === 'motu' ? 'Motu' : 'Patlu'}
                </span>
                <span className="text-[11px] font-mono-num font-bold text-[#ffd23f] whitespace-nowrap">
                  [Q]
                </span>
              </div>
              <div className="text-[11px] text-[#f3cfa0] whitespace-nowrap">
                {hud.runner === 'motu' ? 'Samosa Smash' : 'Double Jump + Magnet'}
              </div>
            </div>
          </button>
        </div>

        {/* TOP-CENTER: Compact Distance-to-Clocktower Track & Boss Alert */}
        <div className="hidden md:flex flex-col items-center gap-1.5 pt-0.5 min-w-[240px]">
          <div
            className="w-64 px-3 py-1.5 rounded-xl border-2 border-[#e8a838]"
            style={{
              backgroundColor: 'rgba(38, 20, 11, 0.86)',
              boxShadow: '0 4px 10px rgba(20, 8, 3, 0.4)',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-[#f3cfa0] mb-1">
              <span className="uppercase tracking-wider">Clocktower Chase</span>
              <span className="font-mono-num text-[#fff6dc]">
                {hud.distance}m / {hud.targetDistance}m
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden bg-[#1e0f07] border border-[#6e4220]">
              <div
                className="h-full transition-transform duration-150 origin-left"
                style={{
                  width: '100%',
                  transform: `scaleX(${distPct / 100})`,
                  backgroundColor: '#f2b705',
                }}
              />
            </div>
          </div>

          {hud.johnActive && (
            <div
              className="px-3 py-1 rounded-lg border border-[#ff6b4a] text-xs font-display font-bold text-[#fff4dc] whitespace-nowrap"
              style={{ backgroundColor: 'rgba(148, 26, 18, 0.92)' }}
            >
              John the Don Ahead · Hits {hud.johnStrikes}/{hud.johnMaxStrikes}
            </div>
          )}
        </div>

        {/* TOP-RIGHT CLUSTER: Hero Score, Samosas & Utility Controls */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2">
            {/* Score & Samosa Readout */}
            <div
              className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border-2 border-[#e8a838]"
              style={{
                backgroundColor: 'rgba(38, 20, 11, 0.88)',
                boxShadow: '0 4px 12px rgba(20, 8, 3, 0.45)',
              }}
            >
              <div className="text-right leading-none">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">
                  Score
                </div>
                <div
                  className="font-mono-num font-bold text-lg sm:text-2xl text-[#fff6dc] hud-stroke-sm"
                  data-testid="hud-score"
                >
                  {hud.score}
                </div>
              </div>

              <div className="h-6 sm:h-7 w-px bg-[#6e4220]" aria-hidden="true" />

              <div className="flex items-center gap-1 sm:gap-1.5">
                <SamosaIcon className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
                <div className="leading-none">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">
                    Samosas
                  </div>
                  <div
                    className="font-mono-num font-bold text-base sm:text-xl text-[#ffd23f] hud-stroke-sm"
                    data-testid="hud-samosas"
                  >
                    {hud.samosas}
                  </div>
                </div>
              </div>
            </div>

            {/* Utility Square Icon Buttons: Mute [M], Pause [P], Restart [R] */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                title="Mute [M]"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-[#e8a838] flex items-center justify-center transition-transform duration-150 active:scale-95 hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
              >
                <SoundIcon muted={muted} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTogglePause();
                }}
                aria-label="Pause game (P)"
                title="Pause [P]"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-[#e8a838] flex items-center justify-center transition-transform duration-150 active:scale-95 hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
              >
                <PauseIcon />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestart();
                }}
                aria-label="Restart chase (R)"
                title="Restart [R]"
                className="hidden sm:flex w-10 h-10 rounded-xl border-2 border-[#e8a838] items-center justify-center transition-transform duration-150 active:scale-95 hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
              >
                <RestartIcon />
              </button>
            </div>
          </div>

          {hud.combo >= 3 && (
            <div className="font-display font-extrabold text-sm sm:text-base text-[#ffd23f] hud-stroke-sm pr-1">
              {hud.combo}x Samosa Combo!
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM PERIMETER: Compact Samosa Power Bar + Mobile Touch Controls */}
      <div className="flex flex-col items-center gap-2.5">
        {/* Compact Samosa Power Gauge / Trigger */}
        <button
          type="button"
          tabIndex={-1}
          disabled={!powerReady}
          onClick={(e) => {
            e.currentTarget.blur();
            onActivatePower();
          }}
          aria-label={
            hud.powerActive
              ? `Samosa Power active: ${hud.powerRemaining.toFixed(1)} seconds left`
              : powerReady
                ? 'Activate Samosa Power (E)'
                : `Samosa Power charge: ${hud.samosaCharge} of ${hud.samosaChargeMax}`
          }
          className={`pointer-events-auto w-full max-w-[320px] px-3.5 py-2 rounded-xl border-2 transition-transform duration-150 ${
            powerReady
              ? 'border-[#ffe169] cursor-pointer hover:scale-[1.02] active:scale-95'
              : hud.powerActive
                ? 'border-[#ff9419] cursor-default'
                : 'border-[#9c6330] cursor-default'
          }`}
          style={{
            backgroundColor: hud.powerActive
              ? 'rgba(156, 46, 12, 0.92)'
              : powerReady
                ? 'rgba(176, 84, 14, 0.94)'
                : 'rgba(38, 20, 11, 0.86)',
            boxShadow: '0 4px 12px rgba(20, 8, 3, 0.45)',
          }}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="font-display tracking-wide text-[#fff6dc] whitespace-nowrap">
              {hud.powerActive
                ? 'SAMOSA POWER ACTIVE!'
                : powerReady
                  ? 'PRESS [E] · SAMOSA POWER!'
                  : 'Samosa Power'}
            </span>
            <span className="font-mono-num text-[#ffd23f] whitespace-nowrap">
              {hud.powerActive
                ? `${hud.powerRemaining.toFixed(1)}s`
                : `${hud.samosaCharge}/${hud.samosaChargeMax}`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#1e0f07] border border-[#6e4220]">
            <div
              className="h-full origin-left transition-transform duration-100"
              style={{
                width: '100%',
                transform: `scaleX(${powerPct / 100})`,
                backgroundColor: hud.powerActive
                  ? '#ff7b1c'
                  : powerReady
                    ? '#ffe042'
                    : '#f0a224',
              }}
            />
          </div>
        </button>

        {/* Mobile Touch Controls (shown only on small viewports) */}
        <div className="md:hidden pointer-events-auto flex items-center justify-between w-full max-w-[360px] gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTouchAction('left')}
              aria-label="Move Left"
              className="w-12 h-11 rounded-xl border-2 border-[#e8a838] font-display font-bold text-lg text-[#fff6dc] active:scale-95"
              style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onTouchAction('right')}
              aria-label="Move Right"
              className="w-12 h-11 rounded-xl border-2 border-[#e8a838] font-display font-bold text-lg text-[#fff6dc] active:scale-95"
              style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTouchAction('slide')}
              aria-label="Slide"
              className="px-3.5 h-11 rounded-xl border-2 border-[#e8a838] font-display font-bold text-xs text-[#fff6dc] active:scale-95"
              style={{ backgroundColor: 'rgba(38, 20, 11, 0.88)' }}
            >
              Slide
            </button>
            <button
              type="button"
              onClick={() => onTouchAction('jump')}
              aria-label="Jump"
              className="px-4 h-11 rounded-xl border-2 border-[#ffd23f] font-display font-bold text-xs text-[#241006] active:scale-95"
              style={{ backgroundColor: '#f2b705' }}
            >
              Jump
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
