// 116: ▼ ▶ ◀ drawn as pixels. Press Start 2P has no arrow glyphs, and a fallback font's triangle would
// be smooth next to pixel letters. One em square on the font's own 8 by 8 grid, so at the box's size
// (a whole number of device pixels per font pixel) it is exactly as crisp as the letters.
const RECTS: Record<'down' | 'up' | 'right' | 'left', [number, number, number, number][]> = {
  // 118: the scroll indicator's ▲
  up: [
    [3, 2, 1, 1],
    [2, 3, 3, 1],
    [1, 4, 5, 1],
    [0, 5, 7, 1],
  ],
  down: [
    [0, 2, 7, 1],
    [1, 3, 5, 1],
    [2, 4, 3, 1],
    [3, 5, 1, 1],
  ],
  right: [
    [2, 0, 1, 7],
    [3, 1, 1, 5],
    [4, 2, 1, 3],
    [5, 3, 1, 1],
  ],
  left: [
    [5, 0, 1, 7],
    [4, 1, 1, 5],
    [3, 2, 1, 3],
    [2, 3, 1, 1],
  ],
}

export function PixelArrow({ dir, className }: { dir: 'down' | 'up' | 'right' | 'left'; className?: string }) {
  return (
    <svg className={className ? `parrow ${className}` : 'parrow'} viewBox="0 0 8 8" width="1em" height="1em" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
      {RECTS[dir].map(([x, y, w, h]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  )
}
