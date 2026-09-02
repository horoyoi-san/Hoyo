import { ScannedAssetDto } from '../../lib/tauri';

export type AssetKindFilter = 'all' | 'texture' | 'mesh' | 'audio' | 'text' | 'font';

export type ViewMode = 'tree' | 'flat';

export interface TreeNode {
  id: string;
  name: string;
  fullPath: string;
  isFolder: boolean;
  depth: number;
  isOpen?: boolean;
  children?: TreeNode[];
  asset?: ScannedAssetDto;
  itemCount?: number;
  extension?: string;
}

export interface PreviewState {
  loading: boolean;
  dataUrl: string | null;
  width: number;
  height: number;
  format: string;
  error: string | null;
  zoom: number;
  showCheckerboard: boolean;
}
