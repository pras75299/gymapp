// Logger utility for consistent logging across the app
// In production, logs can be disabled or sent to a logging service

const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private readonly sensitivePattern = /(token|authorization|password|secret|cookie|session|payment|qrCodeValue|phone|email)/i;

  private shouldLog(level: LogLevel): boolean {
    if (!isDevelopment) {
      // In production, only log errors
      return level === LogLevel.ERROR;
    }
    return true;
  }

  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
      };
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        if (this.sensitivePattern.test(key)) {
          sanitized[key] = '[REDACTED]';
          return;
        }
        sanitized[key] = this.sanitizeData(value);
      });
      return sanitized;
    }

    if (typeof data === 'string' && this.sensitivePattern.test(data)) {
      return '[REDACTED]';
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const safeData = this.sanitizeData(data);
      console.log(this.formatMessage(LogLevel.DEBUG, message, safeData), safeData || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const safeData = this.sanitizeData(data);
      console.log(this.formatMessage(LogLevel.INFO, message, safeData), safeData || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const safeData = this.sanitizeData(data);
      console.warn(this.formatMessage(LogLevel.WARN, message, safeData), safeData || '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const safeError = this.sanitizeData(error);
      if (isDevelopment) {
        console.error(this.formatMessage(LogLevel.ERROR, message, safeError), safeError || '');
        return;
      }
      console.error(this.formatMessage(LogLevel.ERROR, message));
    }
  }
}

export const logger = new Logger();

