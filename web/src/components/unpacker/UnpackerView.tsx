import { useState } from 'react';
import {
  Package,
  Folder,
  FolderOpen,
  RefreshCw,
  Download,
  Search,
  FolderTree,
  List,
  ChevronDown,
  ChevronUp,
  X,
  Terminal
} from 'lucide-react';
import { SectionHeader, Badge, Button, Input, Card, Tabs, EmptyState, UnifiedLogConsole } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { tauriApi, isTauri, ScannedAssetDto } from '../../lib/tauri';
import { cn } from '../../lib/utils';
import { AssetKindFilter, ViewMode } from './types';
import { useAssetTree } from './useAssetTree';
import { AssetTreeItem } from './AssetTreeItem';
import { AssetPreviewPanel } from './AssetPreviewPanel';

export function UnpackerView() {
  const gamePath = useAppStore((state) => state.gamePath);
  const assetOutputDir = useAppStore((state) => state.assetOutputDir || 'Extracted_Assets');
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isTh = useAppStore((state) => state.language === 'th');

  const [assets, setAssets] = useState<ScannedAssetDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>('all');
  const [extFilter, setExtFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selected, setSelected] = useState<ScannedAssetDto | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCached, setIsCached] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 199)]);
  };

  const {
    filteredAssets,
    availableExtensions,
    visibleFlatNodes,
    openFolders,
    toggleFolder,
    expandAll,
    collapseAll,
  } = useAssetTree(assets, searchTerm, kindFilter, extFilter);

  const handlePickGameFolder = async () => {
    if (!isTauri()) return;
    try {
      const selectedPath = await tauriApi.pickDirectoryDialog();
      if (selectedPath) {
        updateSettings({ gamePath: selectedPath });
      }
    } catch (err: any) {
      setStatusMessage(`[ERR] ${err?.message || err}`);
    }
  };

  const handlePickOutputFolder = async () => {
    if (!isTauri()) return;
    try {
      const selectedPath = await tauriApi.pickDirectoryDialog();
      if (selectedPath) {
        updateSettings({ assetOutputDir: selectedPath });
      }
    } catch (err: any) {
      setStatusMessage(`[ERR] ${err?.message || err}`);
    }
  };

  const handleScanAssets = async (forceRefresh = false) => {
    if (!gamePath.trim()) {
      const err = isTh ? 'กรุณาระบุโฟลเดอร์เกมก่อนเริ่มสแกน' : 'Please select game directory first';
      setStatusMessage(`[ERR] ${err}`);
      addLog(`[ERR] ${err}`);
      return;
    }

    setIsScanning(true);
    setStatusMessage(
      forceRefresh
        ? (isTh ? '[*] กำลังบังคับสแกน Block Archives ใหม่ทั้งหมด (ข้ามแคช)...' : '[*] Force scanning block archives (bypassing cache)...')
        : (isTh ? '[*] กำลังสแกน Block Archives ในตัวเกม...' : '[*] Scanning game block archives...')
    );
    addLog(
      forceRefresh
        ? (isTh ? `[PROC 1/3] บังคับสแกนไฟล์ใหม่ทั้งหมดใน: ${gamePath}` : `[PROC 1/3] Force scanning all block archives in: ${gamePath}`)
        : (isTh ? `[PROC 1/3] เริ่มตรวจสอบแพ็กเกจบล็อกไฟล์ใน: ${gamePath}` : `[PROC 1/3] Scanning block archives in: ${gamePath}`)
    );

    try {
      if (isTauri()) {
        addLog(isTh ? '[PROC 2/3] กำลังตรวจสอบแคชและถอดรหัสโครงสร้าง UnityFS...' : '[PROC 2/3] Checking manifest cache and decoding UnityFS archives...');
        const res = await tauriApi.executeScanGameAssets(gamePath, forceRefresh);
        if (res.success) {
          setAssets(res.assets);
          setIsCached(Boolean(res.cached));
          const okMsg = isTh
            ? `[OK] สแกนสำเร็จ${res.cached ? ' (จากแคช)' : ''} พบ ${res.total_assets} ชิ้นส่วน ใน ${res.total_blocks} บล็อกไฟล์`
            : `[OK] Scanned successfully${res.cached ? ' (cached)' : ''}: ${res.total_assets} assets indexed from ${res.total_blocks} blocks`;
          setStatusMessage(okMsg);
          if (res.cached) {
            addLog(isTh ? '[OK] โหลดข้อมูลผัง Asset อย่างรวดเร็วจาก Manifest Cache (~5ms)' : '[OK] Loaded from manifest cache in ~5ms');
          }
          addLog(isTh ? '[PROC 3/3] สกัดข้อมูล Texture2D, Audio, Mesh และ Data เข้าสู่ผังโฟลเดอร์เรียบร้อย' : '[PROC 3/3] Categorized textures, audio, meshes, and configs into tree.');
          addLog(okMsg);
          if (res.assets.length > 0) {
            setSelected(res.assets[0]);
          }
        } else {
          setStatusMessage(`[ERR] ${res.message}`);
          addLog(`[ERR] ${res.message}`);
        }
      } else {
        const devMsg = isTh ? '[*] โหมดทดสอบบนเบราว์เซอร์: กรุณารันผ่าน AstralOS.exe เพื่อสแกนไฟล์จริง' : '[*] Browser mode: Run via AstralOS.exe for live block scanning';
        setStatusMessage(devMsg);
        addLog(devMsg);
      }
    } catch (err: any) {
      const errStr = `[ERR] ${err?.message || err}`;
      setStatusMessage(errStr);
      addLog(errStr);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExtractAssets = async () => {
    if (!gamePath.trim()) return;

    setIsExtracting(true);
    setStatusMessage(isTh ? '[*] กำลังคลายการบีบอัดและแปลง Asset (Oodle / BC7)...' : '[*] Extracting & decoding assets (Oodle / BC7)...');
    addLog(isTh ? `[PROC 1/3] เริ่มกระบวนการ Decompress Oodle / LZ4 บล็อกไฟล์เกม...` : `[PROC 1/3] Decompressing Oodle / LZ4 block stream...`);

    try {
      if (isTauri()) {
        addLog(isTh ? `[PROC 2/3] ถอดรหัส Texture2D (BC7 / ASTC) และแปลงเป็น PNG...` : `[PROC 2/3] Decoding Texture2D (BC7 / ASTC) into PNG...`);
        const filter = selected ? selected.name : undefined;
        const res = await tauriApi.executeUnpackAssets(gamePath, assetOutputDir, filter);
        if (res.success) {
          updateSettings({ assetOutputDir: res.output_dir });
          const okMsg = isTh
            ? `[OK] ส่งออกสำเร็จ ${res.extracted_count} ไฟล์ ไปยัง ${res.output_dir}`
            : `[OK] Successfully extracted ${res.extracted_count} assets to ${res.output_dir}`;
          setStatusMessage(okMsg);
          addLog(isTh ? `[PROC 3/3] บันทึกไฟล์ลงในโฟลเดอร์ ${res.output_dir} ครบถ้วน` : `[PROC 3/3] Emitted unpacked assets to ${res.output_dir}`);
          addLog(okMsg);
        } else {
          setStatusMessage(`[ERR] ${res.message}`);
          addLog(`[ERR] ${res.message}`);
        }
      }
    } catch (err: any) {
      const errStr = `[ERR] ${err?.message || err}`;
      setStatusMessage(errStr);
      addLog(errStr);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenOutput = () => {
    if (isTauri()) {
      tauriApi.openInExplorer(assetOutputDir);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-5 select-none">
      <SectionHeader
        icon={<Package className="h-5 w-5 text-zinc-300" />}
        title={isTh ? 'Asset Studio & Package Extractor' : 'Asset Studio & Package Extractor'}
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            {isCached && (
              <Badge variant="emerald" className="tracking-wider text-[11px]">
                {isTh ? 'Manifest Cache ใช้งานอยู่' : 'Cached Manifest'}
              </Badge>
            )}
            <Badge variant="violet" className="tracking-wider text-[11px]">
              {isTh ? 'Pure Rust Engine (Oodle / BC7 / ASTC)' : 'Pure Rust Engine (Oodle / BC7 / ASTC)'}
            </Badge>
          </div>
        }
        description={
          isTh
            ? 'ตรวจสอบ แยกโครงสร้าง และถอดรหัสไฟล์ UnityFS Block Archives (Texture2D, Wwise Audio, โมเดล glTF)'
            : 'Inspect, decode, and extract UnityFS block archives into standard textures, audio banks, and glTF models.'
        }
      />

      {/* Top Controls Bar - Two Organized Rows */}
      <div className="bg-hz-navy-800 border border-hz-navy-500/40 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md">
        {/* Row 1: Game Directory */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="flex-1 w-full flex items-center gap-2">
            <Input
              icon={<Folder className="h-4 w-4 text-zinc-300" />}
              value={gamePath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ gamePath: e.target.value })}
              placeholder={isTh ? 'เลือกโฟลเดอร์เกม Star Rail (เช่น C:/Program Files/Star Rail/Games)...' : 'Select Star Rail game directory...'}
              className="text-xs font-mono"
            />
            <Button variant="outline" size="sm" onClick={handlePickGameFolder} icon={<FolderOpen className="h-3.5 w-3.5" />}>
              {isTh ? 'เลือกโฟลเดอร์เกม' : 'Browse Game'}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleScanAssets(false)}
              disabled={isScanning || !gamePath}
              icon={<RefreshCw className={cn('h-3.5 w-3.5', isScanning && 'animate-spin')} />}
              className="font-bold flex-1 sm:flex-none"
            >
              {isScanning ? (isTh ? 'กำลังสแกน...' : 'Scanning...') : (isTh ? 'สแกน Asset ในเกม' : 'Scan Game Assets')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleScanAssets(true)}
              disabled={isScanning || !gamePath}
              title={isTh ? 'บังคับสแกนใหม่ทั้งหมดโดยไม่ใช้แคช' : 'Force full re-scan bypassing manifest cache'}
              className="font-medium text-xs px-2.5 text-hz-gray-300 hover:text-white shrink-0"
            >
              {isTh ? 'สแกนใหม่หมด' : 'Force Rescan'}
            </Button>
          </div>
        </div>

        {/* Row 2: Output Directory & Actions */}
        <div className="flex flex-col sm:flex-row gap-2 items-center pt-1 border-t border-hz-navy-500/30">
          <div className="flex-1 w-full flex items-center gap-2">
            <Input
              icon={<FolderOpen className="h-4 w-4 text-amber-400" />}
              value={assetOutputDir}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ assetOutputDir: e.target.value })}
              placeholder={isTh ? 'เลือกโฟลเดอร์ปลายทางที่จะบันทึกไฟล์ (เช่น D:/Extracted_Assets)...' : 'Select export output folder...'}
              className="text-xs font-mono"
            />
            <Button variant="outline" size="sm" onClick={handlePickOutputFolder} icon={<Folder className="h-3.5 w-3.5" />}>
              {isTh ? 'เลือกที่ Output' : 'Browse Output'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenOutput} icon={<FolderOpen className="h-3.5 w-3.5 text-zinc-300" />}>
              {isTh ? 'เปิดโฟลเดอร์ Output' : 'Open Output'}
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExtractAssets}
            disabled={isExtracting || !gamePath || assets.length === 0}
            icon={<Download className="h-3.5 w-3.5" />}
            className="shrink-0 w-full sm:w-auto font-bold"
          >
            {isExtracting ? (isTh ? 'กำลังดึง...' : 'Extracting...') : (isTh ? 'คลายไฟล์ทั้งหมด' : 'Extract All')}
          </Button>

          <Button
            variant={showLogs ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            icon={<Terminal className="h-3.5 w-3.5" />}
            className="shrink-0 w-full sm:w-auto font-medium"
            title={isTh ? 'เปิด/ปิด บันทึกการประมวลผล' : 'Toggle Process Logs'}
          >
            {isTh ? `Log Process (${logs.length})` : `Process Logs (${logs.length})`}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-mono border flex items-center justify-between shrink-0',
            statusMessage.includes('[OK]')
              ? 'bg-hz-green-400/10 border-hz-green-400/20 text-hz-green-400'
              : statusMessage.includes('[ERR]')
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-hz-navy-800 border-hz-navy-500 text-hz-gray-300'
          )}
        >
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-hz-gray-400 hover:text-white" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Process Logs Console */}
      {showLogs && (
        <div className="shrink-0 h-48 sm:h-56">
          <UnifiedLogConsole
            title={isTh ? 'บันทึกการทำงานของ Asset Studio' : 'Asset Studio Process Log Stream'}
            logs={logs}
            onClear={() => setLogs([])}
            exportFileName="asset-studio-process.log"
            heightClassName="h-32 sm:h-36"
          />
        </div>
      )}

      {/* Main Asset Studio Workspace */}
      <div className="flex-1 min-h-[580px] grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Side: Tree Explorer / Asset Browser */}
        <Card className="lg:col-span-7 flex flex-col p-0 min-h-[450px] lg:min-h-full overflow-hidden border-hz-navy-500/40 bg-hz-navy-800/90 shadow-xl" flat>
          {/* Search & Mode Bar */}
          <div className="p-3 border-b border-hz-navy-500/40 bg-hz-navy-800 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-[140px]">
                <Input
                  icon={<Search className="h-3.5 w-3.5 text-hz-gray-400" />}
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  placeholder={isTh ? 'ค้นหาชื่อไฟล์ หรือ Path (เช่น abyss, sprite)...' : 'Search asset name or path...'}
                  className="text-xs font-mono h-8"
                  aria-label="Search assets"
                />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center rounded-xl bg-hz-navy-900 border border-hz-navy-500/50 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors',
                    viewMode === 'tree' ? 'bg-zinc-800 text-white border border-zinc-600 font-bold shadow-sm' : 'text-hz-gray-400 hover:text-white border border-transparent'
                  )}
                  title="Tree View (Hierarchy)"
                  aria-label="Tree View"
                >
                  <FolderTree className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors',
                    viewMode === 'flat' ? 'bg-zinc-800 text-white border border-zinc-600 font-bold shadow-sm' : 'text-hz-gray-400 hover:text-white border border-transparent'
                  )}
                  title="Flat List View"
                  aria-label="Flat View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              {viewMode === 'tree' && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="xs" onClick={expandAll} title="Expand All Folders" icon={<ChevronDown className="h-3 w-3" />}>
                    {isTh ? 'กาง' : 'All'}
                  </Button>
                  <Button variant="outline" size="xs" onClick={collapseAll} title="Collapse All Folders" icon={<ChevronUp className="h-3 w-3" />}>
                    {isTh ? 'หุบ' : 'Fold'}
                  </Button>
                </div>
              )}
            </div>

            {/* Kind Filter Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Tabs
                items={[
                  { value: 'all', label: `ALL (${filteredAssets.length})` },
                  { value: 'texture', label: 'TEX' },
                  { value: 'audio', label: 'AUD' },
                  { value: 'mesh', label: 'MESH' },
                  { value: 'text', label: 'DATA' },
                ]}
                value={kindFilter}
                onChange={(v) => setKindFilter(v as AssetKindFilter)}
                aria-label="Asset type filter"
                className="shrink-0"
              />

              {/* Instant Extension Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
                <button
                  type="button"
                  onClick={() => setExtFilter('all')}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors shrink-0',
                    extFilter === 'all'
                      ? 'bg-zinc-800 border border-zinc-600 text-white font-bold shadow-sm'
                      : 'bg-hz-navy-900 border border-hz-navy-500/40 text-hz-gray-400 hover:text-white'
                  )}
                >
                  .*
                </button>
                {(availableExtensions.length > 0 ? availableExtensions.slice(0, 10) : ['png', 'jpg', 'astc', 'wem', 'pck', 'obj', 'json', 'txt']).map((ext) => (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => setExtFilter(ext === extFilter ? 'all' : ext)}
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors shrink-0 uppercase',
                      extFilter === ext
                        ? 'bg-amber-400/30 border border-amber-400 text-amber-300 font-bold'
                        : 'bg-hz-navy-900 border border-hz-navy-500/40 text-hz-gray-400 hover:text-white'
                    )}
                  >
                    .{ext}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Tree View / Virtual Container */}
          <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
            {assets.length === 0 ? (
              <EmptyState
                className="h-full"
                icon={<Package className="h-8 w-8 text-hz-gray-500" />}
                title={isTh ? 'ยังไม่ได้สแกน Asset' : 'No Assets Scanned'}
                description={
                  isTh
                    ? 'กดปุ่ม "สแกน Asset ในเกม" ด้านบน เพื่ออ่านไฟล์ Block Archives ทั้งหมดในเกม'
                    : 'Click "Scan Game Assets" above to index textures, audio, and meshes directly from block archives.'
                }
              />
            ) : filteredAssets.length === 0 ? (
              <EmptyState
                className="h-full"
                icon={<Search className="h-8 w-8 text-hz-gray-500" />}
                title={isTh ? 'ไม่พบ Asset ที่ตรงกับเงื่อนไข' : 'No Matching Assets'}
                description={isTh ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองนามสกุล' : 'Try clearing your search query or extension filters.'}
              />
            ) : viewMode === 'tree' ? (
              <div className="flex flex-col gap-0.5">
                {visibleFlatNodes.map((node) => (
                  <AssetTreeItem
                    key={node.id}
                    node={node}
                    isOpen={openFolders.has(node.fullPath)}
                    isSelected={selected?.id === node.asset?.id}
                    onToggleFolder={toggleFolder}
                    onSelectFile={setSelected}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelected(asset)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border font-mono text-xs',
                      selected?.id === asset.id
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-md font-bold'
                        : 'bg-hz-navy-900/60 border-hz-navy-500/30 text-hz-gray-300 hover:bg-hz-navy-700/50 hover:text-white'
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate text-white font-semibold">{asset.name}</div>
                      <div className="text-[10px] text-hz-gray-400 truncate">{asset.path}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                      {asset.extension || asset.kind}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Side: Live Inspector & Preview Panel */}
        <div className="lg:col-span-5 flex flex-col min-h-[450px] lg:min-h-full overflow-hidden">
          <AssetPreviewPanel isTh={isTh} selected={selected} outputDir={assetOutputDir} />
        </div>
      </div>
    </div>
  );
}
