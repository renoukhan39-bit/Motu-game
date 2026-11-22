import React from 'react';
import type { HudSnapshot } from '../game/types';
import { BazaarTitleEmblem, RunnerPortrait, SamosaIcon } from './SvgAssets';

interface TitleOverlayProps {
  bestScore: number;
  onStart: () => void;
}

export function TitleOverlay({ bestScore, onStart }: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-10">
      {/* Asymmetric Left-Third Composition over Calm Negative Space */}
      <div className="max-w-[420px] flex flex-col items-start gap-4 pt-1 sm:pt-4">
        <BazaarTitleEmblem className="w-full max-w-[380px] h-auto" />

        {/* Compact Duo Legend */}
        <div
          className="flex flex-wrap items-center gap-3.5 px-3.5 py-2 rounded-xl border border-[#e8a838]/70 text-xs text-[#f7dec0]"
          style={{
            backgroundColor: 'rgba(38, 18, 9, 0.86)',
            boxShadow: '0 4px 12px rgba(20, 8, 3, 0.35)',
          }}
        >
          <div className="flex items-center gap-2">
            <RunnerPortrait runner="motu" className="w-7 h-7" />
            <span>
              <strong className="text-[#fff6dc]">Motu</strong> · Samosa Smash
            </span>
          </div>
          <span className="text-[#e8a838]/60" aria-hidden="true">·</span>
          <div className="flex items-center gap-2">
            <RunnerPortrait runner="patlu" className="w-7 h-7" />
            <span>
              <strong className="text-[#fff6dc]">Patlu</strong> · Double Jump
            </span>
          </div>
        </div>

        {/* Primary Action CTA with mandatory data-start="true" */}
        <div className="pointer-events-auto flex items-center gap-4 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-7 py-3.5 rounded-xl border-2 border-[#261006] font-display font-extrabold text-lg text-[#261006] bg-[#f5be18] hover:bg-[#ffd03d] active:scale-95 transition-transform duration-150 cursor-pointer whitespace-nowrap"
            style={{ boxShadow: '0 6px 0 #8a440a, 0 10px 22px rgba(24, 10, 4, 0.5)' }}
          >
            Start Chase
          </button>

          {bestScore > 0 && (
            <div
              className="px-3.5 py-2 rounded-xl border border-[#e8a838]/70 text-left"
              style={{ backgroundColor: 'rgba(38, 18, 9, 0.86)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">
                Best Score
              </div>
              <div className="font-mono-num font-bold text-lg text-[#ffd23f]">
                {bestScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Single Flat Borderless Control Hint in Bottom Safe Margin */}
      <div className="w-full flex justify-center sm:justify-start">
        <p
          className="text-xs sm:text-sm font-semibold text-[#fff7e6] tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(20, 8, 3, 0.95), 0 0 2px rgba(20, 8, 3, 0.95)' }}
        >
          A/D Move · Space Jump · S Slide · Q Switch Duo · E Samosa Power · Esc Pause
        </p>
      </div>
    </div>
  );
}

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({ hud, onResume, onRestart, onTitle }: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(22, 10, 5, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div
        className="w-full max-w-[380px] rounded-2xl border-2 border-[#e8a838] p-6 text-center"
        style={{
          backgroundColor: 'rgba(42, 22, 12, 0.96)',
          boxShadow: '0 16px 40px rgba(10, 4, 2, 0.65)',
        }}
      >
        <h2
          id="pause-title"
          className="font-display font-extrabold text-3xl text-[#fff6dc] tracking-tight"
        >
          Chai Break
        </h2>
        <p className="text-sm text-[#f3cfa0] mt-1">Chase paused at {hud.distance}m</p>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="rounded-xl p-3 border border-[#6e4220]" style={{ backgroundColor: '#261309' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#f3cfa0]">Score</div>
            <div className="font-mono-num font-bold text-xl text-[#fff6dc] mt-0.5">{hud.score}</div>
          </div>
          <div className="rounded-xl p-3 border border-[#6e4220]" style={{ backgroundColor: '#261309' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#f3cfa0]">Samosas</div>
            <div className="font-mono-num font-bold text-xl text-[#ffd23f] mt-0.5">{hud.samosas}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
            className="w-full py-3 rounded-xl border-2 border-[#261006] bg-[#f5be18] hover:bg-[#ffd03d] font-display font-extrabold text-base text-[#261006] cursor-pointer transition-transform active:scale-95"
          >
            Resume Chase
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="py-2.5 rounded-xl border border-[#e8a838] bg-[#3b1f10] hover:bg-[#4e2a16] font-display font-bold text-sm text-[#fff6dc] cursor-pointer"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onTitle();
              }}
              className="py-2.5 rounded-xl border border-[#8c5a30] bg-[#2a150b] hover:bg-[#3b1f10] font-display font-bold text-sm text-[#f3cfa0] cursor-pointer"
            >
              Title
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OutcomeModalProps {
  hud: HudSnapshot;
  isVictory: boolean;
  onRestart: () => void;
  onTitle: () => void;
}

export function OutcomeModal({ hud, isVictory, onRestart, onTitle }: OutcomeModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(22, 10, 5, 0.76)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-title"
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border-2 border-[#e8a838] p-6 text-center"
        style={{
          backgroundColor: 'rgba(42, 22, 12, 0.97)',
          boxShadow: '0 18px 44px rgba(10, 4, 2, 0.7)',
        }}
      >
        <div className="flex justify-center mb-2">
          <SamosaIcon className="w-12 h-12" />
        </div>

        <h2
          id="outcome-title"
          className="font-display font-extrabold text-3xl text-[#fff6dc] tracking-tight"
        >
          {isVictory ? 'John Caught!' : 'Out of Chai!'}
        </h2>
        <p className="text-sm text-[#f3cfa0] mt-1">
          {isVictory
            ? 'Furfuri Nagar celebrates—Chaiwala’s samosas are safe!'
            : `Reached ${hud.distance}m of ${hud.targetDistance}m through Furfuri Bazaar.`}
        </p>

        {/* Outcome Stat Tiles (Tabular Numerals) */}
        <div className="grid grid-cols-3 gap-2.5 my-5">
          <div className="rounded-xl p-3 border border-[#6e4220]" style={{ backgroundColor: '#261309' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">Score</div>
            <div className="font-mono-num font-bold text-lg text-[#fff6dc] mt-0.5">{hud.score}</div>
          </div>
          <div className="rounded-xl p-3 border border-[#6e4220]" style={{ backgroundColor: '#261309' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">Samosas</div>
            <div className="font-mono-num font-bold text-lg text-[#ffd23f] mt-0.5">{hud.samosas}</div>
          </div>
          <div className="rounded-xl p-3 border border-[#6e4220]" style={{ backgroundColor: '#261309' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#f3cfa0]">
              {isVictory ? 'Smashed' : 'Distance'}
            </div>
            <div className="font-mono-num font-bold text-lg text-[#ff944d] mt-0.5">
              {isVictory ? hud.goonsSmashed : `${hud.distance}m`}
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold text-[#ffd23f] mb-5 font-mono-num">
          {hud.isNewBest ? `New Best Score: ${hud.bestScore}` : `Best Score: ${hud.bestScore}`}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-full py-3 rounded-xl border-2 border-[#261006] bg-[#f5be18] hover:bg-[#ffd03d] font-display font-extrabold text-base text-[#261006] cursor-pointer transition-transform active:scale-95"
          >
            {isVictory ? 'Play Again' : 'Try Again'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onTitle();
            }}
            className="w-full py-2.5 rounded-xl border border-[#8c5a30] bg-[#2a150b] hover:bg-[#3b1f10] font-display font-bold text-sm text-[#f3cfa0] cursor-pointer"
          >
            Back to Title
          </button>
        </div>
      </div>
    </div>
  );
}
