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
    label: 'Workspace lint',
    command: ['npm.cmd', 'run', 'lint'],
  },
  {
    label: 'Production build',
    command: ['npm.cmd', 'run', 'build', '--', '--configLoader', 'native'],
  },
]

const manualChecklist = [
  'Legacy localStorage -> Tauri Store migration on first desktop launch',
  'Desktop restart recovery for recent title/content/tag edits',
  'Corrupted localStorage / conflux_universe.json fallback and backup capture',
  'Desktop image insert -> restart -> render recovery',
  'Desktop attachment insert -> restart -> local open recovery',
  'Missing image / attachment degradation after file removal',
  'Delete-note / edit-save / startup orphan media cleanup on desktop',
  'Pure Web fallback for localStorage + Data URL media path',
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

  console.log('\nPASS verify:v2')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFAIL verify:v2 -> ${message}`)
  process.exitCode = 1
}
