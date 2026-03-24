export type HighScoreEntry = {
  moves: number
  elapsedMs: number
  achievedAt: number
}

export type HighScoresByDifficulty = Record<number, HighScoreEntry[]>

export const HIGH_SCORES_LIMIT = 5

/** Keys are pair counts (2–20). */
const STORAGE_KEY = 'memory-of-memories.highScores.v2'
/** Older saves used grid edge length (2,4,…,20) as the key. */
const STORAGE_KEY_GRID = 'memory-of-memories.highScores.v1'
const LEGACY_STORAGE_KEY = 'memory-of-memory.highScores.v1'

function compareEntries(a: HighScoreEntry, b: HighScoreEntry): number {
  // Ranking: fewer moves first; tie-break by faster time.
  if (a.moves !== b.moves) return a.moves - b.moves
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs
  return a.achievedAt - b.achievedAt
}

function isEntry(value: unknown): value is HighScoreEntry {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<HighScoreEntry>
  return (
    typeof v.moves === 'number' &&
    typeof v.elapsedMs === 'number' &&
    typeof v.achievedAt === 'number'
  )
}

function parseScores(raw: string): HighScoresByDifficulty {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') return {}

  const out: HighScoresByDifficulty = {}
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    const difficulty = Number(k)
    if (!Number.isFinite(difficulty)) continue
    if (!Array.isArray(v)) continue
    const entries = v.filter(isEntry)
    if (entries.length > 0) out[difficulty] = entries
  }
  return out
}

/** Older high scores keyed by grid edge length `g` (board was g×g). */
function migrateGridKeysToPairs(data: HighScoresByDifficulty): HighScoresByDifficulty {
  const out: HighScoresByDifficulty = {}
  for (const [k, entries] of Object.entries(data)) {
    const grid = Number(k)
    if (!Number.isFinite(grid)) continue
    const pairs = (grid * grid) / 2
    if (!Number.isFinite(pairs) || pairs < 1) continue
    const merged = [...(out[pairs] ?? []), ...entries].sort(compareEntries)
    out[pairs] = merged.slice(0, HIGH_SCORES_LIMIT)
  }
  return out
}

function mergePairKeyed(a: HighScoresByDifficulty, b: HighScoresByDifficulty): HighScoresByDifficulty {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].map(Number))
  const out: HighScoresByDifficulty = {}
  for (const pk of keys) {
    const merged = [...(a[pk] ?? []), ...(b[pk] ?? [])].sort(compareEntries)
    if (merged.length > 0) out[pk] = merged.slice(0, HIGH_SCORES_LIMIT)
  }
  return out
}

export function loadHighScores(): HighScoresByDifficulty {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const v2 = parseScores(raw)
      if (Object.keys(v2).length > 0) return v2
    }

    raw = localStorage.getItem(STORAGE_KEY_GRID)
    const fromGrid = raw ? migrateGridKeysToPairs(parseScores(raw)) : {}

    raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    const fromLegacy = raw ? migrateGridKeysToPairs(parseScores(raw)) : {}

    const merged = mergePairKeyed(fromGrid, fromLegacy)
    if (Object.keys(merged).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        localStorage.removeItem(STORAGE_KEY_GRID)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        // ignore
      }
      return merged
    }

    return {}
  } catch {
    return {}
  }
}

export function saveHighScores(data: HighScoresByDifficulty) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore write errors (e.g. storage blocked).
  }
}

export function getHighScoresForDifficulty(
  difficulty: number,
  all: HighScoresByDifficulty = loadHighScores(),
): HighScoreEntry[] {
  return all[difficulty] ?? []
}

export function recordHighScoreForDifficulty(
  difficulty: number,
  entry: HighScoreEntry,
  limit = HIGH_SCORES_LIMIT,
  existing: HighScoresByDifficulty = loadHighScores(),
): { top: HighScoreEntry[]; newRank: number | null } {
  const current = existing[difficulty] ?? []
  const next = [...current, entry].sort(compareEntries)
  const top = next.slice(0, limit)
  const idx = top.findIndex((e) => e.achievedAt === entry.achievedAt)
  const newRank = idx >= 0 ? idx + 1 : null

  const updated: HighScoresByDifficulty = {
    ...existing,
    [difficulty]: top,
  }

  saveHighScores(updated)
  return { top, newRank }
}

