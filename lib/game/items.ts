import type { ItemKind } from './types'

export const ITEM_INFO: Record<ItemKind, { name: string; effect: string }> = {
  iphone: { name: 'Айфон Дуо', effect: 'энергия x1.8, рэп-волна за 35' },
  supreme: { name: 'Трусы Supreme', effect: '+30 макс. HP' },
  tagclub: { name: 'Одежда Tag Club', effect: '+25% урона' },
  cap: { name: 'Кепка', effect: '+12% скорости, уворот дольше' },
}

export const ITEM_KINDS = Object.keys(ITEM_INFO) as ItemKind[]

export const isItem = (kind: string): kind is ItemKind => kind in ITEM_INFO
