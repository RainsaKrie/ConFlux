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
      peekBlockId: null,
      activePoolContext: null,
      recentPoolEvents: [],
      recentAssimilationRevisions: [],
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
      setPeekBlockId: (blockId) =>
        set(() => ({
          peekBlockId: blockId,
        })),
      setActivePoolContext: (context) =>
        set(() => ({
          activePoolContext: context,
        })),
      clearActivePoolContext: () =>
        set(() => ({
          activePoolContext: null,
        })),
      recordPoolEvent: (event) =>
        set((state) => ({
          recentPoolEvents: [
            {
              id: `pool_event_${Date.now()}`,
              createdAt: new Date().toISOString(),
              ...event,
            },
            ...state.recentPoolEvents,
          ].slice(0, 12),
        })),
      recordAssimilationRevision: (revision) =>
        set((state) => ({
          recentAssimilationRevisions: [
            {
              createdAt: new Date().toISOString(),
              ...revision,
            },
            ...state.recentAssimilationRevisions,
          ].slice(0, 12),
        })),
      rollbackAssimilationRevision: (revisionId) =>
        set((state) => {
          const revision = state.recentAssimilationRevisions.find((item) => item.id === revisionId)
          if (!revision) return {}

          return {
            fluxBlocks: state.fluxBlocks.map((block) =>
              block.id === revision.blockId
                ? {
                    ...block,
                    content: revision.beforeContent,
                    updatedAt: new Date().toISOString().slice(0, 10),
                  }
                : block,
            ),
            recentAssimilationRevisions: state.recentAssimilationRevisions.map((item) =>
              item.id === revisionId
                ? {
                    ...item,
                    rolledBackAt: new Date().toISOString(),
                  }
                : item,
            ),
          }
        }),
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
        activePoolContext: state.activePoolContext,
        recentPoolEvents: state.recentPoolEvents,
        recentAssimilationRevisions: state.recentAssimilationRevisions,
      }),
    },
  ),
)
