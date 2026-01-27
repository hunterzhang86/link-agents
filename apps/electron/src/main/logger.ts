import log from 'electron-log/main'
import { app } from 'electron'
import { join } from 'path'
import { homedir } from 'os'

let _isDebugMode: boolean | undefined

/**
 * Debug mode is enabled when running from source (not packaged) or with --debug flag.
 * - true: `bun run electron:start` or `electron .` or packaged app with `--debug`
 * - false: bundled .app/.exe release without --debug flag
 */
export const isDebugMode = () => {
  if (_isDebugMode === undefined) {
    _isDebugMode = !app.isPackaged || process.argv.includes('--debug')
  }
  return _isDebugMode
}

/**
 * Initialize logger configuration. Must be called after app is ready.
 */
export function initializeLogger() {
  // Configure transports based on debug mode
  if (isDebugMode()) {
    // JSON format for file (agent-parseable)
    // Note: format expects (params: FormatParams) => any[], where params.message has the LogMessage fields
    log.transports.file.format = ({ message }) => [
      JSON.stringify({
        timestamp: message.date.toISOString(),
        level: message.level,
        scope: message.scope,
        message: message.data,
      }),
    ]

    log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB

    // Console output in debug mode with readable format
    // Note: format must return an array - electron-log's transformStyles calls .reduce() on it
    log.transports.console.format = ({ message }) => {
      const scope = message.scope ? `[${message.scope}]` : ''
      const level = message.level.toUpperCase().padEnd(5)
      const data = message.data
        .map((d: unknown) => (typeof d === 'object' ? JSON.stringify(d) : String(d)))
        .join(' ')
      return [`${message.date.toISOString()} ${level} ${scope} ${data}`]
    }
    log.transports.console.level = 'debug'
  } else {
    // In production: enable info-level logging to file for debugging
    // Explicitly set log file path to ensure it's created
    const appName = app.getName()
    let logDir: string
    if (process.platform === 'darwin') {
      logDir = join(homedir(), 'Library', 'Logs', appName)
    } else if (process.platform === 'win32') {
      logDir = join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), appName, 'logs')
    } else {
      logDir = join(homedir(), '.config', appName, 'logs')
    }
    
    // Set the log file path explicitly
    log.transports.file.resolvePathFn = () => join(logDir, 'main.log')
    
    log.transports.file.level = 'info'
    log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB
    
    // Disable console output in production (but keep error level for critical issues)
    log.transports.console.level = 'error'
    
    // Force log file to be created immediately by writing a test message
    // This ensures the log file path is available
    const logPath = join(logDir, 'main.log')
    log.info('=== Link Agents started ===')
    log.info(`App version: ${app.getVersion()}`)
    log.info(`Platform: ${process.platform}`)
    log.info(`Arch: ${process.arch}`)
    log.info(`Log file location: ${logPath}`)
    
    // Also output to console.error so it's visible in terminal if app is launched from command line
    console.error(`[Link Agents] Log file: ${logPath}`)
    console.error(`[Link Agents] To view logs: tail -f "${logPath}"`)
  }
}

// Export scoped loggers for different modules
export const mainLog = log.scope('main')
export const sessionLog = log.scope('session')
export const ipcLog = log.scope('ipc')
export const windowLog = log.scope('window')
export const agentLog = log.scope('agent')

/**
 * Get the path to the current log file.
 * Returns the log file path in both debug and production modes.
 */
export function getLogFilePath(): string | undefined {
  return log.transports.file.getFile()?.path
}

export default log
