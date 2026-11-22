import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { OutcomeModal, PauseModal, TitleOverlay } from './components/GameModals';
import { SoundEngine } from './game/audio';
import { MAX_HEARTS, SAMOSA_CHARGE_MAX, SAMOSA_POWER_DURATION, TARGET_DISTANCE } from './game/engine';
import { FurfuriGameScene } from './game/scene';
import type { HudSnapshot } from './game/types';

const BEST_SCORE_STORAGE_KEY = 'samosa_rush_best_score_v1';

function readStoredBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeStoredBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(Math.round(score)));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function hasAutoStartQuery(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<FurfuriGameScene | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);

  const initialBest = readStoredBestScore();
  const autoStart = hasAutoStartQuery();

  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>({
    phase: autoStart ? 'playing' : 'title',
    runner: 'motu',
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    lastDamagedHeart: -1,
    score: 0,
    bestScore: initialBest,
    distance: 0,
    targetDistance: TARGET_DISTANCE,
    samosas: 0,
    samosaCharge: 0,
    samosaChargeMax: SAMOSA_CHARGE_MAX,
    powerActive: false,
    powerRemaining: 0,
    powerDuration: SAMOSA_POWER_DURATION,
    combo: 0,
    goonsSmashed: 0,
    johnActive: false,
    johnStrikes: 0,
    johnMaxStrikes: 3,
    speedKmh: 36,
    invulnerable: false,
    isNewBest: false,
    elapsedSec: 0,
  });

  // Mirror game state to document.body.dataset.state ('title' | 'playing' | 'paused' | 'gameover')
  useEffect(() => {
    const bodyState =
      hud.phase === 'victory' || hud.phase === 'gameover'
        ? 'gameover'
        : hud.phase === 'ko_beat'
          ? 'playing'
          : hud.phase;
    document.body.dataset.state = bodyState;
  }, [hud.phase]);

  // Mount Three.js scene ONCE in isolated ref container so HUD re-renders never tear down WebGL
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const sound = new SoundEngine();
    soundRef.current = sound;

    const gameScene = new FurfuriGameScene(
      container,
      sound,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onBestScoreChange: (best) => {
          writeStoredBestScore(best);
        },
      },
      readStoredBestScore(),
      hasAutoStartQuery(),
    );
    sceneRef.current = gameScene;

    const onMuteKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const nextMuted = sound.toggleMute();
        setMuted(nextMuted);
      }
    };
    window.addEventListener('keydown', onMuteKey);

    return () => {
      window.removeEventListener('keydown', onMuteKey);
      gameScene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    // Immediate synchronous state flip at t=0ms for crisp title-to-start handshake
    document.body.dataset.state = 'playing';
    sceneRef.current?.startGame();
  }, []);

  const handleTogglePause = useCallback(() => {
    sceneRef.current?.togglePause();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    sceneRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!soundRef.current) return;
    setMuted(soundRef.current.toggleMute());
  }, []);

  const handleSwitchRunner = useCallback(() => {
    sceneRef.current?.triggerAction('switch');
  }, []);

  const handleActivatePower = useCallback(() => {
    sceneRef.current?.triggerAction('power');
  }, []);

  const handleTouchAction = useCallback(
    (action: 'left' | 'right' | 'jump' | 'slide') => {
      sceneRef.current?.triggerAction(action);
    },
    [],
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#26160e]">
      {/* Isolated WebGL Mount Container (never re-rendered by HUD state changes) */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {/* Game Shell Overlays */}
      {hud.phase === 'title' && (
        <TitleOverlay bestScore={hud.bestScore} onStart={handleStart} />
      )}

      {(hud.phase === 'playing' || hud.phase === 'ko_beat') && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleStart}
          onSwitchRunner={handleSwitchRunner}
          onActivatePower={handleActivatePower}
          onTouchAction={handleTouchAction}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={handleTogglePause}
          onRestart={handleStart}
          onTitle={handleReturnToTitle}
        />
      )}

      {(hud.phase === 'victory' || hud.phase === 'gameover') && (
        <OutcomeModal
          hud={hud}
          isVictory={hud.phase === 'victory'}
          onRestart={handleStart}
          onTitle={handleReturnToTitle}
        />
      )}
    </main>
  );
}
