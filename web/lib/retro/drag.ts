export interface Point {
  x: number
  y: number
}
export interface Size {
  w: number
  h: number
}

export function clampPosition(pos: Point, win: Size, bounds: Size): Point {
  const maxX = Math.max(0, bounds.w - win.w)
  const maxY = Math.max(0, bounds.h - win.h)
  return { x: Math.min(maxX, Math.max(0, pos.x)), y: Math.min(maxY, Math.max(0, pos.y)) }
}

export function bringToFront(stack: string[], id: string): string[] {
  return [...stack.filter((s) => s !== id), id]
}

const STEP = 10

export function arrowDelta(key: string, shift: boolean): Point | null {
  const n = shift ? STEP * 4 : STEP
  switch (key) {
    case 'ArrowLeft':
      return { x: -n, y: 0 }
    case 'ArrowRight':
      return { x: n, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: -n }
    case 'ArrowDown':
      return { x: 0, y: n }
    default:
      return null
  }
}
