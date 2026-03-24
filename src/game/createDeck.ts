import type { MemoryCardModel } from './types'
import { shuffle } from './shuffle'

/**
 * Creates a memory deck with 2 cards per provided image.
 * Each image URL becomes one `pairIndex`.
 */
export function createDeck(imageUrls: string[]): MemoryCardModel[] {
  const deck: MemoryCardModel[] = []

  imageUrls.forEach((imageUrl, pairIndex) => {
    deck.push({
      cardId: `${pairIndex}-0`,
      pairIndex,
      imageUrl,
    })
    deck.push({
      cardId: `${pairIndex}-1`,
      pairIndex,
      imageUrl,
    })
  })

  return shuffle(deck)
}

