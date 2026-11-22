export type Difficulty = 'white' | 'chocolate' | 'black'

export interface DifficultyDef {
  id: Difficulty
  name: string
  blurb: string
  points: string[]
  swatch: string
  enemyHp: number
  enemyDmg: number
  enemySpeed: number
  cooldown: number
  playerHp: number
  drop: number
  score: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  white: {
    id: 'white',
    name: 'Белый',
    blurb: 'Для разогрева. Боссы почти не кусаются.',
    points: ['Враги слабее и медленнее', 'Больше еды с врагов', 'HP x1.3'],
    swatch: '#f4f4f4',
    enemyHp: 0.7,
    enemyDmg: 0.6,
    enemySpeed: 0.9,
    cooldown: 1.3,
    playerHp: 1.3,
    drop: 1.8,
    score: 0.8,
  },
  chocolate: {
    id: 'chocolate',
    name: 'Шоколадный',
    blurb: 'Классика. Как задумано.',
    points: ['Обычные враги', 'Обычная еда', 'HP x1'],
    swatch: '#6b3a1e',
    enemyHp: 1,
    enemyDmg: 1,
    enemySpeed: 1,
    cooldown: 1,
    playerHp: 1,
    drop: 1,
    score: 1,
  },
  black: {
    id: 'black',
    name: 'Чёрный',
    blurb: 'Для легенд. Уворот — твой лучший друг.',
    points: ['Враги жирнее, быстрее и злее', 'Еды почти нет', 'HP x0.8, очки x1.5'],
    swatch: '#0b0b0b',
    enemyHp: 1.35,
    enemyDmg: 1.4,
    enemySpeed: 1.12,
    cooldown: 0.75,
    playerHp: 0.8,
    drop: 0.6,
    score: 1.5,
  },
}

export const DIFFICULTY_LIST: DifficultyDef[] = [DIFFICULTIES.white, DIFFICULTIES.chocolate, DIFFICULTIES.black]
