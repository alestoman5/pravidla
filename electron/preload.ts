import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('historie', {
  nacti: () => ipcRenderer.invoke('history:read'),
  pridej: (pokus: unknown) => ipcRenderer.invoke('history:add', pokus),
  vymaz: () => ipcRenderer.invoke('history:clear'),
});

contextBridge.exposeInMainWorld('nastaveni', {
  nacti: () => ipcRenderer.invoke('settings:read'),
  ulozKlic: (klic: string) => ipcRenderer.invoke('settings:setKey', klic),
  smazKlic: () => ipcRenderer.invoke('settings:clearKey'),
});

contextBridge.exposeInMainWorld('asistent', {
  zeptejSe: (dotaz: string, uryvky: unknown, historie: unknown) =>
    ipcRenderer.invoke('assistant:ask', dotaz, uryvky, historie),
});
