/**
 * Echo — Preload Script
 * Bridges the main process IPC to renderer via contextBridge.
 * Only safe, explicitly whitelisted channels are exposed.
 */

import { contextBridge, ipcRenderer } from 'electron'

// Allowed channels for security
const SEND_CHANNELS = ['deactivate', 'open-settings'] as const
const INVOKE_CHANNELS = ['take-screenshot', 'get-settings', 'save-settings'] as const
const ON_CHANNELS = ['cursor-position', 'echo-activate', 'show-settings'] as const

type SendChannel = (typeof SEND_CHANNELS)[number]
type InvokeChannel = (typeof INVOKE_CHANNELS)[number]
type OnChannel = (typeof ON_CHANNELS)[number]

export interface ElectronAPI {
  send: (channel: SendChannel, ...args: unknown[]) => void
  invoke: (channel: InvokeChannel, ...args: unknown[]) => Promise<unknown>
  on: (channel: OnChannel, callback: (...args: unknown[]) => void) => () => void
}

const electronAPI: ElectronAPI = {
  send(channel, ...args) {
    if ((SEND_CHANNELS as readonly string[]).includes(channel)) {
      ipcRenderer.send(channel, ...args)
    }
  },

  invoke(channel, ...args) {
    if ((INVOKE_CHANNELS as readonly string[]).includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Channel not allowed: ${channel}`))
  },

  on(channel, callback) {
    if ((ON_CHANNELS as readonly string[]).includes(channel)) {
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args)
      ipcRenderer.on(channel, handler)

      // Return a cleanup function to remove the listener
      return () => ipcRenderer.removeListener(channel, handler)
    }
    return () => {}
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type augmentation for renderer — lets TypeScript know about window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
