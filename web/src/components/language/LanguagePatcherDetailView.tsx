import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  FolderOpen,
  Zap,
  CheckCircle2,
  Volume2,
  Languages,
  Check,
  RotateCcw,
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

export function LanguagePatcherDetailView() {
  const { isTh } = useT();
  const gamePath = useAppStore((state) => state.gamePath);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [selectedText, setSelectedText] = useState<string>('th');
  const [selectedVoice, setSelectedVoice] = useState<string>('ja');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LanguagePatchResult | null>(null);

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs([
      isTh
        ? '[*] ระบบจัดการภาษาตัวเกม Star Rail พร้อมทำงาน'
        : '[*] Star Rail In-Game Language Manager Ready.',
      isTh
        ? '[*] ปลดล็อกเมนูเปลี่ยนภาษาข้อความในเกม (13 ภาษา) และเสียงพากย์ (4 ภาษา)'
        : '[*] Unlocked in-game text language selector (13 texts) and voiceover (4 audios)',
      isTh
        ? '[*] ซิงค์ไฟล์ไบนารี DesignData, Registry และ GeneralConfig.json อัตโนมัติ'
        : '[*] Synchronizing DesignData binaries, Windows Registry, and GeneralConfig.json',
    ]);
  }, [isTh]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const loadCurrentLanguage = useCallback(async () => {
    if (isTauri() && gamePath) {
      try {
        const state: GameLanguageState = await tauriApi.getGameLanguages(gamePath);
        if (state.currentTextLang) setSelectedText(state.currentTextLang);
        if (state.currentAudioLang) setSelectedVoice(state.currentAudioLang);
        addLog(isTh ? `[*] ตรวจพบการตั้งค่าภาษาปัจจุบัน: Text=${state.currentTextLang.toUpperCase()}, Voice=${state.currentAudioLang.toUpperCase()}` : `[*] Detected current language: Text=${state.currentTextLang.toUpperCase()}, Voice=${state.currentAudioLang.toUpperCase()}`);
      } catch (e) {
        console.debug('Failed to get game languages:', e);
      }
    }
  }, [gamePath, isTh]);

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
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto bg-hz-navy-900">
      <SectionHeader
        icon={<Globe className="h-5 w-5" />}
        title={isTh ? 'ระบบเปลี่ยนภาษาในเกม' : 'In-Game Language Switcher'}
        badge={<Badge variant="violet">13 Texts + 4 Voices</Badge>}
        description={
          isTh
            ? 'เปลี่ยนภาษาเมนู ซับไตเติล และเสียงพากย์ในเกม Honkai: Star Rail ได้อย่างอิสระ พร้อมปลดล็อกเมนูเลือกภาษาในเกม'
            : 'Effortlessly switch in-game text and audio languages with instant DesignData and configuration synchronization.'
        }
      />

      {/* Directory Configuration Card */}
      <Card className="p-4 border-hz-navy-500/50 bg-hz-navy-800/80">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
              {isTh ? 'โฟลเดอร์ตัวเกม (Game Directory)' : 'Game Directory'}
            </label>
            <div className="flex gap-2">
              <Input
                value={gamePath || ''}
                onChange={(e) => updateSettings({ gamePath: e.target.value })}
                className="font-mono text-xs flex-1"
                placeholder="C:/Program Files/Star Rail/Games"
              />
              <Button variant="secondary" size="sm" onClick={handleBrowseGamePath} className="shrink-0 px-3">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                <span>{isTh ? 'เลือกโฟลเดอร์' : 'Browse'}</span>
              </Button>
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleApplyLanguage}
              disabled={!gamePath}
              icon={<Zap className="h-4 w-4 fill-current" />}
              className="w-full sm:w-auto"
            >
              {isTh ? 'บันทึกภาษาลงตัวเกม' : 'Apply Language Settings'}
            </Button>
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
              icon={<RotateCcw className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              {isTh ? 'Rollback' : 'Rollback'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Selection Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Text Language Selector */}
        <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'เลือกภาษาข้อความในเกม (Text Language)' : 'Select Text Language'}
                </h2>
                <p className="text-xs text-hz-gray-400">
                  {isTh ? 'ข้อความ เมนู และบทสนทนาในเกม' : 'In-game menus, subtitles, and dialogue.'}
                </p>
              </div>
            </div>
            <Badge variant="violet">{selectedText.toUpperCase()}</Badge>
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
                      ? 'bg-hz-brand-400/20 border-hz-brand-400 shadow-md shadow-hz-brand-400/20'
                      : 'bg-hz-navy-900/60 border-hz-navy-500/40 hover:bg-hz-navy-700/60 hover:border-hz-navy-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-hz-navy-700 text-hz-gray-300">
                      {lang.code.toUpperCase()}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-hz-brand-400" />}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white truncate">{lang.nativeName}</div>
                    <div className="text-[10px] text-hz-gray-400 truncate">{lang.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Audio / Voice Language Selector */}
        <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">
                <Volume2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'เลือกเสียงพากย์ตัวละคร (Voice Language)' : 'Select Voice Audio Language'}
                </h2>
                <p className="text-xs text-hz-gray-400">
                  {isTh ? 'เสียงพากย์ในคัตซีนและการต่อสู้' : 'Cutscenes and combat voiceovers.'}
                </p>
              </div>
            </div>
            <Badge variant="emerald">{selectedVoice.toUpperCase()}</Badge>
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
                      ? 'bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-hz-navy-900/60 border-hz-navy-500/40 hover:bg-hz-navy-700/60 hover:border-hz-navy-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-hz-navy-700 text-emerald-300">
                      {lang.code.toUpperCase()}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-bold text-white">{lang.nativeName}</div>
                    <div className="text-[10px] text-hz-gray-400">{lang.name}</div>
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
          <Badge variant="outline" className="text-[10px] font-mono">
            {logs.length} Events
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 text-[11px] scrollbar-thin max-h-56">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`break-all font-mono leading-relaxed ${
                log.includes('[OK]') || log.includes('Successfully')
                  ? 'text-emerald-300 font-bold'
                  : log.includes('[*]') || log.includes('Detected')
                  ? 'text-cyan-300 font-semibold'
                  : log.includes('[ERR]')
                  ? 'text-rose-400 font-semibold'
                  : 'text-zinc-300'
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
