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
import { Badge, Button, Card, Input, SectionHeader } from '../ui';
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
  const [logs, setLogs] = useState<string[]>([
    '⚡ AstralOS Native Rayon Resource Compiler Ready.',
    '💡 ระบบประมวลผลไฟล์ดิบ Config/LevelOutput และ ExcelOutput เป็น res.json ความเร็วสูง',
    '📁 กำหนดโฟลเดอร์ Resources ต้นทาง แล้วกดปุ่ม "เริ่มประมวลผล res.json" ได้ทันที',
  ]);

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
        addLog(isTh ? `เลือกโฟลเดอร์ Resources: ${p}` : `Selected Resources directory: ${p}`);
      }
    }
  };

  const handleCompile = async () => {
    if (!resourcesDir.trim()) {
      const err = isTh
        ? '❌ กรุณากำหนดโฟลเดอร์ Resources ต้นทางก่อนเริ่มการประมวลผล'
        : '❌ Please specify the source Resources directory first';
      setErrorMessage(err);
      addLog(err);
      return;
    }

    setLoading(true);
    setStats(null);
    setErrorMessage('');
    addLog(isTh ? `🚀 กำลังตรวจสอบและอ่านไฟล์จาก: ${resourcesDir}...` : `🚀 Verifying & reading files from: ${resourcesDir}...`);

    if (isTauri()) {
      try {
        const res = await tauriApi.executeGenerateResJson(resourcesDir, outputFile);
        if (res && res.success) {
          setStats(res);
          addLog(isTh ? `✅ สร้างสำเร็จ: ${res.outputFile} (${res.fileSizeMb} MB) ในเวลา ${res.timeSeconds}s` : `✅ Successfully generated ${res.outputFile} (${res.fileSizeMb} MB) in ${res.timeSeconds}s`);
          addLog(isTh ? `📊 สรุป: ฉากทั้งหมด ${res.sceneGroupsCount} แมพ, ตัวละคร ${res.avatarsCount} ตัว, จุดวาร์ป ${res.mapEntrancesCount} จุด` : `📊 Summary: ${res.sceneGroupsCount} scenes, ${res.avatarsCount} avatars, ${res.mapEntrancesCount} map entrances`);
          addLog(isTh ? '📂 ไฟล์ถูกซิงค์ไปยัง ./res.json และ ./bin/res.json พร้อมให้เซิร์ฟเวอร์ RobinSR ใช้งานทันที' : '📂 Automatically synced to ./res.json and ./bin/res.json for RobinSR server.');
        } else {
          const err = res.message || 'Unknown compile error';
          setErrorMessage(err);
          addLog(`❌ ${err}`);
        }
      } catch (e) {
        const errStr = `${e}`;
        setErrorMessage(errStr);
        addLog(`❌ ${errStr}`);
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
        addLog(`✅ [Dev Mode] ${mock.message}`);
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
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto bg-hz-navy-900">
      <SectionHeader
        icon={<Database className="h-5 w-5" />}
        title={isTh ? 'ระบบสร้าง res.json อัตโนมัติ (Resource Compiler)' : 'Automated Resource Compiler (res.json Generator)'}
        badge={<Badge variant="violet">Pure Rust Rayon</Badge>}
        description={
          isTh
            ? 'รวบรวมไฟล์ดิบจากโฟลเดอร์ Resources (Config & ExcelOutput) รวมเป็นไฟล์ res.json (~13MB) ในคลิกเดียวด้วยความเร็วระดับ Sub-second'
            : 'Compile raw game resources into a production res.json dataset with multi-threaded pure-Rust parser.'
        }
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'จำนวนแผนที่ฉาก' : 'Scene Maps'}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {stats ? stats.sceneGroupsCount : '0'} <span className="text-xs font-normal text-hz-gray-400">{isTh ? 'ฉาก' : 'maps'}</span>
          </div>
        </Card>

        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'ฐานข้อมูลตัวละคร' : 'Avatars Config'}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {stats ? stats.avatarsCount : '0'} <span className="text-xs font-normal text-hz-gray-400">{isTh ? 'ตัว' : 'units'}</span>
          </div>
        </Card>

        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'ขนาดไฟล์ res.json' : 'Output File Size'}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {stats ? `${stats.fileSizeMb} MB` : '0 MB'}
          </div>
        </Card>

        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'ความเร็วประมวลผล' : 'Compile Speed'}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {stats ? `${stats.timeSeconds}s` : '0.00s'}
          </div>
        </Card>
      </div>

      {/* Main Configuration & Compiler Card */}
      <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isTh ? 'กำหนดโฟลเดอร์ Resources และเริ่มการสร้างไฟล์' : 'Target Resources Configuration'}
              </h2>
              <p className="text-xs text-hz-gray-400">
                {isTh
                  ? 'ระบบจะอ่าน Config/LevelOutput/Scene, ExcelOutput/AvatarConfig, MappingInfo และ RelicRecommend อัตโนมัติ'
                  : 'Auto-scans scene groups, avatar weakness buffs, entrance mappings, and relic recommendations.'}
              </p>
            </div>
          </div>
          <Badge variant="emerald">Auto-Sync ./res.json & ./bin/res.json</Badge>
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

      {/* Terminal Log Output */}
      <Card className="flex-1 min-h-48 p-4 flex flex-col font-mono text-xs space-y-2.5 shadow-lg shadow-black/20" flat>
        <div className="flex items-center justify-between pb-2.5 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2 text-white">
            <span className="font-bold text-xs">
              {isTh ? '📦 บันทึกการทำงานของ Resource Compiler' : '📦 Resource Compiler Live Execution Stream'}
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
                log.includes('✅')
                  ? 'text-emerald-300 font-bold'
                  : log.includes('⚡') || log.includes('🚀')
                  ? 'text-cyan-300 font-semibold'
                  : log.includes('📊')
                  ? 'text-amber-300 font-semibold'
                  : log.includes('❌')
                  ? 'text-rose-400 font-semibold'
                  : 'text-zinc-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-hz-navy-500/40 flex items-center justify-between text-[11px] text-emerald-400 font-sans">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {isTh ? 'ตำแหน่งไฟล์ผลลัพธ์:' : 'Compiled Output:'}{' '}
            <span className="font-mono text-zinc-300">./res.json, ./bin/res.json</span>
          </span>
        </div>
      </Card>
    </div>
  );
}
