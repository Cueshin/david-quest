import { ControlsLegend } from '@/components/game/controls-legend'
import { GameShell } from '@/components/game/game-shell'

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 bg-background px-3 py-4 text-foreground md:gap-6 md:py-8">
      <header className="flex w-full max-w-6xl flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">С днём рождения</p>
          <h1 className="font-display text-2xl md:text-4xl">
            Давид: <span className="text-primary">Легенда 7-Eleven</span>
          </h1>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground md:text-right">
          Россия → 경기기계공고 → Универ → 7-Eleven. Пройди весь путь и забери поздравление в конце.
        </p>
      </header>
      <GameShell />
      <ControlsLegend />
    </main>
  )
}
