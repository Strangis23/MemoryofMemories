import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  appendImageFiles,
  clearPersistedPhotos,
  loadAllPhotos,
} from '../game/photoStorage'

export type PhotoPickerProps = {
  requiredPairs: number
  onSelectionChange: (photoUrls: string[] | null) => void
  disabled?: boolean
  /** When set, drives “ready” hint text (e.g. library is large enough but a subset must still be chosen). */
  canStartGame?: boolean
  /** Library has more images than this board needs — highlight picks in the grid below. */
  needsGameSelection?: boolean
  selectedForGame?: string[]
  onToggleGamePhoto?: (url: string) => void
  onRandomForGame?: () => void
}

type PoolEntry = { id: number; url: string }

export function PhotoPicker({
  requiredPairs,
  onSelectionChange,
  disabled,
  canStartGame,
  needsGameSelection,
  selectedForGame = [],
  onToggleGamePhoto,
  onRandomForGame,
}: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const poolUrlsRef = useRef<string[]>([])
  const [pool, setPool] = useState<PoolEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange

  const selectedSet = useMemo(() => new Set(selectedForGame), [selectedForGame])

  const revokeAll = useCallback((urls: string[]) => {
    for (const u of urls) URL.revokeObjectURL(u)
  }, [])

  const reloadFromDb = useCallback(async () => {
    const rows = await loadAllPhotos()
    revokeAll(poolUrlsRef.current)
    const next: PoolEntry[] = rows.map((r) => ({
      id: r.id,
      url: URL.createObjectURL(r.blob),
    }))
    poolUrlsRef.current = next.map((p) => p.url)
    setPool(next)
    onSelectionChangeRef.current(next.length > 0 ? next.map((p) => p.url) : null)
  }, [revokeAll])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        await reloadFromDb()
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load saved photos (storage may be unavailable).',
          )
          onSelectionChangeRef.current(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadFromDb])

  useEffect(() => {
    return () => {
      revokeAll(poolUrlsRef.current)
      poolUrlsRef.current = []
    }
  }, [revokeAll])

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError(null)
    try {
      await appendImageFiles(files)
      await reloadFromDb()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save photos to this browser.',
      )
    }
  }

  const handleClearPool = async () => {
    if (disabled) return
    setError(null)
    try {
      await clearPersistedPhotos()
      revokeAll(poolUrlsRef.current)
      poolUrlsRef.current = []
      setPool([])
      onSelectionChangeRef.current(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not clear saved photos.',
      )
    }
  }

  const selectedCount = pool.length
  const enoughInLibrary = selectedCount >= requiredPairs
  const ready = canStartGame !== undefined ? canStartGame : enoughInLibrary

  const hintClass = ready
    ? 'photoPickerHint photoPickerHint--ready'
    : selectedCount === 0
      ? 'photoPickerHint'
      : 'photoPickerHint photoPickerHint--warn'

  const hintText = (() => {
    if (ready) {
      return `Ready — you can start with ${requiredPairs} photos for this board.`
    }
    if (selectedCount === 0) {
      return 'Choose one or more images. They stay on this device for next time.'
    }
    if (selectedCount < requiredPairs) {
      return `Need at least ${requiredPairs} photos for this difficulty (${selectedCount} saved).`
    }
    return `Highlight ${requiredPairs} photos in your library below, or tap Random.`
  })()

  const picking = Boolean(
    needsGameSelection && onToggleGamePhoto && pool.length > requiredPairs,
  )
  const atPickCap = selectedForGame.length >= requiredPairs

  return (
    <div className="photoPicker">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || loading}
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <div className="photoPickerRow">
        <button
          type="button"
          disabled={disabled || loading}
          className={['btn', 'btnPrimary'].join(' ')}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? 'Loading…' : 'Add photos'}
        </button>
        {selectedCount > 0 ? (
          <div className="photoPickerStatus">
            <strong>{selectedCount}</strong> saved {selectedCount === 1 ? 'photo' : 'photos'}
          </div>
        ) : (
          <div className="photoPickerStatus">{loading ? 'Restoring…' : 'No photos yet'}</div>
        )}
        <button
          type="button"
          disabled={disabled || loading || selectedCount === 0}
          className={['btn', 'btnSmall'].join(' ')}
          onClick={() => void handleClearPool()}
        >
          Clear all
        </button>
        {picking ? (
          <>
            <span className="photoPickerGameCount" aria-live="polite">
              {selectedForGame.length} / {requiredPairs} for this game
            </span>
            <button
              type="button"
              disabled={disabled || loading || selectedCount < requiredPairs}
              className={['btn', 'btnSmall'].join(' ')}
              onClick={() => onRandomForGame?.()}
            >
              Random
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="photoPickerError">{error}</p>
      ) : (
        <p className={hintClass}>{hintText}</p>
      )}

      {pool.length > 0 ? (
        <div
          className={[
            'photoThumbGrid',
            picking ? 'photoThumbGrid--scroll' : '',
          ].join(' ')}
        >
          {(picking ? pool : pool.slice(0, 16)).map((p) => {
            if (picking) {
              const isOn = selectedSet.has(p.url)
              const dimmed = !isOn && atPickCap
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled || dimmed}
                  className={[
                    'libraryThumbBtn',
                    isOn ? 'libraryThumbBtn--on' : '',
                    dimmed ? 'libraryThumbBtn--blocked' : '',
                  ].join(' ')}
                  onClick={() => onToggleGamePhoto?.(p.url)}
                  aria-pressed={isOn}
                  aria-label={isOn ? 'Remove from this game' : 'Use in this game'}
                  title={dimmed ? 'Deselect another photo first' : undefined}
                >
                  <img src={p.url} alt="" className="libraryThumbImg" />
                  {isOn ? <span className="libraryThumbCheck" aria-hidden /> : null}
                </button>
              )
            }
            return (
              <img
                key={p.id}
                src={p.url}
                alt=""
                className="photoThumb"
              />
            )
          })}
          {!picking && pool.length > 16 ? (
            <div className="photoThumbMore">+{pool.length - 16} more in your library</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
