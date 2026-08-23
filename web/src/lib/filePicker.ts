/**
 * Universal File & Directory Picker + Explorer Launcher for Web / Desktop environment.
 * In Tauri desktop mode: Calls native Windows Win32 / Form Dialogs for 100% full paths.
 * In Web Browser mode: Uses File System Access API with fallback.
 */
import { isTauri, tauriApi } from './tauri';

export async function openFolderInExplorer(path: string): Promise<boolean> {
  if (!path) return false;
  if (isTauri()) {
    try {
      await tauriApi.openInExplorer(path);
      return true;
    } catch (e) {
      console.warn('[FilePicker] Failed to open in explorer via Tauri:', e);
    }
  }

  // Fallback for browser mode: notify user
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(path);
    }
  } catch {
    // ignore
  }
  return false;
}

export async function openDumpFolderInExplorer(): Promise<boolean> {
  if (isTauri()) {
    try {
      await tauriApi.openDumpFolder();
      return true;
    } catch (e) {
      console.warn('[FilePicker] Failed to open dump folder via Tauri:', e);
    }
  }
  return openFolderInExplorer('./DUMP');
}

export async function pickDirectory(): Promise<string | null> {
  // 1. Native Desktop Shell (Tauri)
  if (isTauri()) {
    try {
      const selected = await tauriApi.pickDirectoryDialog();
      if (selected) {
        return selected.replace(/\\/g, '/');
      }
      return null;
    } catch (e) {
      console.debug('[FilePicker] Native picker error, falling back to web:', e);
    }
  }

  // 2. Modern Web File System Access API
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      return dirHandle.name;
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err.name !== 'AbortError') {
        console.debug('[FilePicker] Directory picker cancelled or error:', e);
      }
      return null;
    }
  }

  // 3. Fallback for standard browsers
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', 'true');
    input.style.display = 'none';

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const relativePath = file.webkitRelativePath || '';
        const folderName = relativePath.split('/')[0] || file.name;
        const fullPath = (file as unknown as { path?: string }).path || folderName;
        resolve(fullPath.replace(/\\/g, '/'));
      } else {
        resolve(null);
      }
      document.body.removeChild(input);
    };

    input.oncancel = () => {
      resolve(null);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export async function pickFile(acceptExtensions?: string[]): Promise<string | null> {
  // 1. Native Desktop Shell (Tauri)
  if (isTauri()) {
    try {
      const filter = acceptExtensions ? acceptExtensions.map((e) => (e.startsWith('.') ? `*${e}` : `*.${e}`)).join(';') : '*.*';
      const selected = await tauriApi.pickFileDialog(filter);
      if (selected) {
        return selected.replace(/\\/g, '/');
      }
      return null;
    } catch (e) {
      console.debug('[FilePicker] Native file picker error, falling back to web:', e);
    }
  }

  // 2. Modern Web Open File Picker
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (window as unknown as {
        showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: acceptExtensions
          ? [
              {
                description: 'Target Files',
                accept: {
                  '*/*': acceptExtensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)),
                },
              },
            ]
          : undefined,
      });

      if (handles && handles.length > 0) {
        return handles[0].name;
      }
      return null;
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err.name !== 'AbortError') {
        console.debug('[FilePicker] Open file cancelled or error:', e);
      }
      return null;
    }
  }

  // 3. Fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (acceptExtensions) {
      input.accept = acceptExtensions
        .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
        .join(',');
    }
    input.style.display = 'none';

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const fullPath = (file as unknown as { path?: string }).path || file.name;
        resolve(fullPath.replace(/\\/g, '/'));
      } else {
        resolve(null);
      }
      document.body.removeChild(input);
    };

    input.oncancel = () => {
      resolve(null);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}
