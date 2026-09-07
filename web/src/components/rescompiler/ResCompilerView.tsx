import { useState } from 'react';
import {
  FolderOpen,
  Zap,
  CheckCircle2,
  FileCode,
  FolderDown,
  Database,
  Users,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Badge, Button, Card, Input, SectionHeader, UnifiedLogConsole } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { isTauri, tauriApi, ResCompileResult } from '../../lib/tauri';

export function ResCompilerView() {
  const { isTh } = useT();
  const gamePath = useAppStore((state) => state.gamePath);

  const [resourcesDir, setResourcesDir] = useState<string>(() => {
    if (gamePath) {
      return `${gamePath.replace(/\\/g, '/')}/DUMP/Resources`;
    }
    return '';
  });
  const [outputFile, setOutputFile] = useState<string>('res.json');
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<ResCompileResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);



  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const handleBrowseResources = async () => {
    if (isTauri()) {
      const p = await tauriApi.pickDirectoryDialog();
      if (p) {
        setResourcesDir(p);
        setErrorMessage('');
        addLog(isTh ? `[*] เลือกโฟลเดอร์ Resources: ${p}` : `[*] Selected Resources directory: ${p}`);
      }
    }
  };

  const handleCompile = async () => {
    if (!resourcesDir.trim()) {
      const err = isTh
        ? 'กรุณากำหนดโฟลเดอร์ Resources ต้นทางก่อนเริ่มการประมวลผล'
        : 'Please specify the source Resources directory first';
      setErrorMessage(err);
      addLog(`[ERR] ${err}`);
      return;
    }

    setLoading(true);
    setStats(null);
    setErrorMessage('');
    addLog(isTh ? `[PROC 1/4] กำลังตรวจสอบโฟลเดอร์ Resources และอ่านไฟล์ Config: ${resourcesDir}...` : `[PROC 1/4] Verifying and reading Config files from: ${resourcesDir}...`);

    if (isTauri()) {
      try {
        addLog(isTh ? '[PROC 2/4] สแกน Config/LevelOutput (Floor/Group) และจับคู่ GroupID กับ SceneID...' : '[PROC 2/4] Scanning Config/LevelOutput and correlating GroupIDs with SceneIDs...');
        addLog(isTh ? '[PROC 3/4] อ่านตาราง ExcelOutput (AvatarConfig, StageConfig, MapEntranceConfig)...' : '[PROC 3/4] Parsing ExcelOutput tables (AvatarConfig, StageConfig, MapEntranceConfig)...');
        const res = await tauriApi.executeGenerateResJson(resourcesDir, outputFile);
        if (res && res.success) {
          setStats(res);
          addLog(isTh ? `[PROC 4/4] เขียนไฟล์และซิงค์ JSON ไปยัง ./res.json และ ./bin/res.json สำเร็จ` : `[PROC 4/4] Serialized JSON and synced to ./res.json and ./bin/res.json`);
          addLog(isTh ? `[OK] สร้างสำเร็จ: ${res.outputFile} (${res.fileSizeMb} MB) ในเวลา ${res.timeSeconds}s` : `[OK] Successfully generated ${res.outputFile} (${res.fileSizeMb} MB) in ${res.timeSeconds}s`);
          addLog(isTh ? `[INFO] สรุป: ฉากทั้งหมด ${res.sceneGroupsCount} แมพ, ตัวละคร ${res.avatarsCount} ตัว, จุดวาร์ป ${res.mapEntrancesCount} จุด` : `[INFO] Summary: ${res.sceneGroupsCount} scenes, ${res.avatarsCount} avatars, ${res.mapEntrancesCount} map entrances`);
        } else {
          const err = res.message || 'Unknown compile error';
          setErrorMessage(err);
          addLog(`[ERR] ${err}`);
        }
      } catch (e) {
        const errStr = `${e}`;
        setErrorMessage(errStr);
        addLog(`[ERR] ${errStr}`);
      }
    } else {
      setTimeout(() => {
        const mock: ResCompileResult = {
          success: true,
          sceneGroupsCount: 929,
          avatarsCount: 120,
          mapEntrancesCount: 115,
          timeSeconds: 0.83,
          outputFile: 'res.json',
          fileSizeMb: 12.55,
          message: 'Successfully compiled res.json (12.55 MB) with 929 scene maps in 0.83s',
        };
        setStats(mock);
        addLog(`[OK] [Dev Mode] ${mock.message}`);
        setLoading(false);
      }, 600);
      return;
    }
    setLoading(false);
  };

  const handleOpenExplorer = async () => {
    if (isTauri()) {
      await tauriApi.openInExplorer('.');
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 bg-hz-navy-900">
      <SectionHeader
        icon={<Database className="h-5 w-5" />}
        title={isTh ? 'Resource Dataset Compiler' : 'Resource Dataset Compiler'}
        description={
          isTh
            ? 'คอมไพล์และจัดโครงสร้างข้อมูลดิบ (Config & ExcelOutput) เป็นดาต้าเซ็ต res.json ผ่านเอนจินคู่ขนาน'
            : 'Compile raw resource trees (Config and ExcelOutput) into an indexed res.json dataset.'
        }
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'จำนวนแผนที่ฉาก' : 'Scene Maps'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats ? stats.sceneGroupsCount.toLocaleString() : '0'}{' '}
              <span className="text-xs font-normal text-zinc-400 font-sans">{isTh ? 'ฉาก' : 'maps'}</span>
            </div>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'ฐานข้อมูลตัวละคร' : 'Avatars Config'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats ? stats.avatarsCount.toLocaleString() : '0'}{' '}
              <span className="text-xs font-normal text-zinc-400 font-sans">{isTh ? 'ตัว' : 'units'}</span>
            </div>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'ขนาดไฟล์ res.json' : 'Output File Size'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats ? `${stats.fileSizeMb} MB` : '0 MB'}
            </div>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'ความเร็วประมวลผล' : 'Compile Speed'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats ? `${stats.timeSeconds}s` : '0.00s'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration & Compiler Card */}
      <Card className="p-5 border-zinc-800 bg-hz-navy-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isTh ? 'กำหนดโฟลเดอร์ Resources และเริ่มการสร้างไฟล์' : 'Target Resources Configuration'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isTh
                  ? 'ระบบจะอ่าน Config/LevelOutput/Scene, ExcelOutput/AvatarConfig, MappingInfo และ RelicRecommend อัตโนมัติ'
                  : 'Auto-scans scene groups, avatar weakness buffs, entrance mappings, and relic recommendations.'}
              </p>
            </div>
          </div>
          <Badge variant="neutral">Auto-Sync ./res.json & ./bin/res.json</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
              {isTh ? 'โฟลเดอร์ Resources ต้นทาง' : 'Source Resources Folder'}
            </label>
            <div className="flex gap-2">
              <Input
                value={resourcesDir}
                onChange={(e) => {
                  setResourcesDir(e.target.value);
                  setErrorMessage('');
                }}
                className="font-mono text-xs flex-1"
                placeholder={isTh ? "เช่น D:/Games/StarRail/DUMP/Resources หรือ ./Resources" : "e.g. D:/Games/StarRail/DUMP/Resources or ./Resources"}
              />
              <Button variant="secondary" size="sm" onClick={handleBrowseResources} className="shrink-0 px-3">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                <span>{isTh ? 'เลือกโฟลเดอร์' : 'Browse'}</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
              {isTh ? 'ไฟล์ผลลัพธ์ปลายทาง' : 'Output File Path'}
            </label>
            <Input
              value={outputFile}
              onChange={(e) => setOutputFile(e.target.value)}
              className="font-mono text-xs"
              placeholder="res.json"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-3 border-t border-hz-navy-500/40 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-hz-gray-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {isTh
                ? 'ไฟล์ res.json จะถูกคัดลอกและซิงค์ไปยังโฟลเดอร์หลัก ./res.json และ ./bin/res.json ให้อัตโนมัติ'
                : 'res.json is automatically synced to workspace root and bin/ folder.'}
            </span>
          </div>

          <div className="flex gap-2.5 w-full md:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenExplorer}
              icon={<FolderDown className="h-4 w-4" />}
            >
              {isTh ? 'เปิดโฟลเดอร์โปรเจ็กต์' : 'Open Explorer'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleCompile}
              icon={<Zap className="h-4 w-4 fill-current" />}
            >
              {isTh ? 'เริ่มประมวลผล res.json ทันที' : 'Compile res.json Now'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Standardized Unified Log Terminal */}
      <div className="flex-1 min-h-[300px] flex flex-col">
        <UnifiedLogConsole
          title={isTh ? 'บันทึกการทำงานของ Resource Compiler' : 'Resource Compiler Process Execution Stream'}
          subtitle="Config/LevelOutput & Excel Aggregator"
          logs={logs}
          onClear={() => setLogs([])}
          exportFileName="rescompiler-execution.log"
          heightClassName="h-64 sm:h-72"
          extraFooter={
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-sans">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {isTh ? 'ตำแหน่งไฟล์ผลลัพธ์:' : 'Compiled Output:'}{' '}
                <span className="font-mono text-hz-gray-400">./res.json, ./bin/res.json</span>
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}
