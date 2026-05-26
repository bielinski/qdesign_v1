import type { SerializedProject } from './types';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function saveProjectFile(data: SerializedProject): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await save({
      filters: [{ name: 'QDesign2', extensions: ['qdesign2'] }],
    });
    if (!filePath) return false;
    await writeTextFile(filePath, JSON.stringify(data, null, 2));
    return true;
  }

  return new Promise((resolve) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projekt.qdesign2';
    a.click();
    URL.revokeObjectURL(url);
    resolve(true);
  });
}

export async function openProjectFile(): Promise<SerializedProject | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await open({
      filters: [{ name: 'QDesign2', extensions: ['qdesign2'] }],
      multiple: false,
    });
    if (!filePath) return null;
    const content = await readTextFile(filePath as string);
    return JSON.parse(content) as SerializedProject;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.qdesign2';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve(JSON.parse(text) as SerializedProject);
    };
    input.click();
  });
}
