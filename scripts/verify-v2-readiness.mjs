import { spawnSync } from 'node:child_process'

const automatedChecks = [
  {
    label: 'Native persistence regression',
    command: ['npm.cmd', 'run', 'verify:native-persistence'],
  },
  {
    label: 'Native media regression',
    command: ['npm.cmd', 'run', 'verify:native-media'],
  },
  {
    label: 'Desktop media configuration regression',
    command: ['npm.cmd', 'run', 'verify:desktop-media-config'],
  },
  {
    label: 'Quick capture enrichment regression',
    command: ['npm.cmd', 'run', 'verify:quick-capture'],
  },
  {
    label: 'Workspace lint',
    command: ['npm.cmd', 'run', 'lint'],
  },
  {
    label: 'Production build',
    command: ['npm.cmd', 'run', 'build', '--', '--configLoader', 'native'],
  },
  {
    label: 'Bundle budget regression',
    command: ['npm.cmd', 'run', 'verify:bundle'],
  },
]

const manualChecklist = [
  'Legacy localStorage -> Tauri Store migration on first desktop launch',
  'Desktop restart recovery for recent title/content/tag edits',
  'Corrupted localStorage / conflux_universe.json fallback and backup capture',
  'Desktop image insert -> restart -> render recovery',
  'Desktop attachment insert -> restart -> local open recovery (manual verification still pending)',
  'Missing image / attachment degradation after file removal',
  'Delete-note / edit-save / startup orphan media cleanup on desktop, including revision-safe media retention',
  'Feed grid/list low-noise interactions and zen-scrollbar behavior in Tauri WebView',
  'Pure Web fallback for localStorage + Data URL media path',
]

const knownBuildNotes = [
  'Rolldown direct-eval dependency noise is suppressed for third-party onnxruntime-web; first-party eval remains blocked by ESLint no-eval.',
  'Transformers / ONNX runtime stay isolated in lazy vendor chunks and are loaded only by semantic retrieval.',
]

function runCheck({ label, command }) {
  console.log(`\n[check] ${label}`)
  const result = spawnSync(command.join(' '), {
    stdio: 'inherit',
    shell: true,
  })

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

try {
  console.log('verify:v2')

  automatedChecks.forEach(runCheck)

  console.log('\n[manual] Remaining desktop checklist')
  manualChecklist.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`)
  })

  console.log('\n[notes] Known build policy')
  knownBuildNotes.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`)
  })

  console.log('\nPASS verify:v2')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFAIL verify:v2 -> ${message}`)
  process.exitCode = 1
}
