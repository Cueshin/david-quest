import { GameAudio } from './audio'
import {
  GOLD,
  OUTLINE,
  drawFighter,
  drawHead,
  drawPickup,
  drawProjectile,
  poseFor,
  roundRect,
  type AttackKind,
  type FState,
} from './draw'
import { DIFFICULTIES, type Difficulty } from './difficulty'
import { ITEM_INFO, ITEM_KINDS, isItem } from './items'
import { ENEMY_DEFS, HIT_WORDS, LEVELS, PLAYER_LOOK, RAP_SHOUTS } from './levels'
import type { EnemyDef, Facing, ItemKind, LevelDef, Look, PickupKind, ProjectileKind } from './types'

export const W = 960
export const H = 540
const GROUND = 470
const FLOOR_TOP = 446
const GRAVITY = 2300
const PROJ_G = 900
const DODGE_CD = 0.85

export type GameMode = 'title' | 'difficulty' | 'intro' | 'playing' | 'paused' | 'levelComplete' | 'gameover' | 'victory'
export type Action = 'left' | 'right' | 'jump' | 'down' | 'punch' | 'kick' | 'special' | 'dodge' | 'pause' | 'confirm'

export interface GameInfo {
  difficulty: Difficulty
  level: number
  score: number
  kills: number
  time: number
  maxCombo: number
}

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyJ: 'punch',
  KeyZ: 'punch',
  KeyK: 'kick',
  KeyX: 'kick',
  KeyL: 'special',
  KeyC: 'special',
  ShiftLeft: 'dodge',
  ShiftRight: 'dodge',
  KeyV: 'dodge',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
}

interface Attack {
  kind: AttackKind
  t: number
  dur: number
  hitStart: number
  hitEnd: number
  range: number
  dmg: number
  knock: number
  lift: number
  hits: Set<number>
}

interface Fighter {
  id: number
  isPlayer: boolean
  def: EnemyDef | null
  look: Look
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  scale: number
  facing: Facing
  onGround: boolean
  dropT: number
  hp: number
  maxHp: number
  state: FState
  stateT: number
  attack: Attack | null
  invulnT: number
  flashT: number
  animT: number
  cooldown: number
  bubble: { text: string; t: number } | null
  deadT: number
  entering: boolean
}

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  g: number
  kind: ProjectileKind
  fromPlayer: boolean
  dmg: number
  life: number
  rot: number
  vr: number
  t: number
  hits: Set<number>
}

interface Pickup {
  x: number
  y: number
  vy: number
  kind: PickupKind
  t: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  g: number
  life: number
  max: number
  size: number
  color: string
  kind: 'spark' | 'dust' | 'confetti' | 'note' | 'ring'
  rot: number
  vr: number
}

interface Pop {
  x: number
  y: number
  text: string
  color: string
  size: number
  life: number
  max: number
}

interface Ambient {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const approach = (v: number, target: number, d: number) =>
  v < target ? Math.min(target, v + d) : Math.max(target, v - d)

const PLAYER_SKIN_BY_DIFFICULTY: Record<Difficulty, string> = {
  white: '#f3dfd0',
  chocolate: '#9b6545',
  black: '#493027',
}

const PICKUP_LABEL: Record<PickupKind, string> = {
  kimbap: '+30 HP Кимбап',
  ramyeon: '+60 HP Рамён',
  chicken: '+100 HP Чикин!',
  energy: 'Энергетик! Полная энергия',
  glove: 'Перчатка силы! x2 урон',
  iphone: ITEM_INFO.iphone.name,
  supreme: ITEM_INFO.supreme.name,
  tagclub: ITEM_INFO.tagclub.name,
  cap: ITEM_INFO.cap.name,
}

const CONFETTI = ['#f5c518', '#e23636', '#ffffff', '#2d6cdf', '#2f9e5b', '#ff6fb1']

export interface GameOptions {
  displayFont: string
  bodyFont: string
  onMode: (mode: GameMode, info: GameInfo) => void
}

export class Game {
  readonly audio = new GameAudio()
  mode: GameMode = 'title'
  levelIndex = 0

  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private raf = 0
  private last = 0
  private images: Record<string, HTMLImageElement> = {}
  private held = new Set<Action>()
  private pressed = new Set<Action>()

  private level: LevelDef = LEVELS[0]
  private player: Fighter
  private enemies: Fighter[] = []
  private projectiles: Projectile[] = []
  private pickups: Pickup[] = []
  private particles: Particle[] = []
  private pops: Pop[] = []
  private ambient: Ambient[] = []
  private banner: { title: string; sub: string; t: number } | null = null

  private camX = 0
  private locked = false
  private waveIndex = 0
  private spawnQueue: string[] = []
  private spawnT = 0
  private bossWave = false
  private boss: Fighter | null = null
  private completeT = -1
  private deathT = -1
  private introT = 0
  private shake = 0
  private hitStop = 0
  private nextId = 1
  private energy = 30
  private gloveT = 0
  private combo = 0
  private comboT = 0
  private maxCombo = 0
  private score = 0
  private levelStartScore = 0
  private kills = 0
  private levelStartKills = 0
  private playTime = 0
  private clock = 0
  private punchChain = 0
  private punchChainT = 0
  private punchQueued = false
  private spawnSide = 1
  private difficulty: Difficulty = 'chocolate'
  private items = new Set<ItemKind>()
  private levelStartItems = new Set<ItemKind>()
  private pendingLevel = 0
  private dodgeT = 0
  private dodgeDur = 0.34
  private dodgeCd = 0
  private dodgeDir: Facing = 1
  private dodgePerfect = false
  private ghostT = 0
  private ghosts: { x: number; y: number; facing: Facing; roll: number; life: number }[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: GameOptions,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * this.dpr
    canvas.height = H * this.dpr
    for (const lvl of LEVELS) {
      const img = new Image()
      img.src = lvl.bg
      this.images[lvl.id] = img
    }
    this.player = this.makePlayer()
    this.player.x = W / 2
  }

  start() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.audio.stopMusic()
  }

  press(a: Action) {
    if (!this.held.has(a)) this.pressed.add(a)
    this.held.add(a)
  }

  release(a: Action) {
    this.held.delete(a)
  }

  openDifficulty(levelIndex = 0) {
    this.audio.init()
    this.pendingLevel = levelIndex
    this.setMode('difficulty')
  }

  startGame(levelIndex = 0, difficulty?: Difficulty) {
    this.audio.init()
    if (difficulty) this.difficulty = difficulty
    this.score = 0
    this.kills = 0
    this.playTime = 0
    this.maxCombo = 0
    this.items = new Set()
    for (let j = 0; j < levelIndex; j++) {
      for (const k of LEVELS[j].pickups) if (isItem(k.kind)) this.items.add(k.kind)
    }
    this.loadLevel(levelIndex)
  }

  nextLevel() {
    if (this.levelIndex < LEVELS.length - 1) this.loadLevel(this.levelIndex + 1)
  }

  retry() {
    this.audio.init()
    this.score = this.levelStartScore
    this.kills = this.levelStartKills
    this.items = new Set(this.levelStartItems)
    this.loadLevel(this.levelIndex)
  }

  togglePause() {
    if (this.mode === 'playing') this.setMode('paused')
    else if (this.mode === 'paused') this.setMode('playing')
    else if (this.mode === 'difficulty') this.toMenu()
  }

  toMenu() {
    this.audio.stopMusic()
    this.levelIndex = 0
    this.level = LEVELS[0]
    this.enemies = []
    this.projectiles = []
    this.pickups = []
    this.camX = 0
    this.player = this.makePlayer()
    this.player.x = W / 2
    this.setMode('title')
  }

  setMuted(m: boolean) {
    this.audio.setMuted(m)
  }

  private info(): GameInfo {
    return {
      difficulty: this.difficulty,
      level: this.mode === 'difficulty' ? this.pendingLevel : this.levelIndex,
      score: Math.round(this.score),
      kills: this.kills,
      time: this.playTime,
      maxCombo: this.maxCombo,
    }
  }

  private setMode(m: GameMode) {
    this.mode = m
    this.opts.onMode(m, this.info())
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code]
    if (!a) return
    if (e.target instanceof HTMLElement && e.target.closest('button') && (a === 'confirm' || a === 'jump')) return
    e.preventDefault()
    this.press(a)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code]
    if (a) this.release(a)
  }

  private onBlur = () => {
    this.held.clear()
    if (this.mode === 'playing') this.setMode('paused')
  }

  private playerMaxHp() {
    return Math.round(100 * DIFFICULTIES[this.difficulty].playerHp) + (this.items.has('supreme') ? 30 : 0)
  }

  private specialCost() {
    return this.items.has('iphone') ? 35 : 50
  }

  private eDmg(n: number) {
    return Math.max(1, Math.round(n * DIFFICULTIES[this.difficulty].enemyDmg))
  }

  private makePlayer(): Fighter {
    const maxHp = this.playerMaxHp()
    return {
      id: 0,
      isPlayer: true,
      def: null,
      look: {
        ...PLAYER_LOOK,
        skin: PLAYER_SKIN_BY_DIFFICULTY[this.difficulty],
        ...(this.items.has('tagclub') ? { top: '#c4512f', trim: '#f5c518' } : {}),
      },
      x: 140,
      y: GROUND,
      vx: 0,
      vy: 0,
      w: 20,
      h: 108,
      scale: 1,
      facing: 1,
      onGround: true,
      dropT: 0,
      hp: maxHp,
      maxHp,
      state: 'idle',
      stateT: 0,
      attack: null,
      invulnT: 0,
      flashT: 0,
      animT: 0,
      cooldown: 0,
      bubble: null,
      deadT: 0,
      entering: false,
    }
  }

  private loadLevel(i: number) {
    this.levelIndex = i
    this.level = LEVELS[i]
    this.levelStartScore = this.score
    this.levelStartKills = this.kills
    this.levelStartItems = new Set(this.items)
    this.player = this.makePlayer()
    this.enemies = []
    this.projectiles = []
    this.pickups = this.level.pickups
      .filter((p) => !(isItem(p.kind) && this.items.has(p.kind)))
      .map((p) => ({ x: p.x, y: p.y, vy: 0, kind: p.kind, t: Math.random() * 3 }))
    this.dodgeT = 0
    this.dodgeCd = 0
    this.ghosts = []
    this.particles = []
    this.pops = []
    this.ambient = []
    this.banner = null
    this.camX = 0
    this.locked = false
    this.waveIndex = 0
    this.spawnQueue = []
    this.completeT = -1
    this.deathT = -1
    this.energy = 30
    this.gloveT = 0
    this.combo = 0
    this.comboT = 0
    this.boss = null
    this.punchChain = 0
    this.punchQueued = false
    this.introT = 2.6
    this.audio.startMusic(i)
    this.setMode('intro')
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    this.update(dt)
    this.render()
    this.pressed.clear()
    this.raf = requestAnimationFrame(this.frame)
  }

  private update(dt: number) {
    this.clock += dt
    const pr = this.pressed
    if (pr.has('pause')) this.togglePause()
    if (pr.has('confirm')) {
      if (this.mode === 'title') this.openDifficulty(0)
      else if (this.mode === 'levelComplete') this.nextLevel()
      else if (this.mode === 'gameover') this.retry()
    }
    if (this.mode === 'paused') return

    this.updateAmbient(dt)
    this.updateParticles(dt)
    this.shake = Math.max(0, this.shake - dt * 45)
    if (this.banner) {
      this.banner.t -= dt
      if (this.banner.t <= 0) this.banner = null
    }

    switch (this.mode) {
      case 'title':
      case 'difficulty':
        this.player.animT += dt
        this.player.state = 'idle'
        this.camX = (this.camX + dt * 30) % 3000
        this.player.x = this.camX + W / 2
        break
      case 'intro':
        this.player.animT += dt
        this.introT -= dt
        if (this.introT <= 0 || ((pr.has('punch') || pr.has('confirm')) && this.introT < 2.1)) {
          this.introT = 0
          this.setMode('playing')
        }
        break
      case 'playing':
        this.updateWorld(dt)
        break
      case 'levelComplete':
      case 'victory':
        this.player.animT += dt
        this.player.state = 'dance'
        this.player.attack = null
        this.player.vx = 0
        this.physics(this.player, dt)
        if (this.mode === 'victory' && Math.random() < dt * 30) this.spawnConfetti(1)
        break
      case 'gameover':
        this.physics(this.player, dt)
        for (const e of this.enemies) {
          e.animT += dt
          if (e.state !== 'dead') e.state = 'dance'
          this.physics(e, dt)
        }
        break
    }
  }

  private updateWorld(dt: number) {
    this.playTime += dt
    if (this.hitStop > 0) {
      this.hitStop -= dt
      return
    }
    this.updatePlayer(dt)
    this.updateWaves(dt)
    for (const e of this.enemies) this.updateEnemy(e, dt)
    this.enemies = this.enemies.filter((e) => !(e.state === 'dead' && e.deadT > 1.6))
    this.separate()
    this.updateProjectiles(dt)
    this.updatePickups(dt)
    this.updateCamera(dt)

    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0) this.combo = 0
    }
    if (this.gloveT > 0) this.gloveT -= dt

    if (this.completeT > 0) {
      this.completeT -= dt
      if (this.completeT <= 0) {
        if (this.levelIndex >= LEVELS.length - 1) {
          this.audio.win()
          this.spawnConfetti(120)
          this.setMode('victory')
        } else {
          this.audio.win()
          this.setMode('levelComplete')
        }
      }
    }
    if (this.deathT >= 0) {
      this.deathT += dt
      if (this.deathT > 1.8) {
        this.deathT = -1
        this.setMode('gameover')
      }
    }
  }

  private physics(f: Fighter, dt: number) {
    if (f.dropT > 0) f.dropT -= dt
    f.vy += GRAVITY * dt
    const prevY = f.y
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.onGround = false
    if (f.y >= GROUND) {
      f.y = GROUND
      f.vy = 0
      f.onGround = true
      return
    }
    if (f.vy >= 0 && f.dropT <= 0) {
      for (const p of this.level.platforms) {
        if (prevY <= p.y + 0.5 && f.y >= p.y && f.x > p.x - 4 && f.x < p.x + p.w + 4) {
          f.y = p.y
          f.vy = 0
          f.onGround = true
          return
        }
      }
    }
  }

  private mkAttack(kind: AttackKind, dur: number, hitStart: number, hitEnd: number, range: number, dmg: number, knock: number, lift: number): Attack {
    return { kind, t: 0, dur, hitStart, hitEnd, range, dmg, knock, lift, hits: new Set() }
  }

  private updatePlayer(dt: number) {
    const p = this.player
    p.animT += dt
    p.stateT += dt
    if (p.invulnT > 0) p.invulnT -= dt
    if (p.flashT > 0) p.flashT -= dt
    if (this.punchChainT > 0) this.punchChainT -= dt
    if (this.dodgeCd > 0) this.dodgeCd -= dt
    const pr = this.pressed

    if (p.state === 'dead') {
      if (p.onGround) p.vx = approach(p.vx, 0, 1500 * dt)
      this.physics(p, dt)
      return
    }

    if (p.state === 'hurt') {
      p.vx = approach(p.vx, 0, 1400 * dt)
      if (p.stateT > 0.28) p.state = 'idle'
    } else if (p.state === 'down') {
      if (p.onGround) p.vx = approach(p.vx, 0, 1600 * dt)
      if (p.onGround && p.stateT > 0.8) {
        p.state = 'idle'
        p.invulnT = 1.0
      }
    } else {
      const dir = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0)
      if (pr.has('dodge') && this.dodgeCd <= 0 && this.dodgeT <= 0 && this.completeT < 0) this.startDodge(dir)
      if (this.dodgeT > 0) {
        this.updateDodge(dt)
      } else if (p.attack) {
        const a = p.attack
        a.t += dt
        if (p.onGround && a.kind !== 'airkick') p.vx = approach(p.vx, 0, 2200 * dt)
        if (!p.onGround && a.kind !== 'airkick' && dir) p.vx = dir * 200
        if (a.t >= a.hitStart && a.t <= a.hitEnd) this.playerHits(a)
        if (a.kind === 'airkick' && p.onGround && a.t > 0.06) a.t = a.dur
        if (a.kind === 'punch' && pr.has('punch') && a.t > a.dur * 0.35) this.punchQueued = true
        if (a.t >= a.dur) {
          p.attack = null
          p.state = 'idle'
          if (this.punchQueued) {
            this.punchQueued = false
            this.startPunch()
          }
        }
      } else {
        p.vx = dir * 270 * (this.items.has('cap') ? 1.12 : 1)
        if (dir) p.facing = dir as Facing
        p.state = p.onGround ? (dir ? 'walk' : 'idle') : 'jump'
        if (pr.has('jump') && p.onGround) {
          p.vy = -880
          p.onGround = false
          this.audio.jump()
          this.dust(p.x, p.y, 6)
        }
        if (pr.has('down') && p.onGround && p.y < GROUND - 1) {
          p.dropT = 0.22
          p.y += 2
        }
        if (pr.has('punch')) this.startPunch()
        else if (pr.has('kick')) this.startKick()
        else if (pr.has('special')) this.startSpecial()
      }
    }

    this.physics(p, dt)
    const left = this.camX + p.w
    const right = this.locked ? this.camX + W - p.w : this.level.length - 40
    p.x = clamp(p.x, left, right)
  }

  private startDodge(dir: number) {
    const p = this.player
    this.dodgeDir = (dir !== 0 ? dir : -p.facing) as Facing
    if (dir !== 0) p.facing = dir as Facing
    this.dodgeDur = 0.34 + (this.items.has('cap') ? 0.1 : 0)
    this.dodgeT = this.dodgeDur
    this.dodgeCd = DODGE_CD + this.dodgeDur * 0.5
    this.dodgePerfect = false
    this.ghostT = 0
    p.attack = null
    p.state = 'dodge'
    this.punchQueued = false
    this.audio.whoosh()
    this.dust(p.x, p.y, 6)
  }

  private updateDodge(dt: number) {
    const p = this.player
    this.dodgeT -= dt
    const k = Math.max(0, this.dodgeT / this.dodgeDur)
    p.vx = this.dodgeDir * (240 + 520 * k)
    p.state = 'dodge'
    this.ghostT -= dt
    if (this.ghostT <= 0) {
      this.ghostT = 0.045
      this.ghosts.push({ x: p.x, y: p.y, facing: p.facing, roll: this.rollAngle(), life: 0.28 })
    }
    if (Math.random() < dt * 40) this.dust(p.x, p.y, 1)
    if (this.dodgeT <= 0) {
      this.dodgeT = 0
      p.vx *= 0.4
      p.state = p.onGround ? 'idle' : 'jump'
    }
  }

  private rollAngle() {
    if (this.dodgeT <= 0) return 0
    return (1 - this.dodgeT / this.dodgeDur) * Math.PI * 2 * this.dodgeDir * this.player.facing
  }

  private onDodgedHit() {
    if (this.dodgePerfect) return
    this.dodgePerfect = true
    const p = this.player
    this.pop(p.x, p.y - 140, 'УВОРОТ!', '#7CFC9A', 26)
    this.energy = Math.min(100, this.energy + 15)
    this.score += 25
    this.sparks(p.x, p.y - 60, 8, '#7CFC9A')
  }

  private startPunch() {
    const p = this.player
    if (this.punchChainT > 0 && this.punchChain < 3) this.punchChain++
    else this.punchChain = 1
    this.punchChainT = 0.6
    const third = this.punchChain === 3
    p.attack = third
      ? this.mkAttack('punch3', 0.42, 0.12, 0.22, 58, 14, 380, 420)
      : this.mkAttack('punch', 0.24, 0.06, 0.13, 48, 7, 150, 0)
    if (third) this.punchChain = 0
    p.state = 'attack'
    this.audio.whoosh()
  }

  private startKick() {
    const p = this.player
    if (!p.onGround) {
      p.attack = this.mkAttack('airkick', 0.6, 0.04, 0.58, 50, 12, 320, 220)
      p.vy = Math.max(p.vy, 250)
      p.vx = p.facing * 430
    } else {
      p.attack = this.mkAttack('kick', 0.44, 0.16, 0.27, 70, 13, 330, 0)
    }
    p.state = 'attack'
    this.audio.whoosh()
  }

  private startSpecial() {
    const p = this.player
    const cost = this.specialCost()
    if (this.energy < cost) {
      this.pop(p.x, p.y - 130, 'Мало энергии', '#9aa0a6', 16)
      return
    }
    this.energy -= cost
    p.attack = this.mkAttack('special', 0.45, 9, 9, 0, 0, 0, 0)
    p.state = 'attack'
    p.vx = 0
    this.projectiles.push({
      x: p.x + p.facing * 34,
      y: p.y - 62,
      vx: p.facing * 640,
      vy: 0,
      g: 0,
      kind: 'wave',
      fromPlayer: true,
      dmg: 22,
      life: 1.4,
      rot: 0,
      vr: 0,
      t: 0,
      hits: new Set(),
    })
    this.audio.special()
    this.shake = 5
    this.pop(p.x, p.y - 140, pick(RAP_SHOUTS), GOLD, 24)
  }

  private attackBox(f: Fighter, a: Attack) {
    const reach = f.w + a.range * f.scale
    const x1 = f.facing === 1 ? f.x - 4 : f.x - reach
    const x2 = f.facing === 1 ? f.x + reach : f.x + 4
    const y1 = f.y - f.h * 0.92
    const y2 = f.y - f.h * 0.05
    return { x1, x2, y1, y2 }
  }

  private overlaps(box: { x1: number; x2: number; y1: number; y2: number }, t: Fighter) {
    return box.x2 > t.x - t.w && box.x1 < t.x + t.w && box.y2 > t.y - t.h && box.y1 < t.y
  }

  private playerHits(a: Attack) {
    const p = this.player
    const box = this.attackBox(p, a)
    for (const e of this.enemies) {
      if (e.state === 'dead' || a.hits.has(e.id)) continue
      if (this.overlaps(box, e)) {
        a.hits.add(e.id)
        this.damageEnemy(e, a.dmg, p.facing, a.knock, a.lift)
      }
    }
    for (const pr of this.projectiles) {
      if (pr.fromPlayer || pr.life <= 0) continue
      if (pr.x > box.x1 && pr.x < box.x2 && pr.y > box.y1 && pr.y < box.y2) {
        pr.life = 0
        this.sparks(pr.x, pr.y, 8, '#ffffff')
        this.pop(pr.x, pr.y - 20, 'ОТБИЛ!', '#ffffff', 18)
        this.score += 20
        this.audio.hit(false)
      }
    }
  }

  private damageEnemy(e: Fighter, dmg: number, dir: Facing, knock: number, lift: number) {
    if (e.state === 'dead' || e.invulnT > 0) return
    if (e.state === 'down' && e.onGround && e.stateT > 0.15) return
    const def = e.def as EnemyDef
    const isBoss = def.behavior === 'boss'
    const diff = DIFFICULTIES[this.difficulty]
    const amount = Math.round(dmg * (this.gloveT > 0 ? 2 : 1) * (this.items.has('tagclub') ? 1.25 : 1))
    e.hp -= amount
    e.flashT = 0.1
    e.entering = false
    this.combo++
    this.comboT = 1.6
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.energy = Math.min(100, this.energy + 5 * (this.items.has('iphone') ? 1.8 : 1))
    this.score += amount * 10 * (1 + Math.min(this.combo, 20) * 0.05) * diff.score
    const heavy = knock >= 300 || lift > 0
    const hx = e.x - dir * e.w * 0.6
    const hy = e.y - e.h * 0.62
    this.sparks(hx, hy, heavy ? 14 : 8, heavy ? GOLD : '#ffffff')
    if (heavy) this.pop(hx, hy - 20, pick(HIT_WORDS), GOLD, 30)
    else this.pop(hx, hy - 16, `-${amount}`, '#ffffff', 18)
    this.hitStop = heavy ? 0.07 : 0.035
    this.shake = Math.max(this.shake, heavy ? 8 : 3)
    this.audio.hit(heavy)
    e.facing = -dir as Facing

    if (e.hp <= 0) {
      e.hp = 0
      e.state = 'dead'
      e.attack = null
      e.vx = dir * 380
      e.vy = -560
      e.onGround = false
      e.deadT = 0
      e.bubble = null
      this.kills++
      const gain = Math.round(def.score * diff.score)
      this.score += gain
      this.pop(e.x, e.y - e.h - 10, `+${gain}`, GOLD, 22)
      if (isBoss) {
        this.audio.ko()
        this.shake = 16
        this.hitStop = 0.3
        this.pop(e.x, e.y - e.h - 50, 'K.O.!', '#e23636', 56)
        this.spawnConfetti(40)
      } else if (Math.random() < 0.22 * diff.drop) {
        const roll = Math.random()
        const kind: PickupKind =
          roll < 0.5 ? 'kimbap' : roll < 0.72 ? 'energy' : roll < 0.9 ? 'ramyeon' : 'chicken'
        this.pickups.push({ x: e.x, y: e.y - 40, vy: -420, kind, t: 0 })
      }
      return
    }

    if (isBoss) {
      e.vx = dir * knock * 0.25
      if (!e.attack) {
        e.state = 'hurt'
        e.stateT = 0.16
      }
    } else if (heavy) {
      e.state = 'down'
      e.stateT = 0
      e.attack = null
      e.vx = dir * knock
      e.vy = -(lift || 320)
      e.onGround = false
    } else {
      e.state = 'hurt'
      e.stateT = 0
      e.attack = null
      e.vx = dir * knock
    }
  }

  private damagePlayer(dmg: number, dir: Facing, knock: number, lift: number) {
    const p = this.player
    if (p.invulnT > 0 || p.state === 'dead' || p.state === 'down' || this.completeT > 0) return
    if (this.dodgeT > 0) {
      this.onDodgedHit()
      return
    }
    p.hp -= dmg
    p.flashT = 0.12
    this.combo = 0
    this.comboT = 0
    this.audio.hurt()
    this.shake = Math.max(this.shake, 6)
    this.hitStop = 0.05
    this.sparks(p.x, p.y - 60, 10, '#e23636')
    p.attack = null
    this.punchQueued = false
    p.facing = -dir as Facing
    if (p.hp <= 0) {
      p.hp = 0
      p.state = 'dead'
      p.vx = dir * 320
      p.vy = -520
      p.onGround = false
      this.deathT = 0
      this.audio.ko()
      this.pop(p.x, p.y - 150, 'K.O.', '#e23636', 52)
    } else if (knock >= 330 || lift > 0) {
      p.state = 'down'
      p.stateT = 0
      p.vx = dir * knock
      p.vy = -(lift || 320)
      p.onGround = false
    } else {
      p.state = 'hurt'
      p.stateT = 0
      p.vx = dir * knock
      p.invulnT = 0.6
    }
  }

  private updateWaves(dt: number) {
    const waves = this.level.waves
    if (!this.locked && this.completeT < 0 && this.waveIndex < waves.length && this.player.x >= waves[this.waveIndex].x) {
      const w = waves[this.waveIndex]
      this.locked = true
      this.spawnQueue = [...w.enemies]
      this.spawnT = 0.2
      this.bossWave = !!w.boss
      this.waveIndex++
      if (this.bossWave) {
        this.audio.boss()
        this.banner = { title: 'БОСС', sub: this.level.bossName, t: 2.4 }
      }
    }
    if (!this.locked) return
    this.spawnT -= dt
    const alive = this.enemies.filter((e) => e.state !== 'dead').length
    if (this.spawnQueue.length && this.spawnT <= 0 && alive < (this.bossWave ? 4 : 3)) {
      const id = this.spawnQueue.shift() as string
      this.spawnEnemy(id)
      this.spawnT = 0.9
    }
    if (!this.spawnQueue.length && alive === 0) {
      this.locked = false
      if (this.bossWave) {
        this.completeT = 2.6
        this.banner = { title: 'ПОБЕДА!', sub: `${this.level.title} пройден`, t: 2.4 }
      } else {
        this.pop(this.player.x, this.player.y - 150, 'ВПЕРЁД!', GOLD, 28)
      }
    }
  }

  private spawnEnemy(id: string) {
    const def = ENEMY_DEFS[id]
    const isBoss = def.behavior === 'boss'
    const side = isBoss ? 1 : this.spawnSide
    this.spawnSide = Math.random() < 0.65 ? 1 : -1
    const x = side > 0 ? this.camX + W + 50 : this.camX - 50
    const e: Fighter = {
      id: this.nextId++,
      isPlayer: false,
      def,
      look: def.look,
      x,
      y: GROUND,
      vx: 0,
      vy: 0,
      w: 20 * def.scale,
      h: 108 * def.scale,
      scale: def.scale,
      facing: side > 0 ? -1 : 1,
      onGround: true,
      dropT: 0,
      hp: Math.round(def.hp * DIFFICULTIES[this.difficulty].enemyHp),
      maxHp: Math.round(def.hp * DIFFICULTIES[this.difficulty].enemyHp),
      state: 'walk',
      stateT: 0,
      attack: null,
      invulnT: 0,
      flashT: 0,
      animT: Math.random() * 3,
      cooldown: rand(0.6, 1.4),
      bubble: isBoss || Math.random() < 0.6 ? { text: pick(def.lines), t: 2.2 } : null,
      deadT: 0,
      entering: true,
    }
    if (isBoss) this.boss = e
    this.enemies.push(e)
  }

  private updateEnemy(e: Fighter, dt: number) {
    const p = this.player
    const def = e.def as EnemyDef
    e.animT += dt
    e.stateT += dt
    if (e.invulnT > 0) e.invulnT -= dt
    if (e.flashT > 0) e.flashT -= dt
    if (e.bubble) {
      e.bubble.t -= dt
      if (e.bubble.t <= 0) e.bubble = null
    }
    if (e.state === 'dead') {
      e.deadT += dt
      if (e.onGround) e.vx = approach(e.vx, 0, 1200 * dt)
      this.physics(e, dt)
      return
    }
    if (e.state === 'hurt') {
      e.vx = approach(e.vx, 0, 1400 * dt)
      if (e.stateT > 0.28) e.state = 'idle'
      this.physics(e, dt)
      this.clampEnemy(e)
      return
    }
    if (e.state === 'down') {
      if (e.onGround) e.vx = approach(e.vx, 0, 1600 * dt)
      if (e.onGround && e.stateT > 1.0) {
        e.state = 'idle'
        e.invulnT = 0.35
      }
      this.physics(e, dt)
      this.clampEnemy(e)
      return
    }

    const dx = p.x - e.x
    const adx = Math.abs(dx)
    const dy = p.y - e.y
    const reach = def.range * e.scale + e.w
    const spd = def.speed * DIFFICULTIES[this.difficulty].enemySpeed
    e.cooldown -= dt

    if (e.attack) {
      this.updateEnemyAttack(e, dt)
      this.physics(e, dt)
      this.clampEnemy(e)
      return
    }

    if (e.entering) {
      const inside = e.x > this.camX + 40 && e.x < this.camX + W - 40
      if (inside) e.entering = false
      e.facing = e.x < this.camX + W / 2 ? 1 : -1
      e.vx = e.facing * spd
      e.state = 'walk'
      this.physics(e, dt)
      return
    }

    const playerAlive = p.state !== 'dead'
    let move = 0
    if (playerAlive) {
      e.facing = dx >= 0 ? 1 : -1
      if (def.behavior === 'melee') {
        const side = e.x < p.x ? -1 : 1
        const tx = p.x + side * (reach * 0.8 + (e.id % 3) * 8)
        if (Math.abs(tx - e.x) > 10) move = Math.sign(tx - e.x)
        if (e.cooldown <= 0 && adx <= reach + p.w + 6 && Math.abs(dy) < 60 && this.attackers() < 2) {
          this.enemyStrike(e)
        }
        if (dy < -70 && adx < 150 && e.onGround && Math.random() < dt * 1.4) {
          e.vy = -860
          e.onGround = false
        }
      } else if (def.behavior === 'ranged') {
        if (adx < 200) move = -Math.sign(dx)
        else if (adx > 360) move = Math.sign(dx)
        if (e.cooldown <= 0) {
          if (adx <= reach + p.w + 6 && Math.abs(dy) < 60) this.enemyStrike(e)
          else if (adx < 560) this.enemyThrow(e)
        }
      } else {
        if (adx > reach * 0.9) move = Math.sign(dx)
        if (e.cooldown <= 0) {
          const r = Math.random()
          if (adx <= reach + p.w + 14 && Math.abs(dy) < 80) this.enemySlam(e)
          else if (def.projectile && r < 0.45) this.enemyThrow(e)
          else if (r < 0.8 && Math.abs(dy) < 60) this.enemyCharge(e)
          else e.cooldown = 0.4
        }
      }
    }

    if (e.attack) {
      this.physics(e, dt)
      this.clampEnemy(e)
      return
    }
    const wobble = def.id === 'drunk' ? Math.sin(e.animT * 3) * 0.5 : 0
    e.vx = approach(e.vx, (move + (move ? wobble : 0)) * spd, 1600 * dt)
    e.state = e.onGround ? (Math.abs(e.vx) > 10 ? 'walk' : 'idle') : 'jump'
    this.physics(e, dt)
    this.clampEnemy(e)
  }

  private clampEnemy(e: Fighter) {
    if (this.locked && !e.entering) e.x = clamp(e.x, this.camX + e.w, this.camX + W - e.w)
  }

  private attackers() {
    return this.enemies.filter((e) => e.attack && e.attack.kind === 'strike').length
  }

  private say(e: Fighter, chance: number) {
    if (!e.bubble && Math.random() < chance && e.def) e.bubble = { text: pick(e.def.lines), t: 1.8 }
  }

  private enemyStrike(e: Fighter) {
    const def = e.def as EnemyDef
    const wind = def.behavior === 'boss' ? 0.5 : 0.42
    e.attack = this.mkAttack('strike', wind + 0.3, wind, wind + 0.12, def.range, this.eDmg(def.damage), 200, 0)
    e.state = 'attack'
    this.say(e, 0.15)
  }

  private enemyThrow(e: Fighter) {
    e.attack = this.mkAttack('throw', 0.8, 0.45, 0.45, 0, 0, 0, 0)
    e.state = 'attack'
    this.say(e, 0.2)
  }

  private enemyCharge(e: Fighter) {
    const def = e.def as EnemyDef
    e.attack = this.mkAttack('charge', 1.25, 0.55, 1.1, def.range, this.eDmg(def.damage), 380, 320)
    e.state = 'attack'
    this.pop(e.x, e.y - e.h - 20, '!', '#e23636', 40)
    this.say(e, 0.4)
  }

  private enemySlam(e: Fighter) {
    const def = e.def as EnemyDef
    e.attack = this.mkAttack('slam', 0.95, 0.55, 0.68, def.range + 22, this.eDmg(def.damage + 3), 360, 360)
    e.state = 'attack'
  }

  private updateEnemyAttack(e: Fighter, dt: number) {
    const a = e.attack as Attack
    const p = this.player
    a.t += dt
    if (a.kind === 'charge') {
      if (a.t >= a.hitStart && a.t < a.hitEnd) {
        e.vx = e.facing * 640
        if (Math.random() < dt * 30) this.dust(e.x - e.facing * 20, e.y, 1)
      } else e.vx = approach(e.vx, 0, 2200 * dt)
    } else {
      e.vx = approach(e.vx, 0, 1500 * dt)
    }

    if (a.kind === 'throw') {
      if (a.t >= a.hitStart && !a.hits.has(-1)) {
        a.hits.add(-1)
        this.spawnEnemyProjectile(e)
      }
    } else if (a.t >= a.hitStart && a.t <= a.hitEnd && !a.hits.has(0)) {
      if (this.overlaps(this.attackBox(e, a), p)) {
        a.hits.add(0)
        this.damagePlayer(a.dmg, e.facing, a.knock, a.lift)
      }
    }
    if (a.kind === 'slam' && a.t >= a.hitStart && !a.hits.has(-2)) {
      a.hits.add(-2)
      this.shake = Math.max(this.shake, 10)
      this.dust(e.x + e.facing * 50, e.y, 14)
      this.particles.push({ x: e.x + e.facing * 50, y: e.y, vx: 0, vy: 0, g: 0, life: 0.4, max: 0.4, size: 10, color: '#ffffff', kind: 'ring', rot: 0, vr: 0 })
      this.audio.hit(true)
    }
    if (a.t >= a.dur) {
      e.attack = null
      e.state = 'idle'
      const isBoss = (e.def as EnemyDef).behavior === 'boss'
      e.cooldown = (isBoss ? rand(0.5, 1.1) : rand(0.9, 1.8)) * DIFFICULTIES[this.difficulty].cooldown
    }
  }

  private spawnEnemyProjectile(e: Fighter) {
    const def = e.def as EnemyDef
    const kind = def.projectile
    if (!kind) return
    const p = this.player
    const sx = e.x + e.facing * 22 * e.scale
    const sy = e.y - 78 * e.scale
    const isBoss = def.behavior === 'boss'
    const floaty = kind === 'exam' || kind === 'coupon'
    const g = floaty ? 260 : PROJ_G
    const speeds = isBoss ? [0.75, 1, 1.25] : [1]
    for (const k of speeds) {
      const speed = (kind === 'bottle' || kind === 'wrench' || kind === 'brick' ? 430 : 380) * k
      const dist = Math.max(80, Math.abs(p.x - sx))
      const t = dist / speed
      const ty = p.y - 55
      const vy = clamp((ty - sy - 0.5 * g * t * t) / t, -720, 320)
      this.projectiles.push({
        x: sx,
        y: sy,
        vx: e.facing * speed,
        vy,
        g,
        kind,
        fromPlayer: false,
        dmg: this.eDmg(def.damage * (isBoss ? 0.7 : 1)),
        life: 3.5,
        rot: 0,
        vr: e.facing * (floaty ? 4 : 11),
        t: 0,
        hits: new Set(),
      })
    }
    this.audio.whoosh()
  }

  private updateProjectiles(dt: number) {
    const p = this.player
    for (const pr of this.projectiles) {
      pr.life -= dt
      pr.t += dt
      pr.vy += pr.g * dt
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.rot += pr.vr * dt
      if (pr.fromPlayer) {
        if (Math.random() < dt * 25) {
          this.particles.push({ x: pr.x, y: pr.y + rand(-25, 25), vx: -pr.vx * 0.1, vy: rand(-60, -20), g: 0, life: 0.6, max: 0.6, size: 16, color: GOLD, kind: 'note', rot: 0, vr: 0 })
        }
        for (const e of this.enemies) {
          if (e.state === 'dead' || pr.hits.has(e.id)) continue
          if (Math.abs(e.x - pr.x) < e.w + 26 && pr.y > e.y - e.h - 10 && pr.y < e.y + 10) {
            pr.hits.add(e.id)
            this.damageEnemy(e, pr.dmg, (pr.vx > 0 ? 1 : -1) as Facing, 340, 260)
          }
        }
        if (pr.x < this.camX - 120 || pr.x > this.camX + W + 120) pr.life = 0
      } else {
        if (Math.abs(p.x - pr.x) < p.w + 10 && pr.y > p.y - p.h && pr.y < p.y + 4 && p.invulnT <= 0 && p.state !== 'down' && p.state !== 'dead') {
          if (this.dodgeT > 0) {
            this.onDodgedHit()
          } else {
            this.damagePlayer(pr.dmg, (pr.vx > 0 ? 1 : -1) as Facing, 200, 0)
            pr.life = 0
          }
        }
        if (pr.y >= GROUND - 4) {
          pr.life = 0
          this.sparks(pr.x, GROUND - 6, 6, pr.kind === 'snowball' ? '#ffffff' : pr.kind === 'bottle' ? '#2e9e4f' : '#cccccc')
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0)
  }

  private updatePickups(dt: number) {
    const p = this.player
    for (const k of this.pickups) {
      k.t += dt
      const prevY = k.y
      k.vy += GRAVITY * 0.6 * dt
      k.y += k.vy * dt
      if (k.y >= GROUND) {
        k.y = GROUND
        k.vy = 0
      } else if (k.vy >= 0) {
        for (const pl of this.level.platforms) {
          if (prevY <= pl.y + 0.5 && k.y >= pl.y && k.x > pl.x && k.x < pl.x + pl.w) {
            k.y = pl.y
            k.vy = 0
          }
        }
      }
    }
    this.pickups = this.pickups.filter((k) => {
      const hit = Math.abs(k.x - p.x) < 34 && k.y > p.y - p.h && k.y < p.y + 20 && p.state !== 'dead'
      if (!hit) return true
      if (k.kind === 'kimbap') p.hp = Math.min(p.maxHp, p.hp + 30)
      if (k.kind === 'ramyeon') p.hp = Math.min(p.maxHp, p.hp + 60)
      if (k.kind === 'chicken') p.hp = Math.min(p.maxHp, p.hp + 100)
      if (k.kind === 'energy') this.energy = 100
      if (k.kind === 'glove') this.gloveT = 10
      if (isItem(k.kind)) {
        this.items.add(k.kind)
        if (k.kind === 'supreme') {
          p.maxHp += 30
          p.hp += 30
        }
        if (k.kind === 'tagclub') {
          p.look = {
            ...PLAYER_LOOK,
            skin: PLAYER_SKIN_BY_DIFFICULTY[this.difficulty],
            top: '#c4512f',
            trim: '#f5c518',
          }
        }
        this.pop(p.x, p.y - 150, `${ITEM_INFO[k.kind].name}!`, GOLD, 26)
        this.pop(p.x, p.y - 122, ITEM_INFO[k.kind].effect, '#ffffff', 16)
        this.spawnConfetti(18)
        this.sparks(p.x, p.y - 60, 14, GOLD)
      } else {
        this.pop(p.x, p.y - 140, PICKUP_LABEL[k.kind], k.kind === 'glove' ? GOLD : '#7CFC9A', 20)
      }
      this.sparks(k.x, k.y - 18, 10, GOLD)
      this.audio.pickup()
      this.score += 50
      return false
    })
  }

  private updateCamera(dt: number) {
    if (this.locked) return
    const target = clamp(this.player.x - W * 0.42, 0, this.level.length - W)
    if (target > this.camX) this.camX += (target - this.camX) * Math.min(1, dt * 8)
  }

  private separate() {
    const list = this.enemies.filter((e) => e.state !== 'dead' && e.onGround)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (Math.abs(a.y - b.y) > 10) continue
        const min = (a.w + b.w) * 0.8
        const d = b.x - a.x
        if (Math.abs(d) < min) {
          const push = (min - Math.abs(d)) / 2
          const s = d >= 0 ? 1 : -1
          a.x -= push * s * 0.5
          b.x += push * s * 0.5
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const g of this.ghosts) g.life -= dt
    this.ghosts = this.ghosts.filter((g) => g.life > 0)
    for (const t of this.pops) {
      t.life -= dt
      t.y -= 40 * dt
    }
    this.pops = this.pops.filter((t) => t.life > 0)
  }

  private updateAmbient(dt: number) {
    const kind = this.level.ambient
    const rate = kind === 'snow' ? 40 : kind === 'none' ? 0 : 7
    if (Math.random() < rate * dt) {
      const color =
        kind === 'snow' ? '#ffffff' : kind === 'petals' ? pick(['#ffc4dd', '#ff9fc6', '#ffe1ee']) : pick(['#e8772e', '#d4a017', '#b5473a'])
      this.ambient.push({
        x: rand(-40, W + 40),
        y: -10,
        vx: rand(-30, 10),
        vy: kind === 'snow' ? rand(40, 90) : rand(40, 70),
        size: kind === 'snow' ? rand(1.5, 4) : rand(4, 7),
        rot: rand(0, 6),
        vr: rand(-3, 3),
        color,
      })
    }
    for (const a of this.ambient) {
      a.x += (a.vx + Math.sin(this.clock * 2 + a.y * 0.02) * 20) * dt
      a.y += a.vy * dt
      a.rot += a.vr * dt
    }
    this.ambient = this.ambient.filter((a) => a.y < H + 10)
  }

  private sparks(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2)
      const sp = rand(150, 420)
      this.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 600, life: rand(0.2, 0.45), max: 0.45, size: rand(3, 6), color, kind: 'spark', rot: ang, vr: 0 })
    }
  }

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + rand(-14, 14), y: y - 4, vx: rand(-80, 80), vy: rand(-80, -20), g: 0, life: rand(0.3, 0.5), max: 0.5, size: rand(6, 11), color: 'rgba(200,200,200,0.6)', kind: 'dust', rot: 0, vr: 0 })
    }
  }

  private spawnConfetti(n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: this.camX + rand(0, W),
        y: rand(-60, -10),
        vx: rand(-60, 60),
        vy: rand(60, 180),
        g: 40,
        life: rand(3, 5),
        max: 5,
        size: rand(6, 11),
        color: pick(CONFETTI),
        kind: 'confetti',
        rot: rand(0, 6),
        vr: rand(-8, 8),
      })
    }
  }

  private pop(x: number, y: number, text: string, color: string, size: number) {
    this.pops.push({ x, y, text, color, size, life: 0.9, max: 0.9 })
  }

  // ---------- rendering ----------

  private text(str: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', display = true, stroke = 5) {
    const ctx = this.ctx
    ctx.font = `${size}px ${display ? this.opts.displayFont : this.opts.bodyFont}, sans-serif`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    if (stroke > 0) {
      ctx.strokeStyle = OUTLINE
      ctx.lineWidth = stroke
      ctx.strokeText(str, x, y)
    }
    ctx.fillStyle = color
    ctx.fillText(str, x, y)
  }

  private render() {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const sx = this.shake > 0 ? rand(-this.shake, this.shake) : 0
    const sy = this.shake > 0 ? rand(-this.shake, this.shake) : 0
    ctx.save()
    ctx.translate(sx, sy)
    this.drawBackground()
    ctx.save()
    ctx.translate(-Math.round(this.camX), 0)
    this.drawPlatforms()
    for (const k of this.pickups) drawPickup(ctx, k.kind, k.x, k.y, k.t)
    const all = [...this.enemies].sort((a, b) => (a.state === 'dead' ? -1 : 0) - (b.state === 'dead' ? -1 : 0))
    all.push(this.player)
    for (const f of all) this.drawShadow(f)
    const ghostPose = poseFor({ state: 'dodge', animT: 0, vy: 0, angry: false })
    for (const g of this.ghosts) {
      drawFighter(ctx, {
        x: g.x,
        y: g.y,
        facing: g.facing,
        scale: 1,
        look: this.player.look,
        pose: ghostPose,
        alpha: Math.max(0, g.life / 0.28) * 0.35,
        flash: false,
        roll: g.roll,
      })
    }
    for (const f of all) this.drawFighterEntity(f)
    for (const pr of this.projectiles) drawProjectile(ctx, pr.kind, pr.x, pr.y, pr.rot, pr.vx >= 0 ? 1 : -1, pr.t)
    this.drawParticles()
    for (const e of this.enemies) if (e.bubble && e.state !== 'dead') this.drawBubble(e.bubble.text, e.x, e.y - e.h - 26)
    for (const t of this.pops) {
      const k = t.life / t.max
      ctx.globalAlpha = Math.min(1, k * 2)
      const scale = 1 + (1 - k) * 0.15
      this.text(t.text, t.x, t.y, t.size * scale, t.color, 'center', true, Math.max(4, t.size / 5))
      ctx.globalAlpha = 1
    }
    ctx.restore()
    this.drawAmbient()
    ctx.restore()

    if (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'intro') this.drawHud()
    if (this.banner && this.mode === 'playing') this.drawBanner()
    if (this.mode === 'playing' && !this.locked && this.completeT < 0 && this.waveIndex > 0 && this.waveIndex < this.level.waves.length) {
      this.drawGoArrow()
    }
  }

  private drawBackground() {
    const ctx = this.ctx
    const img = this.images[this.level.id]
    if (img && img.complete && img.naturalWidth) {
      const th = H
      const tw = (img.naturalWidth * th) / img.naturalHeight
      const scroll = this.camX * 0.35
      const start = Math.floor(scroll / tw)
      for (let k = 0; k < 3; k++) {
        const idx = start + k
        const x = idx * tw - scroll
        if (idx % 2 === 0) ctx.drawImage(img, x, 0, tw, th)
        else {
          ctx.save()
          ctx.translate(x + tw, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(img, 0, 0, tw, th)
          ctx.restore()
        }
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#1b1b2f')
      g.addColorStop(1, '#3a3a5a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    const lvl = this.level
    ctx.fillStyle = lvl.ground
    ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP)
    ctx.strokeStyle = lvl.groundLine
    ctx.lineWidth = 2
    const step = 90
    const off = -(this.camX % step)
    for (let x = off - step; x < W + step * 2; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, FLOOR_TOP)
      ctx.lineTo(x + (x - W / 2) * 0.35, H)
      ctx.stroke()
    }
    for (const y of [FLOOR_TOP + 28, FLOOR_TOP + 62]) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    ctx.fillStyle = lvl.groundEdge
    ctx.fillRect(0, FLOOR_TOP - 3, W, 6)
    ctx.fillStyle = OUTLINE
    ctx.fillRect(0, FLOOR_TOP - 4, W, 2)
  }

  private drawPlatforms() {
    const ctx = this.ctx
    for (const p of this.level.platforms) {
      if (p.x + p.w < this.camX - 20 || p.x > this.camX + W + 20) continue
      roundRect(ctx, p.x + 6, p.y + 10, p.w - 12, 22, 5)
      ctx.fillStyle = this.level.platformSide
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = OUTLINE
      ctx.stroke()
      roundRect(ctx, p.x, p.y - 2, p.w, 16, 6)
      ctx.fillStyle = this.level.platformTop
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(p.x + 8, p.y + 1, p.w - 16, 3)
    }
  }

  private surfaceBelow(f: Fighter) {
    let best = GROUND
    for (const p of this.level.platforms) {
      if (f.x > p.x && f.x < p.x + p.w && p.y >= f.y - 1 && p.y < best) best = p.y
    }
    return best
  }

  private drawShadow(f: Fighter) {
    const ctx = this.ctx
    const sy = this.surfaceBelow(f)
    const hgt = Math.max(0, sy - f.y)
    const k = Math.max(0.35, 1 - hgt / 300)
    ctx.fillStyle = `rgba(0,0,0,${0.28 * k})`
    ctx.beginPath()
    ctx.ellipse(f.x, sy + 2, 26 * f.scale * k, 7 * f.scale * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawFighterEntity(f: Fighter) {
    const a = f.attack
    const pose = poseFor({
      state: f.state,
      attackKind: a?.kind,
      phase: a ? (a.t < a.hitStart ? 'windup' : 'strike') : undefined,
      animT: f.animT,
      vy: f.vy,
      angry: !f.isPlayer,
    })
    if (f.isPlayer && this.mode === 'title') {
      pose.eyes = 'open'
      pose.mouth = 'smile'
    }
    let alpha = 1
    if (f.state === 'dead' && !f.isPlayer) alpha = Math.max(0, 1 - Math.max(0, f.deadT - 0.8) / 0.8)
    else if (f.invulnT > 0 && Math.floor(this.clock * 20) % 2 === 0) alpha = 0.45
    if (f.state === 'attack' && a && a.t < a.hitStart && !f.isPlayer && Math.floor(this.clock * 16) % 2 === 0) {
      this.ctx.save()
      this.ctx.globalAlpha = 0.35
      this.ctx.fillStyle = '#e23636'
      this.ctx.beginPath()
      this.ctx.arc(f.x, f.y - f.h * 0.55, 46 * f.scale, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }
    let roll = 0
    if (f.isPlayer && this.dodgeT > 0) {
      alpha = Math.min(alpha, 0.75)
      roll = this.rollAngle()
    }
    drawFighter(this.ctx, {
      x: f.x,
      y: f.y,
      facing: f.facing,
      scale: f.scale,
      look: f.look,
      pose,
      alpha,
      roll,
      flash: f.flashT > 0,
      goldFists: f.isPlayer && this.gloveT > 0,
    })
  }

  private drawBubble(str: string, x: number, y: number) {
    const ctx = this.ctx
    ctx.font = `bold 15px ${this.opts.bodyFont}, sans-serif`
    const w = ctx.measureText(str).width + 20
    const h = 28
    roundRect(ctx, x - w / 2, y - h, w, h, 10)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = OUTLINE
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 6, y - 1)
    ctx.lineTo(x + 2, y + 10)
    ctx.lineTo(x + 8, y - 1)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillRect(x - 5, y - 4, 12, 4)
    ctx.fillStyle = OUTLINE
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(str, x, y - h / 2 + 1)
  }

  private drawParticles() {
    const ctx = this.ctx
    for (const p of this.particles) {
      const k = p.life / p.max
      ctx.globalAlpha = Math.min(1, k * 1.5)
      if (p.kind === 'spark') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(Math.atan2(p.vy, p.vx))
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size * 1.5, -p.size / 3, p.size * 3, (p.size * 2) / 3)
        ctx.restore()
      } else if (p.kind === 'dust') {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, Math.PI * 2)
        ctx.fill()
      } else if (p.kind === 'confetti') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      } else if (p.kind === 'note') {
        ctx.fillStyle = p.color
        ctx.font = `bold ${p.size}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('♪', p.x, p.y)
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, (1 - k) * 120 + 10, ((1 - k) * 120 + 10) * 0.25, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  private drawAmbient() {
    const ctx = this.ctx
    const snow = this.level.ambient === 'snow'
    for (const a of this.ambient) {
      ctx.fillStyle = a.color
      ctx.globalAlpha = snow ? 0.85 : 0.9
      if (snow) {
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(a.rot)
        ctx.beginPath()
        ctx.ellipse(0, 0, a.size, a.size * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }

  private bar(x: number, y: number, w: number, h: number, k: number, color: string) {
    const ctx = this.ctx
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fill()
    if (k > 0) {
      roundRect(ctx, x, y, Math.max(h, w * k), h, h / 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillRect(x + h / 2, y + 2, Math.max(0, w * k - h), Math.max(1, h / 4))
    }
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = OUTLINE
    ctx.stroke()
  }

  private drawHud() {
    const ctx = this.ctx
    const p = this.player
    roundRect(ctx, 12, 12, 290, 76, 14)
    ctx.fillStyle = 'rgba(10,10,12,0.72)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(245,197,24,0.6)'
    ctx.stroke()

    ctx.save()
    ctx.beginPath()
    ctx.arc(50, 50, 30, 0, Math.PI * 2)
    ctx.fillStyle = '#2a2a2e'
    ctx.fill()
    ctx.clip()
    ctx.translate(50 - 3 * 0.95, 50 + 88 * 0.95 - 4)
    ctx.scale(0.95, 0.95)
    const hudPose = poseFor({ state: 'idle', animT: 0, vy: 0, angry: p.hp < 30 })
    if (p.state === 'hurt' || p.state === 'down' || p.state === 'dead') hudPose.eyes = 'x'
    drawHead(ctx, p.look, hudPose)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(50, 50, 30, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = GOLD
    ctx.stroke()

    this.text('ДАВИД', 92, 28, 18, '#ffffff', 'left', true, 4)
    this.bar(92, 42, 196, 16, p.hp / p.maxHp, p.hp < 30 ? '#ff4d4d' : '#e23636')
    const ready = this.energy >= this.specialCost()
    this.bar(92, 63, 196, 11, this.energy / 100, ready && Math.floor(this.clock * 4) % 2 === 0 ? '#ffe36b' : GOLD)
    if (ready) this.text('L — РЭП-ВОЛНА', 296, 28, 12, GOLD, 'right', false, 3)

    if (this.gloveT > 0) {
      drawPickup(ctx, 'glove', 330, 70, this.clock)
      this.text(`x2 ${Math.ceil(this.gloveT)}с`, 356, 54, 14, GOLD, 'left', true, 3)
    }

    const dodgeK = this.dodgeCd > 0 ? 1 - this.dodgeCd / (DODGE_CD + this.dodgeDur * 0.5) : 1
    const dodgeReady = dodgeK >= 1
    this.text('УВОРОТ', 16, 106, 12, dodgeReady ? '#7CFC9A' : '#9aa0a6', 'left', false, 3)
    this.bar(72, 100, 70, 11, dodgeK, dodgeReady ? '#7CFC9A' : '#9aa0a6')
    let ix = 170
    for (const kind of ITEM_KINDS) {
      if (!this.items.has(kind)) continue
      ctx.save()
      ctx.translate(ix, 106)
      ctx.scale(0.55, 0.55)
      drawPickup(ctx, kind, 0, 18, 0)
      ctx.restore()
      ix += 30
    }

    this.text(`${this.level.number}. ${this.level.title}`, W / 2, 28, 18, '#ffffff', 'center', true, 4)
    this.text(`Сложность: ${DIFFICULTIES[this.difficulty].name}`, W / 2, 50, 13, '#d0d0d0', 'center', false, 3)
    this.text(String(Math.round(this.score)).padStart(6, '0'), W - 20, 30, 26, GOLD, 'right', true, 5)
    this.text('СЧЁТ', W - 20, 54, 12, '#ffffff', 'right', false, 3)
    if (this.combo >= 3) {
      const s = 1 + Math.min(this.combo, 30) / 60
      this.text(`${this.combo} КОМБО!`, W - 20, 84, 24 * s, '#ff8a3d', 'right', true, 5)
    }

    if (this.boss && this.boss.state !== 'dead' && !this.boss.entering) {
      const bw = 460
      const bx = (W - bw) / 2
      this.text(this.boss.def?.name ?? '', W / 2, H - 52, 18, '#ffffff', 'center', true, 4)
      this.bar(bx, H - 38, bw, 18, this.boss.hp / this.boss.maxHp, '#b5179e')
    }
  }

  private drawBanner() {
    const b = this.banner
    if (!b) return
    const ctx = this.ctx
    const k = Math.min(1, (2.4 - b.t) * 5, b.t * 3)
    ctx.save()
    ctx.globalAlpha = Math.max(0, k)
    ctx.translate(W / 2, H * 0.38)
    ctx.rotate(-0.04)
    ctx.fillStyle = b.title === 'БОСС' ? '#e23636' : GOLD
    ctx.fillRect(-W, -46, W * 2, 92)
    ctx.fillStyle = OUTLINE
    ctx.fillRect(-W, -50, W * 2, 6)
    ctx.fillRect(-W, 44, W * 2, 6)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = Math.max(0, k)
    this.text(b.title, W / 2, H * 0.38 - 12, 46, '#ffffff', 'center', true, 7)
    this.text(b.sub, W / 2, H * 0.38 + 26, 20, '#ffffff', 'center', false, 4)
    ctx.restore()
  }

  private drawGoArrow() {
    if (Math.floor(this.clock * 2.5) % 2 === 0) return
    const ctx = this.ctx
    const x = W - 90
    const y = H / 2 - 30
    this.text('ВПЕРЁД', x, y - 34, 24, GOLD, 'center', true, 5)
    ctx.beginPath()
    ctx.moveTo(x - 30, y - 14)
    ctx.lineTo(x + 10, y - 14)
    ctx.lineTo(x + 10, y - 28)
    ctx.lineTo(x + 40, y)
    ctx.lineTo(x + 10, y + 28)
    ctx.lineTo(x + 10, y + 14)
    ctx.lineTo(x - 30, y + 14)
    ctx.closePath()
    ctx.fillStyle = GOLD
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = OUTLINE
    ctx.stroke()
  }
}
