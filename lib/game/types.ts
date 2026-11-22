export type Facing = 1 | -1

export type HairStyle = 'short' | 'buzz' | 'spiky' | 'long' | 'perm' | 'bald' | 'side'

export type Accessory =
  | 'chain'
  | 'cap'
  | 'hood'
  | 'flatcap'
  | 'visor'
  | 'glasses'
  | 'tie'
  | 'stripes'
  | 'redface'
  | 'mustache'
  | 'bottle'
  | 'book'
  | 'wrench'
  | 'phone'
  | 'leather'
  | 'blazer'
  | 'plaid'
  | 'supreme'
  | 'beard'
  | 'doppi'
  | 'shortsleeve'

export interface Look {
  slim?: number
  wide?: number
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  trim: string
  pants: string
  shoes: string
  acc: Accessory[]
}

export type Behavior = 'melee' | 'ranged' | 'boss'

export type ProjectileKind = 'wave' | 'snowball' | 'wrench' | 'book' | 'exam' | 'bottle' | 'coupon' | 'brick' | 'phone'

export type ItemKind = 'iphone' | 'supreme' | 'tagclub' | 'cap'

export type PickupKind = 'kimbap' | 'ramyeon' | 'chicken' | 'energy' | 'glove' | ItemKind

export interface EnemyDef {
  id: string
  name: string
  look: Look
  hp: number
  speed: number
  damage: number
  range: number
  scale: number
  behavior: Behavior
  projectile?: ProjectileKind
  lines: string[]
  score: number
}

export interface Platform {
  x: number
  y: number
  w: number
}

export interface Wave {
  x: number
  enemies: string[]
  boss?: boolean
}

export interface PickupSpawn {
  x: number
  y: number
  kind: PickupKind
}

export type AmbientKind = 'snow' | 'petals' | 'leaves' | 'none'

export interface LevelDef {
  id: string
  number: number
  title: string
  place: string
  subtitle: string
  gameOverLine: string
  bg: string
  length: number
  ground: string
  groundLine: string
  groundEdge: string
  platformTop: string
  platformSide: string
  ambient: AmbientKind
  platforms: Platform[]
  waves: Wave[]
  pickups: PickupSpawn[]
  bossName: string
}
