import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeedFluxBlocks } from '../data/seedData'
import { getInitialLanguage } from '../i18n/config'
import { matchesDimensionValue } from '../utils/displayTag'

const MAX_BLOCK_REVISIONS = 5
const MAX_POOL_EVENTS = 12
const MAX_AI_TASKS = 12

const INITIAL_LANGUAGE = getInitialLanguage()

function buildDefaultSavedPools(language = 'zh') {
  return [
    {
      id: 'default1',
      name: language === 'en' ? 'Conflux Sprint' : 'Conflux 冲刺',
      filters: {
        project: ['Conflux'],
      },
    },
  ]
}

function buildTodayStamp() {
  return new Date().toISOString().slice(0, 10)
}

function buildRevisionId(prefix = 'revision') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function cloneDimensions(dimensions = {}) {
  return Object.fromEntries(
    Object.entries(dimensions).map(([key, values]) => [key, Array.isArray(values) ? [...values] : []]),
  )
}

function normalizeRevisionList(revisions = []) {
  if (!Array.isArray(revisions)) return []

  return revisions
    .filter(Boolean)
    .map((revision) => ({ ...revision }))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? 0).getTime()
      const rightTime = new Date(right.createdAt ?? 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, MAX_BLOCK_REVISIONS)
}

function normalizeBlock(block = {}) {
  return {
    ...block,
    dimensions: cloneDimensions(block.dimensions ?? {}),
    revisions: normalizeRevisionList(block.revisions),
  }
}

function normalizeAiTasks(tasks = []) {
  if (!Array.isArray(tasks)) return []

  return tasks
    .filter(Boolean)
    .map((task) => ({ ...task }))
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, MAX_AI_TASKS)
}

function groupLegacyRevisions(revisions = []) {
  const grouped = new Map()

  normalizeRevisionList(revisions).forEach((revision) => {
    if (!revision.blockId) return
    const current = grouped.get(revision.blockId) ?? []
    if (current.length >= MAX_BLOCK_REVISIONS) return
    grouped.set(revision.blockId, [...current, revision])
  })

  return grouped
}

function hydrateFluxBlocks(
  blocks,
  legacyRevisions = [],
  { language = INITIAL_LANGUAGE, seedWhenEmpty = true } = {},
) {
  const hasStoredBlocks = Array.isArray(blocks)
  const sourceBlocks = hasStoredBlocks
    ? blocks.length || !seedWhenEmpty
      ? blocks
      : buildSeedFluxBlocks(language)
    : buildSeedFluxBlocks(language)
  const legacyMap = groupLegacyRevisions(legacyRevisions)

  return sourceBlocks.map((block) => {
    const normalizedBlock = normalizeBlock(block)
    if (normalizedBlock.revisions.length) return normalizedBlock

    const migratedRevisions = legacyMap.get(normalizedBlock.id) ?? []
    return migratedRevisions.length
      ? {
          ...normalizedBlock,
          revisions: migratedRevisions,
        }
      : normalizedBlock
  })
}

function cloneSeedBlocks(language = INITIAL_LANGUAGE) {
  return hydrateFluxBlocks(buildSeedFluxBlocks(language), [], { language })
}

function resolvePersistedFluxBlocks(state, language = INITIAL_LANGUAGE) {
  return Array.isArray(state.fluxBlocks)
    ? hydrateFluxBlocks(state.fluxBlocks, state.recentAssimilationRevisions, {
        language,
        seedWhenEmpty: false,
      })
    : cloneSeedBlocks(language)
}

function resolvePersistedSavedPools(state, language = INITIAL_LANGUAGE) {
  return Array.isArray(state.savedPools) ? state.savedPools : buildDefaultSavedPools(language)
}

function updateBlockRevisions(block, nextRevision) {
  return {
    ...block,
    revisions: normalizeRevisionList([nextRevision, ...(block.revisions ?? [])]),
  }
}

function createRevisionEntry(block, revision, kind) {
  return {
    createdAt: new Date().toISOString(),
    kind,
    blockId: block.id,
    blockTitle: revision.blockTitle ?? block.title ?? '',
    ...revision,
  }
}

export const useFluxStore = create(
  persist(
    (set, get) => ({
      fluxBlocks: cloneSeedBlocks(INITIAL_LANGUAGE),
      savedPools: buildDefaultSavedPools(INITIAL_LANGUAGE),
      peekBlockId: null,
      activePoolContext: null,
      recentPoolEvents: [],
      recentAiTasks: [],
      addBlock: (block) =>
        set((state) => ({
          fluxBlocks: [normalizeBlock({ ...block, revisions: block.revisions ?? [] }), ...state.fluxBlocks],
        })),
      addBlocks: (blocks) =>
        set((state) => ({
          fluxBlocks: [
            ...blocks.map((block) => normalizeBlock({ ...block, revisions: block.revisions ?? [] })),
            ...state.fluxBlocks,
          ],
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
          ].slice(0, MAX_POOL_EVENTS),
        })),
      startAiTask: (task) => {
        const nextTask = {
          id: `ai_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'running',
          ...task,
        }

        set((state) => ({
          recentAiTasks: normalizeAiTasks([nextTask, ...state.recentAiTasks]),
        }))

        return nextTask.id
      },
      updateAiTask: (taskId, patch = {}) =>
        set((state) => ({
          recentAiTasks: normalizeAiTasks(
            state.recentAiTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    ...patch,
                    updatedAt: new Date().toISOString(),
                  }
                : task,
            ),
          ),
        })),
      applyAssimilationRevision: (revision) => {
        let storedRevision = null

        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) => {
            if (block.id !== revision.blockId) return block

            storedRevision = createRevisionEntry(block, revision, revision.kind ?? 'assimilation')
            return updateBlockRevisions(
              {
                ...block,
                content: revision.afterContent,
                updatedAt: buildTodayStamp(),
              },
              storedRevision,
            )
          }),
        }))

        return storedRevision
      },
      recordAssimilationRevision: (revision) => {
        let storedRevision = null

        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) => {
            if (block.id !== revision.blockId) return block

            storedRevision = createRevisionEntry(block, revision, revision.kind ?? 'assimilation')
            return updateBlockRevisions(block, storedRevision)
          }),
        }))

        return storedRevision
      },
      restoreBlockRevision: (blockId, revisionId) => {
        let restoredRevision = null

        set((state) => {
          const block = state.fluxBlocks.find((item) => item.id === blockId)
          const targetRevision = block?.revisions?.find((item) => item.id === revisionId)
          if (!block || !targetRevision) return {}

          const targetContent = targetRevision.afterContent ?? ''
          if ((block.content ?? '') === targetContent) return {}

          restoredRevision = createRevisionEntry(
            block,
            {
              afterContent: targetContent,
              beforeContent: block.content ?? '',
              contextParagraph: targetRevision.contextParagraph ?? '',
              id: buildRevisionId('revision_restore'),
              poolContextKey: targetRevision.poolContextKey ?? null,
              poolId: targetRevision.poolId ?? null,
              poolName: targetRevision.poolName ?? null,
              sourceBlockId: targetRevision.sourceBlockId ?? null,
              sourceBlockTitle: targetRevision.sourceBlockTitle ?? '',
              sourceRevisionId: targetRevision.id,
            },
            'restore',
          )

          return {
            fluxBlocks: state.fluxBlocks.map((item) =>
              item.id === blockId
                ? updateBlockRevisions(
                    {
                      ...item,
                      content: targetContent,
                      updatedAt: buildTodayStamp(),
                    },
                    restoredRevision,
                  )
                : item,
            ),
          }
        })

        return restoredRevision
      },
      undoAssimilationRevision: (blockId, revisionId) => {
        let rollbackRevision = null

        set((state) => {
          const block = state.fluxBlocks.find((item) => item.id === blockId)
          const targetRevision = block?.revisions?.find((item) => item.id === revisionId)
          if (!block || !targetRevision) return {}

          const targetContent = targetRevision.beforeContent ?? ''
          if ((block.content ?? '') === targetContent) return {}

          rollbackRevision = createRevisionEntry(
            block,
            {
              afterContent: targetContent,
              beforeContent: block.content ?? '',
              contextParagraph: targetRevision.contextParagraph ?? '',
              id: buildRevisionId('revision_rollback'),
              poolContextKey: targetRevision.poolContextKey ?? null,
              poolId: targetRevision.poolId ?? null,
              poolName: targetRevision.poolName ?? null,
              sourceBlockId: targetRevision.sourceBlockId ?? null,
              sourceBlockTitle: targetRevision.sourceBlockTitle ?? '',
              sourceRevisionId: targetRevision.id,
            },
            'rollback',
          )

          return {
            fluxBlocks: state.fluxBlocks.map((item) =>
              item.id === blockId
                ? updateBlockRevisions(
                    {
                      ...item,
                      content: targetContent,
                      updatedAt: buildTodayStamp(),
                    },
                    rollbackRevision,
                  )
                : item,
            ),
          }
        })

        return rollbackRevision
      },
      updateBlock: (blockId, updater) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) =>
            block.id === blockId
              ? (() => {
                  const nextPatch = updater(block)
                  return nextPatch ? { ...block, ...nextPatch } : block
                })()
              : block,
          ),
        })),
      removeDimensionValueFromAllBlocks: (dimension, value) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) => {
            const currentValues = block.dimensions?.[dimension] ?? []
            if (!currentValues.some((item) => matchesDimensionValue(dimension, item, value))) return block

            return {
              ...block,
              dimensions: {
                ...cloneDimensions(block.dimensions),
                [dimension]: currentValues.filter((item) => !matchesDimensionValue(dimension, item, value)),
              },
              updatedAt: buildTodayStamp(),
            }
          }),
        })),
      replaceBlock: (blockId, nextBlock) =>
        set((state) => ({
          fluxBlocks: state.fluxBlocks.map((block) => (block.id === blockId ? nextBlock : block)),
        })),
    }),
    {
      name: 'flux_blocks_store',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState && typeof persistedState === 'object' ? persistedState : {}

        return {
          ...state,
          activePoolContext: state.activePoolContext ?? null,
          fluxBlocks: resolvePersistedFluxBlocks(state, INITIAL_LANGUAGE),
          recentAiTasks: normalizeAiTasks(state.recentAiTasks),
          recentPoolEvents: Array.isArray(state.recentPoolEvents)
            ? state.recentPoolEvents.slice(0, MAX_POOL_EVENTS)
            : [],
          savedPools: resolvePersistedSavedPools(state, INITIAL_LANGUAGE),
        }
      },
      partialize: (state) => ({
        fluxBlocks: state.fluxBlocks,
        savedPools: state.savedPools,
        activePoolContext: state.activePoolContext,
        recentAiTasks: state.recentAiTasks,
        recentPoolEvents: state.recentPoolEvents,
      }),
    },
  ),
)
