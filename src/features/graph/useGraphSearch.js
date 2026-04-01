import { useCallback, useMemo, useState } from 'react'
import Fuse from 'fuse.js'

export function useGraphSearch(blocks) {
  const [searchQuery, setSearchQuery] = useState('')

  const spotlightFuse = useMemo(
    () =>
      new Fuse(
        blocks
          .filter((block) => block?.id && block?.title)
          .map((block) => ({
            id: block.id,
            title: block.title,
          })),
        {
          keys: ['title'],
          threshold: 0.36,
          ignoreLocation: true,
          minMatchCharLength: 1,
        },
      ),
    [blocks],
  )

  const trimmedSearchQuery = searchQuery.trim()
  const searchResults = useMemo(() => {
    if (!trimmedSearchQuery) return []

    return spotlightFuse.search(trimmedSearchQuery).slice(0, 5).map(({ item }) => item)
  }, [spotlightFuse, trimmedSearchQuery])
  const highlightNodes = useMemo(() => new Set(searchResults.map((result) => result.id)), [searchResults])
  const isSearchActive = trimmedSearchQuery.length > 0

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    clearSearch,
    handleSearchChange,
    highlightNodes,
    isSearchActive,
    searchQuery,
    searchResults,
    setSearchQuery,
    trimmedSearchQuery,
  }
}
