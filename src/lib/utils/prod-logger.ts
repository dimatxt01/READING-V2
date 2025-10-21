// Production-safe console wrapper that only logs in development
const isDevelopment = process.env.NODE_ENV === 'development'

export const safeConsole = {
  log: isDevelopment ? console.log.bind(console) : () => {},
  error: isDevelopment ? console.error.bind(console) : () => {},
  warn: isDevelopment ? console.warn.bind(console) : () => {},
  info: isDevelopment ? console.info.bind(console) : () => {},
  debug: isDevelopment ? console.debug.bind(console) : () => {},
}

// Use existing logger for production logging
export { logger } from './logger'