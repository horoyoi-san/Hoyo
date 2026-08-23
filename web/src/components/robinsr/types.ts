export interface LogMessage {
  id: string;
  time: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'process';
  tag: 'SERVER' | 'PATCH' | 'LAUNCH' | 'DUMP' | 'SYSTEM';
  message: string;
}

export type ConsoleTab = 'ALL' | 'SERVER' | 'DUMP' | 'PATCH' | 'LAUNCH';
