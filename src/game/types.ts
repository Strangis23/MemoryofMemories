export type MemoryCardModel = {
  /**
   * Unique id for React keys.
   * Two cards share the same `pairIndex` but have different `cardId`s.
   */
  cardId: string
  pairIndex: number
  imageUrl: string
}

