import { ITEM_INFO, ITEM_KINDS } from '@/lib/game/items'

const CONTROLS = [
  { keys: ['A', 'D'], alt: '← →', label: 'Ходить' },
  { keys: ['W'], alt: 'Пробел', label: 'Прыжок' },
  { keys: ['S'], alt: '↓', label: 'Спрыгнуть с платформы' },
  { keys: ['J'], alt: 'Z', label: 'Удар (x3 — комбо)' },
  { keys: ['K'], alt: 'X', label: 'Пинок (в прыжке — с воздуха)' },
  { keys: ['L'], alt: 'C', label: 'Рэп-волна (50 энергии)' },
  { keys: ['Shift'], alt: 'V', label: 'Уворот — неуязвимость на миг' },
  { keys: ['Esc'], alt: 'P', label: 'Пауза' },
]

const PICKUPS = [
  { name: 'Кимбап', effect: '+30 HP' },
  { name: 'Рамён', effect: '+60 HP' },
  { name: 'Энергетик', effect: 'полная энергия' },
  { name: 'Перчатка силы', effect: 'x2 урон на 10 сек' },
]

const SPECIAL_ITEMS = ITEM_KINDS.map((k) => ITEM_INFO[k])

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-border border-b-4 bg-muted px-1.5 py-0.5 font-display text-xs text-foreground">
      {children}
    </kbd>
  )
}

export function ControlsLegend() {
  return (
    <section aria-labelledby="controls-title" className="grid w-full max-w-6xl gap-4 md:grid-cols-[2fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 id="controls-title" className="mb-3 font-display text-lg text-primary">
          Управление
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CONTROLS.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              <span className="flex gap-1">
                {c.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
                <span className="sr-only">или</span>
                <Kbd>{c.alt}</Kbd>
              </span>
              <span className="text-muted-foreground">{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          На телефоне появятся сенсорные кнопки. Удары по летящим предметам отбивают их.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-lg text-primary">Бонусы</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {PICKUPS.map((p) => (
            <li key={p.name} className="flex justify-between gap-2">
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.effect}</span>
            </li>
          ))}
        </ul>
        <h2 className="mb-3 mt-4 font-display text-lg text-primary">Особые предметы</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {SPECIAL_ITEMS.map((p) => (
            <li key={p.name} className="flex flex-col">
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.effect}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
