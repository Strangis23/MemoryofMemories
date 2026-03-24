import type { HighScoreEntry } from '../game/highScores'
import { HIGH_SCORES_LIMIT } from '../game/highScores'

function formatTime(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export type HighScoresPanelProps = {
  difficulty: number
  availableDifficulties: number[]
  entries: HighScoreEntry[]
  onDifficultyChange: (difficulty: number) => void
  latestRankForCurrentDifficulty: number | null
}

export function HighScoresPanel({
  difficulty,
  availableDifficulties,
  entries,
  onDifficultyChange,
  latestRankForCurrentDifficulty,
}: HighScoresPanelProps) {
  return (
    <div className="scoresPanelBody">
      <div className="scoresSubtitle" style={{ marginBottom: 14 }}>
        Top {HIGH_SCORES_LIMIT} runs · {difficulty} pairs
      </div>

      <div className="difficultyBlock" style={{ marginBottom: 12 }}>
        <div className="sectionLabel">Filter by pairs</div>
        <div className="difficultyRow">
        {availableDifficulties.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDifficultyChange(d)}
            className={['diffButton', d === difficulty ? 'diffButtonActive' : ''].join(' ')}
          >
            {d} pairs
          </button>
        ))}
        </div>
      </div>

      {latestRankForCurrentDifficulty ? (
        <div className="scoresNewRank">
          New high score! Rank #{latestRankForCurrentDifficulty}
        </div>
      ) : null}

      <div className="scoresTableWrap">
        <table className="scoresTable">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Rank</th>
              <th style={{ width: 130 }}>Moves</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="scoresEmpty">
                  No scores yet.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const isTop = idx === 0
                return (
                  <tr key={entry.achievedAt}>
                    <td className={isTop ? 'scoresRankTop' : ''}>#{idx + 1}</td>
                    <td>{entry.moves}</td>
                    <td>{formatTime(entry.elapsedMs)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

