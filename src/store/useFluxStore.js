import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fluxBlocks as seedBlocks } from '../data/fluxBlocks'

const defaultSavedPools = [
  {
    id: 'default1',
    name: '🚀 Flux冲刺',
    filters: {
      project: ['Flux'],
    },
  },
]

function cloneSeedBlocks() {
  return seedBlocks.map((block) => ({
    ...block,
    dimensions: Object.fromEntries(
      Object.entries(block.dimensions).map(([key, values]) => [key, [...values]]),
    ),
  }))
}

export const useFluxStore = create(
  persist(
    (set, get) => ({
      fluxBlocks: cloneSeedBlocks(),
      savedPools: defaultSavedPools,
      addBlock: (block) =>
        set((state) => ({
          fluxBlocks: [block, ...state.fluxBlocks],
        })),
      addPool: (pool) =>
        set((state) => ({
          savedPools: [pool, ...state.savedPools],
        })),
      deleteBlock: (blockId) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.filter((block) => block.id !== blockId),
        })),
      getBlockById: (blockId) => get().fluxBlocks.find((block) => block.id === blockId),
      removePool: (poolId) =>
        set((state) => ({
          savedPools: state.savedPools.filter((pool) => pool.id !== poolId),
        })),
      updateBlock: (blockId, updater) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) =>
            block.id === blockId ? { ...block, ...updater(block) } : block,
          ),
        })),
      replaceBlock: (blockId, nextBlock) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) => (block.id === blockId ? nextBlock : block)),
        })),
    }),
    {
      name: 'flux_blocks_store',
      partialize: (state) => ({
        fluxBlocks: state.fluxBlocks,
        savedPools: state.savedPools,
      }),
    },
  ),
)
