export type MemoryCardProps = {
  imageUrl: string
  isFaceUp: boolean
  isMatched: boolean
  disabled?: boolean
  onClick: () => void
}

export function MemoryCard({
  imageUrl,
  isFaceUp,
  isMatched,
  disabled,
  onClick,
}: MemoryCardProps) {
  const shouldShowImage = isFaceUp || isMatched

  return (
    <button
      type="button"
      className={[
        'memoryCard',
        isFaceUp ? 'faceUp' : '',
        isMatched ? 'matched' : '',
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      aria-label={isMatched ? 'Matched card' : isFaceUp ? 'Face up card' : 'Face down card'}
    >
      <div className="memoryCardInner">
        <div className="cardFace cardFront">
          <span className="cardFrontPattern" aria-hidden />
          <div className="cardGlyph">?</div>
        </div>
        <div className="cardFace cardBack">
          {shouldShowImage ? (
            <img className="cardImage" src={imageUrl} alt="Memory card" loading="lazy" />
          ) : null}
        </div>
      </div>
    </button>
  )
}

