'use client'

import { Maximize, Pause, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { notoKr, rubik, russo } from '@/app/fonts'
import { Game, type Action, type GameInfo, type GameMode } from '@/lib/game/engine'
import {
  DifficultyScreen,
  GameOverScreen,
  IntroCard,
  LevelCompleteScreen,
  PauseScreen,
  TitleScreen,
  VictoryScreen,
} from './screens'
import { TouchControls } from './touch-controls'

const EMPTY_INFO: GameInfo = { difficulty: 'chocolate', level: 0, score: 0, kills: 0, time: 0, maxCombo: 0 }

export function GameShell() {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [mode, setMode] = useState<GameMode>('title')
  const [info, setInfo] = useState<GameInfo>(EMPTY_INFO)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas, {
      displayFont: `${russo.style.fontFamily}, ${notoKr.style.fontFamily}`,
      bodyFont: `${rubik.style.fontFamily}, ${notoKr.style.fontFamily}`,
      onMode: (m, i) => {
        setMode(m)
        setInfo(i)
      },
    })
    gameRef.current = game
    game.start()
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [])

  const game = () => gameRef.current
  const press = (a: Action) => game()?.press(a)
  const release = (a: Action) => game()?.release(a)

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    game()?.setMuted(next)
  }

  const fullscreen = () => {
    const el = frameRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.().catch(() => {})
  }

  const inGame = mode === 'playing' || mode === 'intro'

  return (
    <div
      ref={frameRef}
      className="relative mx-auto aspect-video w-full max-w-[min(72rem,calc((100dvh-7rem)*16/9))] overflow-hidden rounded-xl border-2 border-primary/70 bg-black shadow-[0_0_0_4px_#000,0_20px_60px_-10px_rgba(245,197,24,0.25)] [&:fullscreen]:max-w-none [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
    >
      <canvas
        ref={canvasRef}
        className="block size-full"
        role="img"
        aria-label="Игровое поле: Давид сражается с врагами"
      />

      {mode === 'title' && <TitleScreen onStart={(i) => game()?.openDifficulty(i)} />}
      {mode === 'difficulty' && (
        <DifficultyScreen
          level={info.level}
          onPick={(d) => game()?.startGame(info.level, d)}
          onBack={() => game()?.toMenu()}
        />
      )}
      {mode === 'intro' && <IntroCard level={info.level} />}
      {mode === 'paused' && <PauseScreen onResume={() => game()?.togglePause()} onMenu={() => game()?.toMenu()} />}
      {mode === 'gameover' && (
        <GameOverScreen info={info} onRetry={() => game()?.retry()} onMenu={() => game()?.toMenu()} />
      )}
      {mode === 'levelComplete' && <LevelCompleteScreen info={info} onNext={() => game()?.nextLevel()} />}
      {mode === 'victory' && <VictoryScreen info={info} onReplay={() => game()?.toMenu()} />}

      {inGame && <TouchControls onPress={press} onRelease={release} />}

      <div className="absolute right-2 top-[18%] flex flex-col gap-1.5 sm:top-[19%]">
        {inGame && (
          <button
            type="button"
            onClick={() => game()?.togglePause()}
            aria-label="Пауза"
            className="flex size-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white hover:text-primary"
          >
            <Pause className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          aria-pressed={muted}
          className="flex size-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white hover:text-primary"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          onClick={fullscreen}
          aria-label="Во весь экран"
          className="flex size-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white hover:text-primary"
        >
          <Maximize className="size-4" />
        </button>
      </div>
    </div>
  )
}
