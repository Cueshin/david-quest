'use client'

import { ArrowBigUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Action } from '@/lib/game/engine'
import { cn } from '@/lib/utils'

interface TouchControlsProps {
  onPress: (a: Action) => void
  onRelease: (a: Action) => void
}

function Pad({
  action,
  label,
  children,
  className,
  onPress,
  onRelease,
}: TouchControlsProps & { action: Action; label: string; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'pointer-events-auto flex touch-none select-none items-center justify-center rounded-full border-2 border-white/30 bg-black/45 text-white backdrop-blur-sm active:scale-95 active:bg-primary active:text-primary-foreground',
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        onPress(action)
      }}
      onPointerUp={() => onRelease(action)}
      onPointerCancel={() => onRelease(action)}
      onLostPointerCapture={() => onRelease(action)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export function TouchControls(props: TouchControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between p-3 pointer-coarse:flex">
      <div className="flex items-end gap-2">
        <Pad {...props} action="left" label="Влево" className="size-14">
          <ChevronLeft className="size-7" />
        </Pad>
        <div className="flex flex-col gap-2">
          <Pad {...props} action="dodge" label="Уворот" className="size-12 font-display text-[10px] text-emerald-300">
            УВОР
          </Pad>
          <Pad {...props} action="down" label="Спрыгнуть" className="size-11">
            <ChevronDown className="size-5" />
          </Pad>
        </div>
        <Pad {...props} action="right" label="Вправо" className="size-14">
          <ChevronRight className="size-7" />
        </Pad>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pad {...props} action="special" label="Рэп-волна" className="size-12 font-display text-xs text-primary">
          РЭП
        </Pad>
        <Pad {...props} action="jump" label="Прыжок" className="size-12">
          <ArrowBigUp className="size-6" />
        </Pad>
        <Pad {...props} action="kick" label="Пинок" className="size-14 font-display text-sm">
          ПИН
        </Pad>
        <Pad {...props} action="punch" label="Удар" className="size-14 font-display text-sm">
          УДАР
        </Pad>
      </div>
    </div>
  )
}
