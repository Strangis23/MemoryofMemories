import { useEffect, useMemo, useRef, useState } from 'react'
import { bestGridLayout } from './game/boardLayout'
import { createDeck } from './game/createDeck'
import { shuffle } from './game/shuffle'
import type { MemoryCardModel } from './game/types'
import { GameBoard, type GameBoardWinResult } from './components/GameBoard'
import { PhotoPicker } from './components/PhotoPicker'
import { HighScoresPanel } from './components/HighScoresPanel'
import {
  loadHighScores,
  recordHighScoreForDifficulty,
  type HighScoresByDifficulty,
} from './game/highScores'
import { clearPersistedPhotos } from './game/photoStorage'

const pairOptions = Array.from({ length: 19 }, (_, i) => i + 2) as readonly number[]

export default function App() {
  const [pairCount, setPairCount] = useState<number>(8)
  const requiredPairs = pairCount

  const [photoPoolUrls, setPhotoPoolUrls] = useState<string[] | null>(null)
  /** When the library has more images than this board needs, exactly `requiredPairs` URLs for this game. */
  const [selectedForGame, setSelectedForGame] = useState<string[]>([])
  const [deck, setDeck] = useState<MemoryCardModel[] | null>(null)
  const [gameMode, setGameMode] = useState<'setup' | 'playing' | 'highscores'>('setup')
  const [winResult, setWinResult] = useState<GameBoardWinResult | null>(null)
  const [photoPickerKey, setPhotoPickerKey] = useState(0)

  const [scoresByDifficulty, setScoresByDifficulty] = useState<HighScoresByDifficulty>(() => loadHighScores())
  const [highScoreDifficulty, setHighScoreDifficulty] = useState<number>(pairCount)
  const [latestRank, setLatestRank] = useState<number | null>(null)
  const [latestRankDifficulty, setLatestRankDifficulty] = useState<number | null>(null)
  const didRecordWinRef = useRef(false)

  const needsExplicitPick =
    photoPoolUrls !== null && photoPoolUrls.length > requiredPairs

  const imagesReadyForGame = useMemo(() => {
    if (!photoPoolUrls || photoPoolUrls.length < requiredPairs) return null
    if (photoPoolUrls.length === requiredPairs) return photoPoolUrls
    if (selectedForGame.length !== requiredPairs) return null
    return selectedForGame
  }, [photoPoolUrls, requiredPairs, selectedForGame])

  const canStart = imagesReadyForGame !== null

  useEffect(() => {
    if (!photoPoolUrls) {
      setSelectedForGame([])
      return
    }
    if (photoPoolUrls.length <= requiredPairs) {
      setSelectedForGame([])
      return
    }
    setSelectedForGame((prev) => {
      const pool = new Set(photoPoolUrls)
      const kept = prev.filter((u) => pool.has(u))
      if (kept.length > requiredPairs) return kept.slice(0, requiredPairs)
      return kept
    })
  }, [photoPoolUrls, requiredPairs])

  const gameLocked = gameMode === 'playing'
  const showSetup = gameMode === 'setup'
  const showHighScores = gameMode === 'highscores'

  const boardTitle = useMemo(() => {
    const { cols, rows } = bestGridLayout(pairCount * 2)
    return `${pairCount} pairs (${rows}×${cols} grid)`
  }, [pairCount])

  const pickRandomSubset = () => {
    if (!photoPoolUrls || photoPoolUrls.length < requiredPairs) return
    setSelectedForGame(shuffle([...photoPoolUrls]).slice(0, requiredPairs))
  }

  const toggleGamePhoto = (url: string) => {
    setSelectedForGame((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url)
      if (prev.length >= requiredPairs) return prev
      return [...prev, url]
    })
  }

  const startGame = () => {
    const chosenImages = imagesReadyForGame
    if (!chosenImages) return
    didRecordWinRef.current = false
    const nextDeck = createDeck(shuffle(chosenImages))
    setDeck(nextDeck)
    setWinResult(null)
    setGameMode('playing')
  }

  const restartGame = () => {
    const chosenImages = imagesReadyForGame
    if (!chosenImages) return
    didRecordWinRef.current = false
    const nextDeck = createDeck(shuffle(chosenImages))
    setDeck(nextDeck)
    setWinResult(null)
    setLatestRank(null)
    setLatestRankDifficulty(null)
    setGameMode('playing')
  }

  const handleWin = (result: GameBoardWinResult) => {
    if (didRecordWinRef.current) return
    didRecordWinRef.current = true

    const achievedAt = Date.now()
    const { top, newRank } = recordHighScoreForDifficulty(pairCount, {
      moves: result.moves,
      elapsedMs: result.elapsedMs,
      achievedAt,
    })

    setScoresByDifficulty((prev) => ({ ...prev, [pairCount]: top }))
    setLatestRank(newRank)
    setLatestRankDifficulty(pairCount)
    setHighScoreDifficulty(pairCount)

    setWinResult(result)
    setDeck(null)
    setGameMode('highscores')
  }

  const handleChangePairCount = (nextPairs: number) => {
    if (gameLocked) return
    didRecordWinRef.current = false
    setPairCount(nextPairs)
    setSelectedForGame([])
    setDeck(null)
    setWinResult(null)
    setLatestRank(null)
    setLatestRankDifficulty(null)
    setGameMode('setup')
  }

  const handleNewPhotos = () => {
    void (async () => {
      didRecordWinRef.current = false
      setDeck(null)
      setWinResult(null)
      setPhotoPoolUrls(null)
      setSelectedForGame([])
      setGameMode('setup')
      setLatestRank(null)
      setLatestRankDifficulty(null)
      await clearPersistedPhotos()
      setPhotoPickerKey((k) => k + 1)
    })()
  }

  return (
    <div className="appShell appMain">
      <header className="appHeader">
        <h1 className="appTitle">Memory of Memories</h1>
        <p className="appTagline">Flip cards and match every pair of your photos.</p>
      </header>

      {showSetup ? (
        <div className="setupSection panel panelElevated">
          <div className="panelBody">
            <div className="difficultyBlock">
              <div className="sectionLabel">Difficulty</div>
              <div className="difficultyRow">
                {pairOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={gameLocked}
                    onClick={() => handleChangePairCount(n)}
                    className={['diffButton', n === pairCount ? 'diffButtonActive' : ''].join(' ')}
                  >
                    {n} pairs
                  </button>
                ))}
              </div>
            </div>

            <div className="boardSummary">
              Current board: <strong>{boardTitle}</strong>
              <span style={{ opacity: 0.85 }}> · {pairCount * 2} cards</span>
            </div>

            <div className="setupActions">
              <button type="button" onClick={startGame} disabled={!canStart} className={['btn', 'btnPrimary'].join(' ')}>
                Start game
              </button>
              <button
                type="button"
                onClick={() => {
                  setLatestRank(null)
                  setLatestRankDifficulty(null)
                  setGameMode('highscores')
                }}
                className={['btn', 'btnSmall'].join(' ')}
              >
                High scores
              </button>
              <p className="setupTip">Photos are saved on this device and reused whenever you come back.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={['boardSection', showSetup ? '' : 'photoSectionHidden'].join(' ')}>
        <div className="panel panelElevated">
          <div className="panelBody">
            <PhotoPicker
              key={photoPickerKey}
              requiredPairs={requiredPairs}
              disabled={!showSetup}
              onSelectionChange={setPhotoPoolUrls}
              canStartGame={canStart}
              needsGameSelection={needsExplicitPick}
              selectedForGame={selectedForGame}
              onToggleGamePhoto={toggleGamePhoto}
              onRandomForGame={pickRandomSubset}
            />
          </div>
        </div>
      </div>

      {deck ? (
        <div className="boardSection" style={{ marginTop: 20 }}>
          <div className="playingToolbar">
            <div className="playingBoardTitle">
              <h2>{boardTitle}</h2>
              <p>Match every pair to finish. Fewer moves is better.</p>
            </div>
            <div className="playingActions">
              <button
                type="button"
                onClick={restartGame}
                disabled={!canStart}
                className={['btn', 'btnSmall'].join(' ')}
              >
                Restart
              </button>
              <button type="button" onClick={handleNewPhotos} disabled={gameLocked} className={['btn', 'btnSmall'].join(' ')}>
                New photos
              </button>
            </div>
          </div>

          <GameBoard deck={deck} onWin={handleWin} />
        </div>
      ) : null}

      {showHighScores ? (
        <div className="boardSection" style={{ marginTop: 16 }}>
          <div className="panel panelElevated">
            <div className="panelBody">
              <div className="highScoresBar">
                <div style={{ textAlign: 'left' }}>
                  {winResult ? (
                    <>
                      <p className="winHeadline">You win!</p>
                      <p className="winSub">
                        {winResult.moves} moves · ~{Math.floor(winResult.elapsedMs / 1000)}s
                      </p>
                    </>
                  ) : (
                    <p className="highScoresHeadline">High scores</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWinResult(null)
                    setLatestRank(null)
                    setLatestRankDifficulty(null)
                    setGameMode('setup')
                  }}
                  className={['btn', 'btnSmall'].join(' ')}
                >
                  Back
                </button>
              </div>

              <HighScoresPanel
                difficulty={highScoreDifficulty}
                availableDifficulties={[...pairOptions]}
                entries={scoresByDifficulty[highScoreDifficulty] ?? []}
                onDifficultyChange={setHighScoreDifficulty}
                latestRankForCurrentDifficulty={
                  highScoreDifficulty === latestRankDifficulty ? latestRank : null
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
