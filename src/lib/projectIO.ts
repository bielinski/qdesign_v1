import type { SerializedProject } from './types';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function saveProjectFile(data: SerializedProject, filePath?: string): Promise<string | null> {
  if (isTauri()) {
    if (filePath) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
      return filePath;
    }
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const chosenPath = await save({
      filters: [{ name: 'QDesign2', extensions: ['qdesign'] }],
    });
    if (!chosenPath) return null;
    await writeTextFile(chosenPath, JSON.stringify(data, null, 2));
    return chosenPath;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  if (filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    a.download = parts[parts.length - 1] || 'projekt.qdesign';
  } else {
    a.download = 'projekt.qdesign';
  }
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  return filePath ?? 'projekt.qdesign';
}

export async function openProjectFile(): Promise<{ data: SerializedProject; filePath: string | null } | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const chosenPath = await open({
      filters: [{ name: 'QDesign2', extensions: ['qdesign'] }],
      multiple: false,
    });
    if (!chosenPath) return null;
    const content = await readTextFile(chosenPath as string);
    return { data: JSON.parse(content) as SerializedProject, filePath: chosenPath as string };
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.qdesign';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve({ data: JSON.parse(text) as SerializedProject, filePath: null });
    };
    input.click();
  });
}
