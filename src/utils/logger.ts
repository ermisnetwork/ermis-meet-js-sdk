export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export function log(level: LogLevel, message: string, ...args: any[]) {
  const prefix = `[MeetingSDK][${level.toUpperCase()}]`;
  console[level === LogLevel.ERROR ? 'error' : 'log'](prefix, message, ...args);
}
