import fs from 'fs/promises';
import path from 'path';

const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

export class BuildLogger {
  constructor(buildId) {
    this.buildId = buildId;
    this.logPath = path.join(LOGS_DIR, `${buildId}.log`);
    this.ensureLogsDirectory();
  }

  async ensureLogsDirectory() {
    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  async write(message) {
    try {
      await fs.appendFile(this.logPath, message, 'utf8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async read() {
    try {
      return await fs.readFile(this.logPath, 'utf8');
    } catch (error) {
      return 'No log data available';
    }
  }

  getLogUrl() {
    return `/api/builds/${this.buildId}/logs`;
  }
}