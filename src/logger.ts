/**
 * Structured JSON logger for MCP server observability.
 * Outputs to stderr (console.error) so stdout remains clean for MCP protocol.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor(level?: LogLevel) {
    this.level = (process.env.PHONE_LOG_LEVEL as LogLevel) || level || "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  private emit(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    const entry: LogEntry = {
      level,
      msg,
      ts: new Date().toISOString(),
      ...meta,
    };
    console.error(JSON.stringify(entry));
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.emit("debug", msg, meta);
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this.emit("info", msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.emit("warn", msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.emit("error", msg, meta);
  }
}

export const log = new Logger();
