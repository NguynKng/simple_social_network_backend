class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  info(message, ...args) {
    console.log(this.formatMessage('INFO', message, ...args));
  }

  warn(message, ...args) {
    console.warn(this.formatMessage('WARN', message, ...args));
  }

  error(message, ...args) {
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

module.exports = new Logger();
