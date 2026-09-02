import { useMemo, useState, useCallback } from 'react';
import { ScannedAssetDto } from '../../lib/tauri';
import { TreeNode, AssetKindFilter } from './types';

export function useAssetTree(
  assets: ScannedAssetDto[],
  searchTerm: string,
  kindFilter: AssetKindFilter,
  extFilter: string
) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(['assets', 'assets/asbres']));

  const toggleFolder = useCallback((path: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((paths: string[]) => {
    setOpenFolders(new Set(paths));
  }, []);

  const collapseAll = useCallback(() => {
    setOpenFolders(new Set());
  }, []);

  // Filter raw assets first
  const filteredAssets = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const targetExt = extFilter.trim().toLowerCase();

    return assets.filter((asset) => {
      // Kind Filter
      if (kindFilter !== 'all' && asset.kind !== kindFilter) {
        return false;
      }

      // Extension Filter
      if (targetExt && targetExt !== 'all') {
        const ext = (asset.extension || '').toLowerCase();
        const nameExt = asset.name.toLowerCase();
        if (!ext.includes(targetExt) && !nameExt.endsWith(`.${targetExt}`)) {
          return false;
        }
      }

      // Search Term
      if (needle) {
        const matchName = asset.name.toLowerCase().includes(needle);
        const matchPath = asset.path.toLowerCase().includes(needle);
        const matchBlock = asset.block.toLowerCase().includes(needle);
        if (!matchName && !matchPath && !matchBlock) {
          return false;
        }
      }

      return true;
    });
  }, [assets, searchTerm, kindFilter, extFilter]);

  // Extract all unique extensions for filter chips
  const availableExtensions = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.extension) {
        set.add(a.extension.toLowerCase());
      } else if (a.name.includes('.')) {
        const ext = a.name.split('.').pop()?.toLowerCase();
        if (ext) set.add(ext);
      }
    }
    return Array.from(set).sort();
  }, [assets]);

  // Build Hierarchical Tree Structure
  const { rootNodes, allFolderPaths } = useMemo(() => {
    interface InternalDir {
      name: string;
      fullPath: string;
      subdirs: Map<string, InternalDir>;
      files: ScannedAssetDto[];
    }

    const root: InternalDir = {
      name: 'root',
      fullPath: '',
      subdirs: new Map(),
      files: [],
    };

    const folderPaths: string[] = [];

    for (const asset of filteredAssets) {
      const cleanPath = asset.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = cleanPath.split('/');
      
      if (parts.length > 1) {
        let current = root;
        let currentPath = '';

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!current.subdirs.has(part)) {
            const newDir: InternalDir = {
              name: part,
              fullPath: currentPath,
              subdirs: new Map(),
              files: [],
            };
            current.subdirs.set(part, newDir);
            folderPaths.push(currentPath);
          }
          current = current.subdirs.get(part)!;
        }
        current.files.push(asset);
      } else {
        root.files.push(asset);
      }
    }

    function convertDirToNodes(dir: InternalDir, depth: number): TreeNode[] {
      const nodes: TreeNode[] = [];

      // Add subdirectories first
      const sortedSubdirs = Array.from(dir.subdirs.values()).sort((a, b) => a.name.localeCompare(b.name));
      for (const subdir of sortedSubdirs) {
        const children = convertDirToNodes(subdir, depth + 1);
        let count = subdir.files.length;
        for (const c of children) {
          count += c.itemCount || 0;
        }

        nodes.push({
          id: `dir_${subdir.fullPath}`,
          name: subdir.name,
          fullPath: subdir.fullPath,
          isFolder: true,
          depth,
          children,
          itemCount: count,
        });
      }

      // Add files in this directory
      const sortedFiles = [...dir.files].sort((a, b) => a.name.localeCompare(b.name));
      for (const file of sortedFiles) {
        nodes.push({
          id: `file_${file.id}`,
          name: file.name,
          fullPath: file.path,
          isFolder: false,
          depth,
          asset: file,
          extension: file.extension || file.name.split('.').pop(),
        });
      }

      return nodes;
    }

    const roots = convertDirToNodes(root, 0);
    return { rootNodes: roots, allFolderPaths: folderPaths };
  }, [filteredAssets]);

  // Flatten the visible rows for 60-120fps smooth scrolling (Zero DOM Overhead)
  const visibleFlatNodes = useMemo(() => {
    const flat: TreeNode[] = [];

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        flat.push(node);
        if (node.isFolder && node.children && openFolders.has(node.fullPath)) {
          traverse(node.children);
        }
      }
    }

    traverse(rootNodes);
    return flat;
  }, [rootNodes, openFolders]);

  return {
    filteredAssets,
    availableExtensions,
    visibleFlatNodes,
    openFolders,
    toggleFolder,
    expandAll: () => expandAll(allFolderPaths),
    collapseAll,
  };
}
