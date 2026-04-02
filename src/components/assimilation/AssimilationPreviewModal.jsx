import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'
import { RevisionDiffPanel } from './RevisionDiffPanel'

const MotionDiv = motion.div

export function AssimilationPreviewModal({ preview, onApply, onCancel }) {
  const { t } = useTranslation()

  if (!preview) return null

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-zinc-900/20 backdrop-blur-sm"
    >
      <MotionDiv
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="absolute left-1/2 top-1/2 flex max-h-[86vh] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">{t('modal.assimilationTitle')}</div>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">{preview.blockTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{t('modal.assimilationDescription')}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              {t('common.cancel')}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <RevisionDiffPanel
              beforeContent={preview.beforeContent}
              afterContent={preview.afterContent}
              beforeLabel={t('modal.currentVersion')}
              afterLabel={t('modal.nextVersion')}
              className="md:col-span-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
          <div className="text-xs text-zinc-400">{t('modal.assimilationFooter')}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              {t('modal.keepCurrent')}
            </button>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              <Check size={12} strokeWidth={2} />
              <span>{t('modal.applyUpdate')}</span>
            </button>
          </div>
        </div>
      </MotionDiv>
    </MotionDiv>
  )
}
