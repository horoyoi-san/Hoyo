import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  FolderOpen,
  Zap,
  CheckCircle2,
  Volume2,
  Languages,
  Check,
  RotateCcw,
  Copy,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Card, Input, SectionHeader } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { isTauri, tauriApi, GameLanguageState, LanguagePatchResult } from '../../lib/tauri';
import { pickDirectory } from '../../lib/filePicker';

interface LangOption {
  code: string;
  name: string;
  nativeName: string;
}

const TEXT_LANGUAGES: LangOption[] = [
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh-cn', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'zh-tw', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

const VOICE_LANGUAGES: LangOption[] = [
  { code: 'ja', name: 'Japanese Voice', nativeName: '日本語音声' },
  { code: 'en', name: 'English Voice', nativeName: 'English Voiceover' },
  { code: 'zh', name: 'Chinese Voice', nativeName: '中文配音' },
  { code: 'ko', name: 'Korean Voice', nativeName: '한국어 음성' },
];

export function LanguagePatcherView() {
  const { isTh } = useT();
  const gamePath = useAppStore((state) => state.gamePath);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [selectedText, setSelectedText] = useState<string>('th');
  const [selectedVoice, setSelectedVoice] = useState<string>('ja');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LanguagePatchResult | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const isThRef = useRef(isTh);
  useEffect(() => {
    isThRef.current = isTh;
  }, [isTh]);

  const loadCurrentLanguage = useCallback(async () => {
    if (isTauri() && gamePath) {
      try {
        const state: GameLanguageState = await tauriApi.getGameLanguages(gamePath);
        if (state.currentTextLang) setSelectedText(state.currentTextLang);
        if (state.currentAudioLang) setSelectedVoice(state.currentAudioLang);
        addLog(isThRef.current ? `[*] ตรวจพบการตั้งค่าภาษาปัจจุบัน: Text=${state.currentTextLang.toUpperCase()}, Voice=${state.currentAudioLang.toUpperCase()}` : `[*] Detected current language: Text=${state.currentTextLang.toUpperCase()}, Voice=${state.currentAudioLang.toUpperCase()}`);
      } catch (e) {
        console.debug('Failed to get game languages:', e);
      }
    }
  }, [gamePath]);

  useEffect(() => {
    loadCurrentLanguage();
  }, [loadCurrentLanguage]);

  const handleBrowseGamePath = async () => {
    const p = await pickDirectory();
    if (p) {
      updateSettings({ gamePath: p });
      addLog(isTh ? `[*] เลือกโฟลเดอร์ตัวเกม: ${p}` : `[*] Selected Game Directory: ${p}`);
    }
  };

  const handleApplyLanguage = async () => {
    if (!gamePath) return;
    setLoading(true);
    setResult(null);
    addLog(isTh ? `[*] กำลังเปลี่ยนภาษาเกมเป็น Text=[${selectedText}] Voice=[${selectedVoice}]...` : `[*] Switching language to Text=[${selectedText}] Voice=[${selectedVoice}]...`);

    if (isTauri()) {
      try {
        const res = await tauriApi.setGameLanguage(gamePath, selectedText, selectedVoice);
        setResult(res);
        addLog(isTh ? `[OK] เปลี่ยนภาษาสำเร็จ: ${res.message}` : `[OK] Successfully switched language: ${res.message}`);
      } catch (e) {
        addLog(`[ERR] Error: ${e}`);
      }
    } else {
      setTimeout(() => {
        const mock: LanguagePatchResult = {
          success: true,
          previousText: 'en',
          newText: selectedText,
          previousAudio: 'en',
          newAudio: selectedVoice,
          message: `In-game language successfully switched to Text=${selectedText}, Voice=${selectedVoice}`,
        };
        setResult(mock);
        addLog(`[OK] [Dev Mode] ${mock.message}`);
        setLoading(false);
      }, 500);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 bg-hz-navy-900">
      <SectionHeader
        icon={<Globe className="h-5 w-5" />}
        title={isTh ? 'Client Localization Manager' : 'Client Localization Manager'}
        badge={<Badge variant="neutral">13 Texts + 4 Voices</Badge>}
        description={
          isTh
            ? 'กำหนดค่าภาษาข้อความและเสียงพากย์ของไคลเอนต์ พร้อมซิงค์โครงสร้างคอนฟิกและ DesignData'
            : 'Configure client text and audio languages with DesignData and registry synchronization.'
        }
      />

      {/* Directory Configuration Card - Fully Responsive & Resilient */}
      <div className="bg-hz-navy-800/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-md shadow-black/20">
        {/* Row 1: Game Directory input + Browse */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 shrink-0">
            <FolderOpen className="h-4 w-4 text-zinc-400 shrink-0" />
            <span>{isTh ? 'โฟลเดอร์ตัวเกม (Game Directory):' : 'Game Directory:'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={gamePath || ''}
              onChange={(e) => updateSettings({ gamePath: e.target.value })}
              className="font-mono text-xs w-full min-w-0"
              placeholder="C:/Program Files/Star Rail/Games"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBrowseGamePath}
            className="shrink-0 px-3 w-full sm:w-auto"
            icon={<FolderOpen className="h-3.5 w-3.5" />}
          >
            <span>{isTh ? 'เลือกโฟลเดอร์' : 'Browse'}</span>
          </Button>
        </div>

        {/* Row 2: Status Hint + Action Buttons (Rollback & Apply) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 flex items-center gap-2 min-w-0">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0" />
            <span className="truncate">
              {isTh
                ? 'เลือกภาษาข้อความและเสียงพากย์ด้านล่าง แล้วกดบันทึกลงเกม'
                : 'Select text & voice below, then apply to client'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="secondary"
              size="sm"
              disabled={!gamePath || loading}
              onClick={async () => {
                if (!gamePath) return;
                addLog(isTh ? '[*] กำลัง Rollback ภาษาเกมจาก Snapshot...' : '[*] Rolling back language from snapshot...');
                if (isTauri()) {
                  try {
                    const ok = await tauriApi.rollbackGameLanguage(gamePath);
                    addLog(ok
                      ? (isTh ? '[OK] Rollback สำเร็จ! ภาษาถูกกู้คืนจาก Backup' : '[OK] Rollback successful! Language restored from backup.')
                      : (isTh ? '[*] ไม่พบ Snapshot Backup' : '[*] No snapshot backup found.'));
                  } catch (e) {
                    addLog(`[ERR] Rollback failed: ${e}`);
                  }
                }
              }}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              className="flex-1 sm:flex-initial"
            >
              {isTh ? 'กู้คืนภาษา (Rollback)' : 'Rollback'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleApplyLanguage}
              disabled={!gamePath}
              icon={<Zap className="h-3.5 w-3.5 fill-current" />}
              className="flex-1 sm:flex-initial font-bold"
            >
              {isTh ? 'บันทึกภาษาลงตัวเกม' : 'Apply Language Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Text Language Selector */}
        <Card className="p-5 border-zinc-800 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'เลือกภาษาข้อความในเกม (Text Language)' : 'Select Text Language'}
                </h2>
                <p className="text-xs text-zinc-400">
                  {isTh ? 'ข้อความ เมนู และบทสนทนาในเกม' : 'In-game menus, subtitles, and dialogue.'}
                </p>
              </div>
            </div>
            <Badge variant="neutral">{selectedText.toUpperCase()}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {TEXT_LANGUAGES.map((lang) => {
              const isSelected = selectedText === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedText(lang.code)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-400 text-white shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">
                      {lang.code.toUpperCase()}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-white truncate">{lang.nativeName}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{lang.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Audio / Voice Language Selector */}
        <Card className="p-5 border-zinc-800 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
                <Volume2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'เลือกเสียงพากย์ตัวละคร (Voice Language)' : 'Select Voice Audio Language'}
                </h2>
                <p className="text-xs text-zinc-400">
                  {isTh ? 'เสียงพากย์ในคัตซีนและการต่อสู้' : 'Cutscenes and combat voiceovers.'}
                </p>
              </div>
            </div>
            <Badge variant="neutral">{selectedVoice.toUpperCase()}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {VOICE_LANGUAGES.map((lang) => {
              const isSelected = selectedVoice === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedVoice(lang.code)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-400 text-white shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">
                      {lang.code.toUpperCase()}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-white">{lang.nativeName}</div>
                    <div className="text-[10px] text-zinc-400">{lang.name}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {result && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{result.message}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Terminal Log Output */}
      <Card className="flex-1 min-h-48 p-4 flex flex-col font-mono text-xs space-y-2.5 shadow-lg shadow-black/20" flat>
        <div className="flex items-center justify-between pb-2.5 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2 text-white">
            <span className="font-bold text-xs">
              {isTh ? 'บันทึกการทำงานของ Language Patcher' : 'Language Patcher Output Stream'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              {logs.length} Events
            </Badge>
            {logs.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCopyLogs}
                  icon={copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  className="text-hz-gray-400 hover:text-white h-6.5 text-[11px]"
                >
                  {copied ? (isTh ? 'คัดลอกแล้ว' : 'Copied') : (isTh ? 'คัดลอก' : 'Copy')}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClearLogs}
                  icon={<Trash2 className="h-3 w-3" />}
                  className="text-hz-gray-400 hover:text-white h-6.5 text-[11px]"
                >
                  {isTh ? 'ล้าง' : 'Clear'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 text-[11px] scrollbar-thin max-h-56">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`break-all font-mono leading-relaxed ${
                log.includes('[OK]') || log.includes('Successfully')
                  ? 'text-emerald-300 font-bold'
                  : log.includes('[*]') || log.includes('Detected')
                  ? 'text-zinc-300 font-semibold'
                  : log.includes('[ERR]')
                  ? 'text-rose-400 font-semibold'
                  : 'text-hz-gray-400'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
