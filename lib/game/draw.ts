import { isItem } from './items'
import type { Facing, Look, PickupKind, ProjectileKind } from './types'

export const OUTLINE = '#141414'
export const GOLD = '#f5c518'
export const SUPREME_RED = '#d6212b'

export type FState = 'idle' | 'walk' | 'jump' | 'attack' | 'hurt' | 'down' | 'dead' | 'dance' | 'dodge'
export type AttackKind =
  | 'punch'
  | 'punch3'
  | 'kick'
  | 'airkick'
  | 'special'
  | 'strike'
  | 'throw'
  | 'charge'
  | 'slam'

export interface Pose {
  legB: number
  legF: number
  armB: number
  armF: number
  armFLen: number
  legFLen: number
  lean: number
  bob: number
  eyes: 'open' | 'x' | 'angry' | 'happy'
  mouth: 'line' | 'open' | 'smile' | 'frown'
  lying: boolean
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

export function poseFor(p: {
  state: FState
  attackKind?: AttackKind
  phase?: 'windup' | 'strike'
  animT: number
  vy: number
  angry: boolean
}): Pose {
  const base: Pose = {
    legB: -0.22,
    legF: 0.22,
    armB: 2.3,
    armF: 2.0,
    armFLen: 20,
    legFLen: 27,
    lean: 0,
    bob: Math.sin(p.animT * 4) * 1.5,
    eyes: p.angry ? 'angry' : 'open',
    mouth: p.angry ? 'frown' : 'line',
    lying: false,
  }
  switch (p.state) {
    case 'walk': {
      const s = Math.sin(p.animT * 11)
      return {
        ...base,
        legF: 0.6 * s,
        legB: -0.6 * s,
        armF: 2.0 + s * 0.2,
        armB: 2.3 - s * 0.2,
        bob: Math.abs(Math.cos(p.animT * 11)) * -3,
        lean: 0.06,
      }
    }
    case 'jump':
      return { ...base, legF: 0.95, legB: -0.35, armF: 2.6, armB: 2.8, bob: 0, lean: p.vy < 0 ? -0.05 : 0.08 }
    case 'hurt':
      return { ...base, lean: -0.35, eyes: 'x', mouth: 'open', armF: 2.7, armB: 2.9, legF: 0.35, bob: 0 }
    case 'dodge':
      return { ...base, lean: 0.3, armF: 2.9, armB: 2.9, legF: 1.3, legB: -0.9, legFLen: 22, eyes: 'angry', bob: 0 }
    case 'down':
    case 'dead':
      return { ...base, lying: true, eyes: 'x', mouth: 'open', armF: 2.9, armB: 3.0, legF: 0.2, legB: -0.1, bob: 0 }
    case 'dance': {
      const s = Math.sin(p.animT * 8)
      return {
        ...base,
        armF: s > 0 ? 3.0 : 2.2,
        armB: s > 0 ? 2.2 : 3.0,
        armFLen: 22,
        legF: 0.3 * s,
        legB: -0.3 * s,
        bob: -Math.abs(s) * 6,
        eyes: 'happy',
        mouth: 'smile',
      }
    }
    case 'attack': {
      const wind = p.phase === 'windup'
      switch (p.attackKind) {
        case 'punch':
        case 'strike':
          return wind
            ? { ...base, armF: -1.8, lean: -0.1, mouth: 'frown', eyes: 'angry' }
            : { ...base, armF: Math.PI / 2, armFLen: 30, lean: 0.14, mouth: 'open', eyes: 'angry', legF: 0.45, legB: -0.35 }
        case 'punch3':
          return wind
            ? { ...base, armF: 0.6, lean: -0.05, eyes: 'angry' }
            : { ...base, armF: 2.5, armFLen: 31, lean: 0.18, mouth: 'open', eyes: 'angry', legF: 0.5, legB: -0.45, bob: -6 }
        case 'kick':
          return wind
            ? { ...base, legF: 0.9, legFLen: 22, lean: -0.08, eyes: 'angry' }
            : { ...base, legF: Math.PI / 2, legFLen: 34, legB: -0.15, lean: -0.28, armF: 1.3, armB: 2.6, mouth: 'open', eyes: 'angry' }
        case 'airkick':
          return { ...base, legF: 1.05, legFLen: 34, legB: -0.7, lean: 0.25, armF: 2.8, armB: 2.4, eyes: 'angry', mouth: 'open', bob: 0 }
        case 'special':
          return { ...base, armF: Math.PI / 2, armFLen: 30, armB: 1.7, lean: 0.06, mouth: 'open', eyes: 'angry' }
        case 'throw':
          return wind
            ? { ...base, armF: -2.4, armFLen: 22, lean: -0.15, eyes: 'angry', mouth: 'frown' }
            : { ...base, armF: 1.9, armFLen: 28, lean: 0.15, eyes: 'angry', mouth: 'open' }
        case 'charge': {
          const s = Math.sin(p.animT * 22)
          return wind
            ? { ...base, lean: -0.15, armF: -1.2, armB: -1.0, eyes: 'angry', mouth: 'frown' }
            : { ...base, lean: 0.5, armF: Math.PI / 2, armFLen: 28, armB: 1.6, legF: 0.8 * s, legB: -0.8 * s, eyes: 'angry', mouth: 'open' }
        }
        case 'slam':
          return wind
            ? { ...base, armF: Math.PI, armB: Math.PI, armFLen: 24, lean: -0.15, eyes: 'angry', mouth: 'open', bob: -4 }
            : { ...base, armF: 0.9, armB: 0.9, armFLen: 28, lean: 0.35, eyes: 'angry', mouth: 'open' }
        default:
          return base
      }
    }
    default:
      return base
  }
}

function strokeFill(ctx: CanvasRenderingContext2D, fill: string, lw = 3) {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = lw
  ctx.strokeStyle = OUTLINE
  ctx.stroke()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, lw = 3) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  strokeFill(ctx, fill, lw)
}

function limb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  len: number,
  width: number,
  color: string,
  stripe?: string,
): [number, number] {
  const ex = x + Math.sin(angle) * len
  const ey = y + Math.cos(angle) * len
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = width + 6
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  if (stripe) {
    ctx.strokeStyle = stripe
    ctx.lineWidth = 2.5
    ctx.stroke()
  }
  return [ex, ey]
}

const HX = 3
const HY = -88
const HR = 25

function hairCap(ctx: CanvasRenderingContext2D, color: string) {
  ctx.beginPath()
  ctx.arc(HX, HY, HR + 1.5, Math.PI * 0.92, Math.PI * 2.08)
  ctx.lineTo(HX + HR * 0.82, HY - HR * 0.22)
  ctx.quadraticCurveTo(HX + 2, HY - HR * 0.6, HX - HR - 1, HY + 5)
  ctx.closePath()
  strokeFill(ctx, color)
}

function drawHairBack(ctx: CanvasRenderingContext2D, look: Look) {
  if (look.hairStyle === 'long') {
    roundRect(ctx, HX - HR - 4, HY - HR * 0.4, HR * 1.25, HR * 1.75, 8)
    strokeFill(ctx, look.hair)
  }
  if (look.hairStyle === 'perm') {
    for (let i = 0; i < 4; i++) {
      circle(ctx, HX - HR + 2, HY - 4 + i * 9, 9, look.hair)
    }
  }
  if (look.acc.includes('hood')) {
    ctx.beginPath()
    ctx.arc(HX - 7, HY + 3, HR + 6, Math.PI * 0.35, Math.PI * 1.75)
    ctx.closePath()
    strokeFill(ctx, shade(look.top, 0.08))
  }
}

function drawHairFront(ctx: CanvasRenderingContext2D, look: Look) {
  switch (look.hairStyle) {
    case 'short':
    case 'long':
      hairCap(ctx, look.hair)
      break
    case 'side':
      hairCap(ctx, look.hair)
      ctx.beginPath()
      ctx.moveTo(HX - 6, HY - HR + 2)
      ctx.quadraticCurveTo(HX + 22, HY - HR - 6, HX + HR + 2, HY - 6)
      ctx.quadraticCurveTo(HX + 12, HY - 14, HX - 2, HY - 16)
      ctx.closePath()
      strokeFill(ctx, look.hair)
      break
    case 'wavy':
      hairCap(ctx, look.hair)
      for (const [dx, dy, r] of [
        [-21, -105, 8],
        [-11, -111, 8],
        [1, -114, 9],
        [13, -111, 8],
        [23, -104, 7],
        [-27, -96, 6],
        [29, -96, 6],
      ]) {
        circle(ctx, HX + dx, dy, r, look.hair, 1.5)
      }
      break
    case 'buzz':
      ctx.beginPath()
      ctx.arc(HX, HY, HR + 1, Math.PI * 1.02, Math.PI * 1.98)
      ctx.closePath()
      ctx.globalAlpha *= 0.85
      strokeFill(ctx, look.hair, 2)
      ctx.globalAlpha /= 0.85
      break
    case 'spiky':
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.12 + i * 0.17)
        const bx1 = HX + Math.cos(a - 0.18) * HR
        const by1 = HY + Math.sin(a - 0.18) * HR
        const bx2 = HX + Math.cos(a + 0.18) * HR
        const by2 = HY + Math.sin(a + 0.18) * HR
        const tx = HX + Math.cos(a) * (HR + 14)
        const ty = HY + Math.sin(a) * (HR + 14)
        ctx.beginPath()
        ctx.moveTo(bx1, by1)
        ctx.lineTo(tx, ty)
        ctx.lineTo(bx2, by2)
        ctx.closePath()
        strokeFill(ctx, look.hair)
      }
      hairCap(ctx, look.hair)
      break
    case 'perm':
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.95 + i * 0.16)
        circle(ctx, HX + Math.cos(a) * (HR - 1), HY + Math.sin(a) * (HR - 1), 8.5, look.hair)
      }
      break
    case 'bald':
      ctx.beginPath()
      ctx.ellipse(HX - HR + 4, HY + 2, 6, 10, 0, 0, Math.PI * 2)
      strokeFill(ctx, look.hair, 2)
      ctx.beginPath()
      ctx.ellipse(HX + 4, HY - 14, 6, 3, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fill()
      break
  }
}

function drawFace(ctx: CanvasRenderingContext2D, look: Look, pose: Pose) {
  if (look.acc.includes('beard')) {
    const sx = HX + Math.cos(Math.PI * 0.05) * (HR - 0.5)
    const sy = HY + Math.sin(Math.PI * 0.05) * (HR - 0.5)
    ctx.beginPath()
    ctx.arc(HX, HY, HR - 0.5, Math.PI * 0.05, Math.PI * 0.95)
    ctx.quadraticCurveTo(HX, HY + 6, sx, sy)
    ctx.closePath()
    ctx.fillStyle = look.hair
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(HX + 15, HY + 10, 8, 5.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = shade(look.skin, 0.05)
    ctx.fill()
  }
  const ey = HY - 1
  const eyes = [HX + 8, HX + 18]
  ctx.fillStyle = OUTLINE
  ctx.strokeStyle = OUTLINE
  ctx.lineCap = 'round'
  for (const ex of eyes) {
    if (pose.eyes === 'x') {
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(ex - 3, ey - 3)
      ctx.lineTo(ex + 3, ey + 3)
      ctx.moveTo(ex + 3, ey - 3)
      ctx.lineTo(ex - 3, ey + 3)
      ctx.stroke()
    } else if (pose.eyes === 'happy') {
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(ex, ey + 2, 3.5, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.ellipse(ex, ey, 2.8, 4.4, 0, 0, Math.PI * 2)
      ctx.fill()
      if (pose.eyes === 'angry') {
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(ex - 4, ey - 9)
        ctx.lineTo(ex + 4, ey - 5.5)
        ctx.stroke()
      }
    }
  }
  if (look.acc.includes('glasses')) {
    ctx.lineWidth = 2
    ctx.strokeStyle = OUTLINE
    for (const ex of eyes) {
      ctx.beginPath()
      ctx.arc(ex, ey, 6.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,230,255,0.35)'
      ctx.fill()
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(eyes[0] + 6.5, ey)
    ctx.lineTo(eyes[1] - 6.5, ey)
    ctx.moveTo(eyes[0] - 6.5, ey)
    ctx.lineTo(HX - 6, ey - 2)
    ctx.stroke()
  }
  if (look.acc.includes('redface')) {
    ctx.fillStyle = 'rgba(255,70,70,0.45)'
    ctx.beginPath()
    ctx.arc(HX + 19, HY + 7, 6, 0, Math.PI * 2)
    ctx.arc(HX + 4, HY + 7, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e24b4b'
    ctx.beginPath()
    ctx.arc(HX + 25, HY + 3, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (look.acc.includes('mustache')) {
    ctx.fillStyle = shade(look.hair === '#bdbdbd' ? '#8a8a8a' : look.hair, -0.1)
    ctx.beginPath()
    ctx.ellipse(HX + 17, HY + 8, 8, 3.2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const mx = HX + 15
  const my = HY + 13
  ctx.strokeStyle = OUTLINE
  ctx.fillStyle = OUTLINE
  ctx.lineWidth = 2.5
  ctx.beginPath()
  if (pose.mouth === 'open') {
    ctx.ellipse(mx, my, 3.5, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (pose.mouth === 'smile') {
    ctx.arc(mx, my - 3, 5, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
  } else if (pose.mouth === 'frown') {
    ctx.arc(mx, my + 3, 4, Math.PI * 1.2, Math.PI * 1.8)
    ctx.stroke()
  } else {
    ctx.moveTo(mx - 4, my)
    ctx.lineTo(mx + 4, my)
    ctx.stroke()
  }
}

function drawHats(ctx: CanvasRenderingContext2D, look: Look) {
  if (look.acc.includes('cap')) {
    ctx.beginPath()
    ctx.arc(HX, HY - 3, HR + 2, Math.PI, Math.PI * 2)
    ctx.closePath()
    strokeFill(ctx, '#0d0d0d')
    roundRect(ctx, HX - HR - 14, HY - 8, 18, 6, 3)
    strokeFill(ctx, '#0d0d0d', 2.5)
    roundRect(ctx, HX - 6, HY - HR - 1, 12, 5, 2)
    ctx.fillStyle = GOLD
    ctx.fill()
  }
  if (look.acc.includes('doppi')) {
    ctx.beginPath()
    ctx.moveTo(HX - HR * 0.98, HY - HR * 0.4)
    ctx.quadraticCurveTo(HX - HR * 0.95, HY - HR * 1.35, HX, HY - HR * 1.3)
    ctx.quadraticCurveTo(HX + HR * 0.95, HY - HR * 1.35, HX + HR * 0.98, HY - HR * 0.4)
    ctx.closePath()
    strokeFill(ctx, '#0b0b0b')
    ctx.fillStyle = '#f4f4f4'
    for (let i = 0; i < 5; i++) {
      const dx = HX - 18 + i * 9
      ctx.beginPath()
      ctx.moveTo(dx, HY - HR * 0.78)
      ctx.lineTo(dx + 3.5, HY - HR * 0.62)
      ctx.lineTo(dx, HY - HR * 0.46)
      ctx.lineTo(dx - 3.5, HY - HR * 0.62)
      ctx.closePath()
      ctx.fill()
    }
  }
  if (look.acc.includes('flatcap')) {
    ctx.beginPath()
    ctx.ellipse(HX + 2, HY - HR * 0.62, HR + 4, HR * 0.48, 0, Math.PI, Math.PI * 2)
    ctx.closePath()
    strokeFill(ctx, '#3a3a3a')
    ctx.beginPath()
    ctx.ellipse(HX + HR * 0.85, HY - HR * 0.6, 13, 4, 0.1, 0, Math.PI * 2)
    strokeFill(ctx, '#2c2c2c', 2.5)
  }
  if (look.acc.includes('supreme')) {
    ctx.beginPath()
    ctx.arc(HX, HY - 3, HR + 2, Math.PI, Math.PI * 2)
    ctx.closePath()
    strokeFill(ctx, SUPREME_RED)
    roundRect(ctx, HX + 6, HY - 10, 26, 6, 3)
    strokeFill(ctx, SUPREME_RED, 2.5)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold italic 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('S', HX + 4, HY - HR * 0.55)
  }
  if (look.acc.includes('visor')) {
    roundRect(ctx, HX - HR + 2, HY - HR * 0.75, HR * 2 - 2, 6, 3)
    strokeFill(ctx, '#ff6fb1', 2.5)
    ctx.beginPath()
    ctx.ellipse(HX + HR + 2, HY - HR * 0.6, 17, 5, 0.12, 0, Math.PI * 2)
    strokeFill(ctx, '#ff6fb1', 2.5)
  }
}

export function drawHead(ctx: CanvasRenderingContext2D, look: Look, pose: Pose) {
  drawHairBack(ctx, look)
  circle(ctx, HX, HY, HR, look.skin)
  drawFace(ctx, look, pose)
  drawHairFront(ctx, look)
  drawHats(ctx, look)
}

function drawTorso(ctx: CanvasRenderingContext2D, look: Look) {
  roundRect(ctx, -16, -64, 32, 38, 9)
  strokeFill(ctx, look.top)
  const a = look.acc
  if (a.includes('stripes')) {
    ctx.strokeStyle = look.trim
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(2, -62)
    ctx.lineTo(2, -28)
    ctx.stroke()
  }
  if (a.includes('blazer')) {
    ctx.beginPath()
    ctx.moveTo(-6, -63)
    ctx.lineTo(10, -63)
    ctx.lineTo(2, -48)
    ctx.closePath()
    ctx.fillStyle = '#f4f4f4'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, -61)
    ctx.lineTo(4, -61)
    ctx.lineTo(5, -46)
    ctx.lineTo(2, -42)
    ctx.lineTo(-1, -46)
    ctx.closePath()
    ctx.fillStyle = look.trim
    ctx.fill()
    ctx.strokeStyle = shade(look.top, 0.25)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-6, -63)
    ctx.lineTo(2, -40)
    ctx.lineTo(10, -63)
    ctx.stroke()
  }
  if (a.includes('tie')) {
    ctx.beginPath()
    ctx.moveTo(-1, -62)
    ctx.lineTo(5, -62)
    ctx.lineTo(6, -44)
    ctx.lineTo(2, -39)
    ctx.lineTo(-2, -44)
    ctx.closePath()
    strokeFill(ctx, look.trim, 1.5)
  }
  if (a.includes('plaid')) {
    ctx.save()
    roundRect(ctx, -16, -64, 32, 38, 9)
    ctx.clip()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 3
    for (let i = -14; i < 16; i += 9) {
      ctx.beginPath()
      ctx.moveTo(i, -64)
      ctx.lineTo(i, -26)
      ctx.stroke()
    }
    for (let j = -58; j < -26; j += 9) {
      ctx.beginPath()
      ctx.moveTo(-16, j)
      ctx.lineTo(16, j)
      ctx.stroke()
    }
    ctx.restore()
  }
  if (a.includes('leather')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-10, -58)
    ctx.lineTo(-10, -34)
    ctx.stroke()
    ctx.strokeStyle = '#777777'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(4, -63)
    ctx.lineTo(4, -27)
    ctx.stroke()
  }
  if (a.includes('supreme')) {
    roundRect(ctx, -10, -58, 22, 11, 1)
    strokeFill(ctx, SUPREME_RED, 1.5)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold italic 7px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Supreme', 1, -52)
    roundRect(ctx, -18, -34, 36, 10, 2)
    strokeFill(ctx, SUPREME_RED, 2)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 6px sans-serif'
    ctx.fillText('SUPREME  SUPREME', 0, -29)
  }
  if (a.includes('hood')) {
    roundRect(ctx, -9, -43, 20, 11, 4)
    ctx.fillStyle = shade(look.top, 0.12)
    ctx.fill()
    ctx.strokeStyle = '#e9e9e9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-2, -63)
    ctx.lineTo(-3, -52)
    ctx.moveTo(8, -63)
    ctx.lineTo(9, -52)
    ctx.stroke()
  }
  if (a.includes('chain')) {
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(3, -66, 12, Math.PI * 0.18, Math.PI * 0.82)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(3, -52, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = GOLD
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = OUTLINE
    ctx.stroke()
  }
}

function drawHeld(ctx: CanvasRenderingContext2D, look: Look, front: [number, number], back: [number, number]) {
  const a = look.acc
  if (a.includes('bottle')) {
    const [x, y] = front
    roundRect(ctx, x - 4, y - 20, 8, 16, 3)
    strokeFill(ctx, '#2e9e4f', 2)
    roundRect(ctx, x - 2, y - 26, 4, 7, 1)
    strokeFill(ctx, '#2e9e4f', 2)
  }
  if (a.includes('wrench')) {
    const [x, y] = front
    ctx.lineCap = 'round'
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 6, y - 20)
    ctx.stroke()
    ctx.strokeStyle = '#b8c0c8'
    ctx.lineWidth = 4
    ctx.stroke()
    circle(ctx, x + 7, y - 23, 5, '#b8c0c8', 2)
  }
  if (a.includes('phone')) {
    const [x, y] = back
    roundRect(ctx, x - 4, y - 12, 8, 13, 2)
    strokeFill(ctx, '#202020', 2)
  }
  if (a.includes('book')) {
    const [x, y] = back
    roundRect(ctx, x - 9, y - 14, 14, 18, 2)
    strokeFill(ctx, '#c0392b', 2)
  }
}

export interface FighterDraw {
  x: number
  y: number
  facing: Facing
  scale: number
  look: Look
  pose: Pose
  alpha?: number
  flash?: boolean
  goldFists?: boolean
  roll?: number
}

export function drawFighter(ctx: CanvasRenderingContext2D, d: FighterDraw) {
  const { look, pose } = d
  const slim = look.slim ?? 1
  const wide = look.wide ?? 1
  ctx.save()
  ctx.globalAlpha = d.alpha ?? 1
  ctx.translate(d.x, d.y)
  ctx.scale(d.facing * d.scale, d.scale)
  if (pose.lying) {
    ctx.translate(0, -14)
    ctx.rotate(-Math.PI / 2)
  } else {
    ctx.translate(0, pose.bob)
    ctx.translate(0, -30)
    ctx.rotate(pose.lean)
    ctx.translate(0, 30)
    if (d.roll) {
      ctx.translate(0, -45)
      ctx.rotate(d.roll)
      ctx.translate(0, 45)
    }
  }
  if (d.flash) ctx.filter = 'brightness(2.2) saturate(0.4)'

  const stripe = look.acc.includes('stripes') ? look.trim : undefined
  const topB = shade(look.top, -0.25)
  const pantsB = shade(look.pants, -0.25)
  const fist = d.goldFists ? GOLD : look.skin

  const short = look.acc.includes('shortsleeve')
  if (look.acc.includes('backpack')) {
    roundRect(ctx, -25, -61, 18, 31, 6)
    strokeFill(ctx, '#171719', 2.5)
    ctx.strokeStyle = '#77787b'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-17, -59)
    ctx.quadraticCurveTo(-8, -63, -7, -53)
    ctx.moveTo(-17, -31)
    ctx.quadraticCurveTo(-7, -31, -7, -42)
    ctx.stroke()
  }
  const backEnd = limb(ctx, -3, -54, pose.armB, 20, 9 * slim * wide, short ? shade(look.skin, -0.12) : topB, stripe)
  if (short) limb(ctx, -3, -54, pose.armB, 9, 10.5 * slim * wide, topB)
  circle(ctx, backEnd[0], backEnd[1], 6, d.goldFists ? GOLD : shade(look.skin, -0.12), 2.5)

  const lb = limb(ctx, -5, -30, pose.legB, 27, 11 * slim * wide, pantsB, stripe)
  ctx.beginPath()
  ctx.ellipse(lb[0] + 3, lb[1] + 1, 8, 5, 0, 0, Math.PI * 2)
  strokeFill(ctx, shade(look.shoes, -0.15), 2.5)

  const lf = limb(ctx, 5, -30, pose.legF, pose.legFLen, 11 * slim * wide, look.pants, stripe)
  ctx.beginPath()
  ctx.ellipse(lf[0] + 3, lf[1] + 1, 8.5, 5.5, 0, 0, Math.PI * 2)
  strokeFill(ctx, look.shoes, 2.5)

  ctx.save()
  ctx.scale(slim * wide, 1)
  drawTorso(ctx, look)
  ctx.restore()
  drawHead(ctx, look, pose)

  const frontEnd = limb(ctx, 5, -54, pose.armF, pose.armFLen, 9 * slim * wide, short ? look.skin : look.top, stripe)
  if (short) limb(ctx, 5, -54, pose.armF, 9, 10.5 * slim * wide, look.top)
  if (d.goldFists) {
    ctx.save()
    ctx.shadowColor = GOLD
    ctx.shadowBlur = 16
    circle(ctx, frontEnd[0], frontEnd[1], 7.5, fist, 2.5)
    ctx.restore()
  } else {
    circle(ctx, frontEnd[0], frontEnd[1], 6.5, fist, 2.5)
  }
  drawHeld(ctx, look, frontEnd, backEnd)

  ctx.restore()
}

export function drawPickup(ctx: CanvasRenderingContext2D, kind: PickupKind, x: number, y: number, t: number) {
  const bob = Math.sin(t * 4) * 4
  ctx.save()
  ctx.translate(x, y - 18 + bob)
  ctx.beginPath()
  ctx.arc(0, 0, 22, 0, Math.PI * 2)
  ctx.fillStyle = kind === 'glove' || isItem(kind) ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.22)'
  ctx.fill()
  switch (kind) {
    case 'iphone':
      for (const [dx, rot, body] of [
        [-5, -0.18, '#3b3f47'],
        [6, 0.14, '#c9ccd2'],
      ] as const) {
        ctx.save()
        ctx.translate(dx, 0)
        ctx.rotate(rot)
        roundRect(ctx, -6, -13, 12, 24, 3)
        strokeFill(ctx, body, 2)
        ctx.fillStyle = '#0b0b0d'
        for (const [cx, cy] of [
          [-2.2, -9],
          [2.2, -9],
          [0, -5.5],
        ]) {
          ctx.beginPath()
          ctx.arc(cx, cy, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      break
    case 'supreme':
      ctx.beginPath()
      ctx.moveTo(-12, -5)
      ctx.lineTo(12, -5)
      ctx.lineTo(13, 11)
      ctx.lineTo(3, 11)
      ctx.lineTo(0, 3)
      ctx.lineTo(-3, 11)
      ctx.lineTo(-13, 11)
      ctx.closePath()
      strokeFill(ctx, '#ffffff', 2.5)
      roundRect(ctx, -13, -11, 26, 7, 2)
      strokeFill(ctx, SUPREME_RED, 2.5)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold italic 6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Supreme', 0, -7)
      break
    case 'tagclub':
      roundRect(ctx, -17, -3, 8, 16, 3)
      strokeFill(ctx, '#b8452a', 2.5)
      roundRect(ctx, 9, -3, 8, 16, 3)
      strokeFill(ctx, '#b8452a', 2.5)
      roundRect(ctx, -11, -8, 22, 21, 4)
      strokeFill(ctx, '#d9593a', 2.5)
      ctx.beginPath()
      ctx.arc(0, -8, 6, 0, Math.PI)
      strokeFill(ctx, '#b8452a', 2)
      ctx.strokeStyle = '#6e1f12'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(-3.5, 4, 3.6, Math.PI * 0.55, Math.PI * 1.6)
      ctx.stroke()
      ctx.fillStyle = '#6e1f12'
      ctx.beginPath()
      ctx.moveTo(4.5, -1)
      ctx.lineTo(6, 4)
      ctx.lineTo(4.5, 9)
      ctx.lineTo(3, 4)
      ctx.closePath()
      ctx.fill()
      break
    case 'cap':
      ctx.beginPath()
      ctx.arc(-1, 3, 12, Math.PI, Math.PI * 2)
      ctx.closePath()
      strokeFill(ctx, '#f1ead6', 2.5)
      roundRect(ctx, 2, 1, 17, 6, 3)
      strokeFill(ctx, '#1a1a1a', 2.5)
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(-9, -2, 14, 2)
      ctx.fillRect(-7, -6, 10, 2)
      break
    case 'kimbap':
      for (const dx of [-7, 7]) {
        circle(ctx, dx, 0, 9, '#1f2a1f', 2.5)
        ctx.beginPath()
        ctx.arc(dx, 0, 6.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.fillStyle = '#f2994a'
        ctx.fillRect(dx - 3, -2, 3, 3)
        ctx.fillStyle = '#27ae60'
        ctx.fillRect(dx, -1, 3, 3)
        ctx.fillStyle = '#f2c94c'
        ctx.fillRect(dx - 2, 1, 3, 3)
      }
      break
    case 'chicken':
      ctx.save()
      ctx.scale(1.42, 1.42)
      ctx.fillStyle = '#f5eee2'
      ctx.beginPath()
      ctx.moveTo(-17, 1)
      ctx.lineTo(17, 1)
      ctx.lineTo(13, 15)
      ctx.lineTo(-13, 15)
      ctx.closePath()
      strokeFill(ctx, '#d6c8b3', 2)
      for (const [cx, cy, rx, ry, rot] of [
        [-8, -8, 10, 9, -0.3],
        [5, -10, 10, 9, 0.4],
        [-1, 3, 10, 8, -0.15],
      ]) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
        strokeFill(ctx, '#c87826', 2)
        ctx.fillStyle = '#e7a33f'
        for (const [dx, dy, r] of [
          [-5, -3, 2],
          [2, -5, 1.7],
          [5, 1, 2],
          [-2, 4, 1.5],
        ]) {
          ctx.beginPath()
          ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = 'rgba(255,232,173,0.72)'
        ctx.beginPath()
        ctx.ellipse(cx - 3, cy - 4, 4, 2, -0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      break
    case 'ramyeon':
      ctx.beginPath()
      ctx.moveTo(-12, -10)
      ctx.lineTo(12, -10)
      ctx.lineTo(9, 12)
      ctx.lineTo(-9, 12)
      ctx.closePath()
      strokeFill(ctx, '#e23636')
      ctx.beginPath()
      ctx.ellipse(0, -10, 13, 4, 0, 0, Math.PI * 2)
      strokeFill(ctx, '#f2f2f2', 2.5)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('辛', 0, 5)
      break
    case 'energy':
      roundRect(ctx, -8, -13, 16, 26, 4)
      strokeFill(ctx, '#2d6cdf')
      ctx.beginPath()
      ctx.moveTo(2, -9)
      ctx.lineTo(-4, 1)
      ctx.lineTo(1, 1)
      ctx.lineTo(-2, 9)
      ctx.lineTo(5, -2)
      ctx.lineTo(0, -2)
      ctx.closePath()
      ctx.fillStyle = GOLD
      ctx.fill()
      break
    case 'glove':
      ctx.shadowColor = GOLD
      ctx.shadowBlur = 14
      roundRect(ctx, -11, -6, 22, 18, 6)
      strokeFill(ctx, GOLD)
      for (let i = 0; i < 4; i++) {
        roundRect(ctx, -11 + i * 5.5, -15, 5, 12, 2.5)
        strokeFill(ctx, GOLD, 2)
      }
      ctx.shadowBlur = 0
      circle(ctx, 0, 3, 3, '#e23636', 1.5)
      break
  }
  ctx.restore()
}

export function drawProjectile(ctx: CanvasRenderingContext2D, kind: ProjectileKind, x: number, y: number, rot: number, dir: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'wave') {
    ctx.scale(dir, 1)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-i * 14, 0, 26 - i * 5, -1.0, 1.0)
      ctx.strokeStyle = i === 0 ? GOLD : `rgba(245,197,24,${0.7 - i * 0.2})`
      ctx.lineWidth = 7 - i * 1.5
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('♪', -8, -16 + Math.sin(t * 20) * 4)
    ctx.fillText('♫', -18, 24 + Math.cos(t * 20) * 4)
    ctx.restore()
    return
  }
  ctx.rotate(rot)
  switch (kind) {
    case 'snowball':
      circle(ctx, 0, 0, 9, '#ffffff', 2.5)
      break
    case 'wrench':
      ctx.lineCap = 'round'
      ctx.strokeStyle = OUTLINE
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(-12, 0)
      ctx.lineTo(10, 0)
      ctx.stroke()
      ctx.strokeStyle = '#b8c0c8'
      ctx.lineWidth = 4.5
      ctx.stroke()
      circle(ctx, 12, 0, 6, '#b8c0c8', 2)
      break
    case 'book':
      roundRect(ctx, -12, -9, 24, 18, 2)
      strokeFill(ctx, '#2d6cdf', 2.5)
      ctx.fillStyle = '#f4f4f4'
      ctx.fillRect(-10, 5, 20, 2)
      break
    case 'exam':
      roundRect(ctx, -11, -14, 22, 28, 2)
      strokeFill(ctx, '#ffffff', 2.5)
      ctx.fillStyle = '#e23636'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('F', 0, 1)
      break
    case 'bottle':
      roundRect(ctx, -5, -12, 10, 20, 3)
      strokeFill(ctx, '#2e9e4f', 2.5)
      roundRect(ctx, -2.5, -19, 5, 8, 1)
      strokeFill(ctx, '#2e9e4f', 2)
      break
    case 'coupon':
      roundRect(ctx, -14, -8, 28, 16, 2)
      strokeFill(ctx, '#f2c94c', 2.5)
      ctx.fillStyle = '#e23636'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('1+1', 0, 1)
      break
    case 'brick':
      roundRect(ctx, -18, -9, 36, 18, 2)
      strokeFill(ctx, SUPREME_RED, 2.5)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold italic 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Supreme', 0, 1)
      break
    case 'phone':
      roundRect(ctx, -7, -12, 14, 24, 3)
      strokeFill(ctx, '#c9ccd2', 2.5)
      roundRect(ctx, -5, -10, 10, 20, 2)
      ctx.fillStyle = '#16181c'
      ctx.fill()
      ctx.fillStyle = '#6fb7ff'
      ctx.fillRect(-3, -3, 6, 8)
      break
  }
  ctx.restore()
}
