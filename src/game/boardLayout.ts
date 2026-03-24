/**
 * Picks row/column counts for a full rectangular grid with `cardCount` cells,
 * as close to square as possible (minimizing |rows − cols| among exact divisors).
 */
export function bestGridLayout(cardCount: number): { cols: number; rows: number } {
  if (cardCount < 1) return { cols: 1, rows: 1 }
  let bestCols = cardCount
  let bestRows = 1
  let bestDiff = cardCount - 1
  const limit = Math.floor(Math.sqrt(cardCount))
  for (let r = 1; r <= limit; r++) {
    if (cardCount % r !== 0) continue
    const c = cardCount / r
    const diff = Math.abs(c - r)
    if (diff < bestDiff) {
      bestDiff = diff
      bestCols = Math.max(c, r)
      bestRows = Math.min(c, r)
    }
  }
  return { cols: bestCols, rows: bestRows }
}
