/** Shared defaults between main and renderer (settings shape). */
export const DEFAULT_SETTINGS = {
  gaugePath: 'gauge',
  wsPort: 8080,
  logLevel: 'info',
  parallel: false,
  streams: 0,
  strategy: 'lazy',
  maxRetries: 0,
  verbose: false,
  failSafe: false,
  hideSuggestion: false,
  machineReadable: false,
  sort: false,
  simpleConsole: false,
  defaultEnv: 'default',
  extraArgs: '',
  lastProjectPath: ''
}

export const EVENT_TYPES = [
  'ExecutionStarting',
  'ExecutionEnding',
  'SpecExecutionStarting',
  'SpecExecutionEnding',
  'ScenarioExecutionStarting',
  'ScenarioExecutionEnding',
  'StepExecutionStarting',
  'StepExecutionEnding',
  'ConceptExecutionStarting',
  'ConceptExecutionEnding',
  'SuiteResult'
]
