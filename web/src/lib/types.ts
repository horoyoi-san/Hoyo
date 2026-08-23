// TypeScript Definitions for AstralOS IPC and Engine Data Structures

export type PacketSource = 'client' | 'server';

export interface DecodedPacket {
  id: number;
  cmd_id: number;
  source: PacketSource;
  name?: string | null;
  head: number[];
  body: number[];
  body_json?: string | null;
  request_id?: number | null;
  custom_packet: boolean;
  timestamp?: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  timestamp_ms: number;
  level: LogLevel;
  target: string;
  message: string;
}

export type ProtoDumpMode = 'class_field_number' | 'merge_from' | 'write_to' | 'asm';

export type DumperAction =
  | { type: 'proto'; mode: ProtoDumpMode }
  | { type: 'c_sharp' }
  | { type: 'parser_data' }
  | { type: 'script' }
  | { type: 'script_v2' }
  | { type: 'resources' };

export interface RawPacket {
  source: PacketSource;
  cmd_id: number;
  head: number[];
  body: number[];
}

export type FrontendCommand =
  | { type: 'run_dumper'; action: DumperAction }
  | { type: 'start_sniffer' }
  | { type: 'stop_sniffer' }
  | { type: 'clear_sniffer' }
  | { type: 'send_packet'; source: PacketSource; cmd_id: number; head: number[]; body: number[] }
  | { type: 'send_packets'; packets: RawPacket[] }
  | { type: 'set_hook_cmd_ids'; cmd_ids: number[] }
  | { type: 'packet_modify_response'; request_id: number; body: number[]; drop_packet: boolean }
  | { type: 'execute_lua'; script: string }
  | { type: 'execute_lua_on_load'; script: string }
  | { type: 'set_dumper_enabled'; enabled: boolean }
  | { type: 'set_cheat_enabled'; name: string; enabled: boolean };

export type BackendEvent =
  | { type: 'log'; entry: LogEntry }
  | { type: 'packet'; packet: DecodedPacket }
  | { type: 'dumper_started'; action: DumperAction }
  | { type: 'dumper_finished'; action: DumperAction; seconds: number }
  | { type: 'dumper_failed'; action: DumperAction; error: string }
  | { type: 'dumper_status'; enabled: boolean }
  | { type: 'cheat_status'; name: string; enabled: boolean }
  | { type: 'sniffer_cleared' }
  | { type: 'send_packet_result'; ok: boolean; error?: string | null };

export interface GachaRecord {
  id: string;
  item_id: string;
  item_type: string;
  name: string;
  rank_type: string;
  time: string;
  gacha_type: string;
}

export interface GachaPityStats {
  character_5star_pity: number;
  lightcone_5star_pity: number;
  standard_5star_pity: number;
  total_pulls: number;
  total_5stars: number;
  total_4stars: number;
  luck_percentage: number;
}
