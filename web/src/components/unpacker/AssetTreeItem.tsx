import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Box,
  Volume2,
  FileText,
  FileCode
} from 'lucide-react';
import { TreeNode } from './types';
import { ScannedAssetDto } from '../../lib/tauri';
import { cn } from '../../lib/utils';

interface AssetTreeItemProps {
  node: TreeNode;
  isOpen: boolean;
  isSelected: boolean;
  onToggleFolder: (path: string) => void;
  onSelectFile: (asset: ScannedAssetDto) => void;
}

export function AssetTreeItem({
  node,
  isOpen,
  isSelected,
  onToggleFolder,
  onSelectFile,
}: AssetTreeItemProps) {
  const depthPadding = `${node.depth * 14 + 8}px`;

  if (node.isFolder) {
    return (
      <button
        type="button"
        onClick={() => onToggleFolder(node.fullPath)}
        style={{ paddingLeft: depthPadding }}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 px-2 text-xs font-mono text-left select-none transition-colors rounded-lg group',
          'hover:bg-hz-navy-700/60 text-hz-gray-300 hover:text-white'
        )}
      >
        <span className="text-hz-gray-500 group-hover:text-hz-brand-400 shrink-0">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <span className="text-amber-400 shrink-0">
          {isOpen ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
        </span>
        <span className="truncate font-semibold text-white/90">{node.name}</span>
        {node.itemCount !== undefined && node.itemCount > 0 && (
          <span className="text-[10px] text-hz-gray-400 font-mono ml-auto px-1.5 py-0.2 rounded-md bg-hz-navy-900/60 shrink-0">
            {node.itemCount}
          </span>
        )}
      </button>
    );
  }

  // File row
  const asset = node.asset!;
  const ext = (node.extension || '').toLowerCase();
  
  const isImage = asset.kind === 'texture' || ext === 'png' || ext === 'jpg' || ext === 'astc';
  const isAudio = asset.kind === 'audio' || ext === 'wem' || ext === 'pck' || ext === 'wav' || ext === 'mp3';
  const isMesh = asset.kind === 'mesh' || ext === 'obj' || ext === 'fbx';

  return (
    <button
      type="button"
      onClick={() => onSelectFile(asset)}
      style={{ paddingLeft: depthPadding }}
      className={cn(
        'w-full flex items-center gap-2 py-1 px-2 text-xs font-mono text-left select-none transition-all rounded-lg group',
        isSelected
          ? 'bg-amber-500/20 text-amber-200 border-l-2 border-amber-400 shadow-sm font-semibold'
          : 'hover:bg-hz-navy-700/50 text-hz-gray-300 hover:text-white'
      )}
    >
      {/* Miniature preview thumbnail / icon */}
      <div
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center shrink-0 border overflow-hidden',
          isSelected
            ? 'bg-amber-500/30 border-amber-400/60 text-amber-300'
            : isImage
            ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
            : isAudio
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            : isMesh
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
        )}
      >
        {isImage ? (
          <ImageIcon className="h-3 w-3" />
        ) : isAudio ? (
          <Volume2 className="h-3 w-3" />
        ) : isMesh ? (
          <Box className="h-3 w-3" />
        ) : ext === 'json' || ext === 'txt' ? (
          <FileCode className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
      </div>

      <span className="truncate flex-1 font-mono text-[11px]">{node.name}</span>
      {ext && (
        <span className="text-[9px] uppercase tracking-wider text-hz-gray-400 font-mono px-1 rounded bg-hz-navy-900/60 shrink-0">
          {ext}
        </span>
      )}
    </button>
  );
}
