import { useState, useEffect } from 'react';
import {
  Download,
  FolderOpen,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Grid,
  FileText,
  Volume2,
  Box,
  Sparkles,
  Check
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../ui';
import { ScannedAssetDto, tauriApi, isTauri } from '../../lib/tauri';
import { cn } from '../../lib/utils';
import { PreviewState } from './types';

interface AssetPreviewPanelProps {
  isTh: boolean;
  selected: ScannedAssetDto | null;
  outputDir: string;
}

export function AssetPreviewPanel({ isTh, selected, outputDir }: AssetPreviewPanelProps) {
  const [preview, setPreview] = useState<PreviewState>({
    loading: false,
    dataUrl: null,
    width: 0,
    height: 0,
    format: '',
    error: null,
    zoom: 1,
    showCheckerboard: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // High-performance LRU memory cache for decoded textures (max 150 items)
  const [cache] = useState(() => new Map<string, { dataUrl: string; width: number; height: number; format: string }>());

  // Fetch live image decode whenever selected asset changes with cancellation
  useEffect(() => {
    if (!selected) {
      setPreview({
        loading: false,
        dataUrl: null,
        width: 0,
        height: 0,
        format: '',
        error: null,
        zoom: 1,
        showCheckerboard: true,
      });
      setExportedFilePath(null);
      setExportMessage(null);
      return;
    }

    setExportedFilePath(null);
    setExportMessage(null);

    const assetKey = `${selected.block_full_path || selected.block}_${selected.path_id || 0}`;

    // Instant cache hit
    if (cache.has(assetKey)) {
      const cached = cache.get(assetKey)!;
      setPreview({
        loading: false,
        dataUrl: cached.dataUrl,
        width: cached.width,
        height: cached.height,
        format: cached.format,
        error: null,
        zoom: 1,
        showCheckerboard: true,
      });
      return;
    }

    if (selected.kind === 'texture') {
      let active = true;
      setPreview((prev) => ({ ...prev, loading: true, error: null, dataUrl: null }));

      const timer = setTimeout(() => {
        if (!active || !isTauri()) {
          if (active) {
            setPreview((prev) => ({
              ...prev,
              loading: false,
              error: 'Desktop mode required for live block decoding',
            }));
          }
          return;
        }

        const block = selected.block_full_path || selected.block;
        const pathId = selected.path_id || 0;

        tauriApi.getAssetImagePreview(block, pathId)
          .then((res) => {
            if (!active) return;
            if (res.success && res.data_url) {
              if (cache.size > 150) {
                const firstKey = cache.keys().next().value;
                if (firstKey) cache.delete(firstKey);
              }
              cache.set(assetKey, {
                dataUrl: res.data_url,
                width: res.width,
                height: res.height,
                format: res.format,
              });

              setPreview({
                loading: false,
                dataUrl: res.data_url,
                width: res.width,
                height: res.height,
                format: res.format,
                error: null,
                zoom: 1,
                showCheckerboard: true,
              });
            } else {
              setPreview((prev) => ({
                ...prev,
                loading: false,
                error: res.message || 'Texture decode unavailable for this block',
              }));
            }
          })
          .catch((err) => {
            if (!active) return;
            setPreview((prev) => ({
              ...prev,
              loading: false,
              error: String(err?.message || err),
            }));
          });
      }, 70);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setPreview({
        loading: false,
        dataUrl: null,
        width: 0,
        height: 0,
        format: selected.kind.toUpperCase(),
        error: null,
        zoom: 1,
        showCheckerboard: false,
      });
    }
  }, [selected, cache]);

  const handleExportSingle = async () => {
    if (!selected || !isTauri()) return;
    setIsExporting(true);
    setExportMessage(null);

    try {
      const block = selected.block_full_path || selected.block;
      const pathId = selected.path_id || 0;
      const savedPath = await tauriApi.exportSingleAsset(
        block,
        pathId,
        selected.path || selected.name,
        outputDir
      );
      setExportedFilePath(savedPath);
      setExportMessage(isTh ? `ส่งออกสำเร็จ: ${savedPath}` : `Exported: ${savedPath}`);
      if (savedPath) {
        tauriApi.showItemInFolder(savedPath);
      }
    } catch (err: any) {
      setExportMessage(`[ERR] ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevealInExplorer = () => {
    if (!isTauri()) return;
    if (exportedFilePath) {
      tauriApi.showItemInFolder(exportedFilePath);
    } else {
      tauriApi.openInExplorer(outputDir);
    }
  };

  if (!selected) {
    return (
      <Card className="h-full flex flex-col p-4 overflow-hidden border-hz-navy-500/40 bg-hz-navy-800/80">
        <EmptyState
          className="h-full"
          icon={<ImageIcon className="h-8 w-8 text-hz-gray-500" />}
          title={isTh ? 'เลือก Asset เพื่อดู Preview' : 'No Asset Selected'}
          description={
            isTh
              ? 'คลิกที่โฟลเดอร์หรือไฟล์ในแผนผังด้านซ้ายเพื่อดูภาพ ตัวอย่างเสียง และรายละเอียดเชิงลึก'
              : 'Click any file in the tree to decode and preview Texture2D, Audio, Meshes, and metadata in real time.'
          }
        />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col p-4 overflow-hidden border-hz-navy-500/40 bg-hz-navy-800/90 shadow-xl gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 shrink-0 border-b border-hz-navy-500/40 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white font-mono truncate">{selected.name}</h2>
          </div>
          <p className="text-[11px] text-hz-gray-400 font-mono truncate mt-0.5" title={selected.path}>
            {selected.path}
          </p>
        </div>
        <Badge variant="violet" className="font-mono text-[10px] shrink-0 uppercase">
          {selected.extension ? `.${selected.extension}` : selected.kind}
        </Badge>
      </div>

      {/* Main Preview Box */}
      <div className="flex-1 min-h-[220px] rounded-2xl bg-hz-navy-950 border border-hz-navy-500/50 relative overflow-hidden flex flex-col items-center justify-center select-none group">
        {selected.kind === 'texture' ? (
          <>
            {/* Checkerboard transparency background */}
            {preview.showCheckerboard && (
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #3b4261 25%, transparent 25%), linear-gradient(-45deg, #3b4261 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3b4261 75%), linear-gradient(-45deg, transparent 75%, #3b4261 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
            )}

            {preview.loading ? (
              <div className="flex flex-col items-center gap-2 text-hz-brand-300">
                <Sparkles className="h-6 w-6 animate-spin text-hz-brand-400" />
                <span className="text-xs font-mono">{isTh ? 'กำลังถอดรหัส ASTC/BC7...' : 'Decoding Texture2D...'}</span>
              </div>
            ) : preview.dataUrl ? (
              <div className="w-full h-full flex items-center justify-center p-3 overflow-auto">
                <img
                  src={preview.dataUrl}
                  alt={selected.name}
                  style={{
                    transform: `scale(${preview.zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl pointer-events-auto"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-hz-gray-400 p-4 text-center">
                <ImageIcon className="h-8 w-8 text-hz-gray-500" />
                <span className="text-xs font-mono text-hz-gray-400">
                  {preview.error || (isTh ? 'ไม่สามารถถอดรหัสภาพได้' : 'Texture preview unavailable')}
                </span>
              </div>
            )}

            {/* Floating Image Toolbar */}
            {preview.dataUrl && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-hz-navy-900/90 backdrop-blur-md border border-hz-navy-500/50 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => setPreview((p) => ({ ...p, zoom: Math.max(0.25, p.zoom - 0.25) }))}
                  className="p-1 text-hz-gray-400 hover:text-white transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono text-hz-gray-300 w-9 text-center">
                  {Math.round(preview.zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreview((p) => ({ ...p, zoom: Math.min(5, p.zoom + 0.25) }))}
                  className="p-1 text-hz-gray-400 hover:text-white transition-colors"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-hz-navy-500/60" />
                <button
                  type="button"
                  onClick={() => setPreview((p) => ({ ...p, zoom: 1 }))}
                  className="p-1 text-hz-gray-400 hover:text-white transition-colors"
                  title="1:1 Pixel Match"
                  aria-label="1:1 Pixel Match"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreview((p) => ({ ...p, showCheckerboard: !p.showCheckerboard }))}
                  className={cn('p-1 transition-colors', preview.showCheckerboard ? 'text-hz-brand-400' : 'text-hz-gray-500')}
                  title="Toggle Checkerboard Background"
                  aria-label="Toggle Checkerboard"
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        ) : selected.kind === 'audio' ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-300">
              <Volume2 className="h-10 w-10" />
            </div>
            <div className="text-xs font-bold text-white font-mono">{selected.name}</div>
            <div className="text-[11px] text-hz-gray-400 font-mono">{isTh ? 'ไฟล์เสียง Wwise Audio Clip' : 'Wwise Audio Bank / Sound Clip'}</div>
          </div>
        ) : selected.kind === 'mesh' ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="p-4 rounded-3xl bg-emerald-500/10 text-emerald-300">
              <Box className="h-10 w-10" />
            </div>
            <div className="text-xs font-bold text-white font-mono">{selected.name}</div>
            <div className="text-[11px] text-hz-gray-400 font-mono">{isTh ? 'โครงสร้าง 3D Mesh / GameObject' : '3D Geometry Mesh / GameObject'}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="p-4 rounded-3xl bg-sky-500/10 text-sky-300">
              <FileText className="h-10 w-10" />
            </div>
            <div className="text-xs font-bold text-white font-mono">{selected.name}</div>
            <div className="text-[11px] text-hz-gray-400 font-mono">{selected.class_name || 'TextAsset / Binary Data'}</div>
          </div>
        )}
      </div>

      {/* Metadata Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono shrink-0">
        <div className="p-2.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40">
          <span className="text-[10px] text-hz-gray-400 block">{isTh ? 'มิติภาพ / ขนาด' : 'Dimensions'}</span>
          <span className="text-white font-bold">
            {preview.width && preview.height ? `${preview.width} × ${preview.height} px` : selected.size || 'Auto'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40">
          <span className="text-[10px] text-hz-gray-400 block">{isTh ? 'ฟอร์แมต' : 'Format'}</span>
          <span className="text-white font-bold truncate">
            {preview.format || selected.kind.toUpperCase()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-hz-gray-400 block">{isTh ? 'บล็อกไฟล์' : 'Source Block'}</span>
          <span className="text-white font-bold truncate block" title={selected.block}>
            {selected.block}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 shrink-0 pt-1">
        {exportMessage && (
          <div
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-mono border flex items-center gap-2',
              exportMessage.includes('[ERR]')
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-hz-green-400/10 border-hz-green-400/20 text-hz-green-400'
            )}
          >
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{exportMessage}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 font-bold"
            onClick={handleExportSingle}
            loading={isExporting}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            {isExporting ? (isTh ? 'กำลังส่งออก...' : 'Exporting...') : (isTh ? 'ส่งออกชิ้นนี้ (Export)' : 'Export Asset')}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRevealInExplorer}
            icon={<FolderOpen className="h-3.5 w-3.5 text-hz-brand-400" />}
            title={isTh ? 'เปิดโฟลเดอร์และชี้ไปที่ไฟล์' : 'Open in Explorer & Reveal'}
          >
            {isTh ? 'เปิดโฟลเดอร์' : 'Reveal'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
