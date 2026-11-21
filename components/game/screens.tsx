'use client'

import { Home, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { BIRTHDAY } from '@/lib/game/config'
import type { GameInfo } from '@/lib/game/engine'
import { LEVELS } from '@/lib/game/levels'

function Backdrop({ children, dim = true }: { children: ReactNode; dim?: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-4 ${dim ? 'bg-black/65 backdrop-blur-[2px]' : ''}`}
    >
      {children}
    </div>
  )
}

function Stats({ info }: { info: GameInfo }) {
  const minutes = Math.floor(info.time / 60)
  const seconds = Math.floor(info.time % 60)
  const items = [
    { label: 'Счёт', value: info.score.toLocaleString('ru-RU') },
    { label: 'Побеждено', value: info.kills },
    { label: 'Макс. комбо', value: info.maxCombo },
    { label: 'Время', value: `${minutes}:${String(seconds).padStart(2, '0')}` },
  ]
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card/80 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</dt>
          <dd className="font-display text-lg text-primary">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TitleScreen({ onStart }: { onStart: (level: number) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/70 via-black/40 to-black/80 p-4 text-center sm:gap-5">
      <p className="rounded-full border border-primary/60 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-primary sm:text-xs">
        С днём рождения
      </p>
      <h2 className="font-display text-5xl leading-none text-white drop-shadow-[0_4px_0_#000] sm:text-7xl md:text-8xl">
        ДАВИД
      </h2>
      <p className="font-display text-lg text-primary drop-shadow-[0_2px_0_#000] sm:text-2xl">Легенда 7-Eleven</p>
      <Button
        size="lg"
        className="h-12 gap-2 px-8 font-display text-lg shadow-[0_4px_0_#7a5f00]"
        onClick={() => onStart(0)}
      >
        <Play className="size-5" />
        Начать игру
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Выбор уровня">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onStart(i)}
            className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:text-sm"
          >
            {l.number}. {l.title}
          </button>
        ))}
      </div>
      <p className="hidden text-xs text-white/60 sm:block">Нажми Enter, чтобы начать</p>
    </div>
  )
}

export function IntroCard({ level }: { level: number }) {
  const l = LEVELS[level]
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="animate-in fade-in zoom-in-95 flex max-w-lg flex-col items-center gap-2 rounded-2xl border-2 border-primary bg-black/80 px-6 py-5 text-center shadow-[0_6px_0_#000] duration-300">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">
          Уровень {l.number} · {l.place}
        </p>
        <h2 className="font-display text-4xl text-white sm:text-5xl">{l.title}</h2>
        <p className="text-pretty text-sm text-white/80 sm:text-base">{l.subtitle}</p>
      </div>
    </div>
  )
}

export function PauseScreen({ onResume, onMenu }: { onResume: () => void; onMenu: () => void }) {
  return (
    <Backdrop>
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-5xl text-white">Пауза</h2>
        <div className="flex gap-2">
          <Button size="lg" className="gap-2 font-display" onClick={onResume}>
            <Play className="size-4" />
            Продолжить
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={onMenu}>
            <Home className="size-4" />В меню
          </Button>
        </div>
      </div>
    </Backdrop>
  )
}

export function GameOverScreen({ info, onRetry, onMenu }: { info: GameInfo; onRetry: () => void; onMenu: () => void }) {
  const l = LEVELS[info.level]
  return (
    <Backdrop>
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h2 className="font-display text-6xl text-secondary drop-shadow-[0_4px_0_#000] sm:text-7xl">K.O.</h2>
        <p className="text-pretty text-white/85">{l.gameOverLine}</p>
        <div className="flex gap-2">
          <Button size="lg" className="gap-2 font-display" onClick={onRetry}>
            <RotateCcw className="size-4" />
            Ещё раз
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={onMenu}>
            <Home className="size-4" />В меню
          </Button>
        </div>
      </div>
    </Backdrop>
  )
}

export function LevelCompleteScreen({ info, onNext }: { info: GameInfo; onNext: () => void }) {
  const done = LEVELS[info.level]
  const next = LEVELS[info.level + 1]
  return (
    <Backdrop>
      <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">{done.title} пройден</p>
        <h2 className="font-display text-4xl text-white sm:text-6xl">Уровень пройден!</h2>
        <Stats info={info} />
        {next && (
          <Button size="lg" className="h-12 gap-2 px-6 font-display text-base" onClick={onNext}>
            <SkipForward className="size-5" />
            Дальше: {next.title}
          </Button>
        )}
      </div>
    </Backdrop>
  )
}

export function VictoryScreen({ info, onReplay }: { info: GameInfo; onReplay: () => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/30 via-black/60 to-black/85 p-4">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-3 text-center sm:gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Игра пройдена</p>
        <h2 className="text-balance font-display text-4xl leading-tight text-white drop-shadow-[0_4px_0_#000] sm:text-6xl">
          С днём рождения, <span className="text-primary">{BIRTHDAY.name}!</span>
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-white/90 sm:text-base">{BIRTHDAY.message}</p>
        <p className="font-display text-sm text-primary">— {BIRTHDAY.from}</p>
        <Stats info={info} />
        <Button size="lg" className="gap-2 font-display" onClick={onReplay}>
          <RotateCcw className="size-4" />
          Сыграть снова
        </Button>
      </div>
    </div>
  )
}
