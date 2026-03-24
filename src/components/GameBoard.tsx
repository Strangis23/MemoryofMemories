import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { bestGridLayout } from '../game/boardLayout'
import type { MemoryCardModel } from '../game/types'
import { MemoryCard } from './MemoryCard'

export type GameBoardWinResult = {
  moves: number
  elapsedMs: number
}

export type GameBoardProps = {
  deck: MemoryCardModel[]
  onWin: (result: GameBoardWinResult) => void
}

const formatTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function GameBoard({ deck, onWin }: GameBoardProps) {
  const totalCards = deck.length
  const expectedPairs = totalCards / 2
  const { cols, rows } = bestGridLayout(totalCards)
  const [revealed, setRevealed] = useState<number[]>([])
  const [matchedPairIndices, setMatchedPairIndices] = useState<Set<number>>(() => new Set())
  const [moves, setMoves] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [lock, setLock] = useState(false)

  const didWinRef = useRef(false)

  const matchedCount = matchedPairIndices.size
  const isWon = matchedCount === expectedPairs

  const revealedSet = useMemo(() => new Set(revealed), [revealed])

  useEffect(() => {
    if (!isWon) return
    if (didWinRef.current) return
    didWinRef.current = true
    onWin({ moves, elapsedMs })
  }, [elapsedMs, isWon, moves, onWin])

  useEffect(() => {
    if (startAt === null) return
    if (isWon) return

    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startAt)
    }, 100)

    return () => window.clearInterval(id)
  }, [isWon, startAt])

  const handleFlip = (index: number) => {
    if (lock) return
    if (isWon) return
    if (revealedSet.has(index)) return

    const card = deck[index]
    if (!card) return
    if (matchedPairIndices.has(card.pairIndex)) return

    // Only allow flipping two cards at a time.
    if (revealed.length === 2) return

    if (startAt === null) setStartAt(Date.now())

    const nextRevealed = [...revealed, index]
    setRevealed(nextRevealed)

    if (nextRevealed.length !== 2) return

    setMoves((m) => m + 1)

    const [aIdx, bIdx] = nextRevealed
    const a = deck[aIdx]
    const b = deck[bIdx]

    if (a.pairIndex === b.pairIndex) {
      setMatchedPairIndices((prev) => {
        const next = new Set(prev)
        next.add(a.pairIndex)
        return next
      })
      // Hide both after the match animation delay.
      window.setTimeout(() => setRevealed([]), 250)
      return
    }

    setLock(true)
    window.setTimeout(() => {
      setRevealed([])
      setLock(false)
    }, 900)
  }

  const gridSpan = Math.max(cols, rows)
  const boardGap = gridSpan >= 18 ? 4 : gridSpan >= 12 ? 6 : 8

  const boardStyle: CSSProperties = {
    ['--board-gap' as any]: `${boardGap}px`,
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  }

  return (
    <div className="gameWrap">
      <div className="panel">
        <div className="panelHeader">
          <div className="gameHeader">
            <div className="gameHeaderItem">
              <span className="gameStatLabel">Moves</span>
              <span className="gameStatValue">{moves}</span>
            </div>
            <div className="gameHeaderItem">
              <span className="gameStatLabel">Time</span>
              <span className="gameStatValue">{formatTime(elapsedMs)}</span>
            </div>
            <div className="gameHeaderItem">
              <span className="gameStatLabel">Matched</span>
              <span className="gameStatValue">
                {matchedCount} / {expectedPairs}
              </span>
            </div>
          </div>
        </div>

        <div className="panelBody">
          <div className="board" style={boardStyle}>
            {deck.map((card, idx) => {
              const isFaceUp = revealedSet.has(idx) || matchedPairIndices.has(card.pairIndex)
              const isMatched = matchedPairIndices.has(card.pairIndex)
              return (
                <MemoryCard
                  key={card.cardId}
                  imageUrl={card.imageUrl}
                  isFaceUp={isFaceUp}
                  isMatched={isMatched}
                  disabled={lock || isWon}
                  onClick={() => handleFlip(idx)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

