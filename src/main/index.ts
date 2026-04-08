/**
 * Echo — Main Process
 * Handles: overlay window, cursor tracking, global shortcuts,
 * screen capture, settings persistence, system tray.
 */

import {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  globalShortcut,
  desktopCapturer,
  Tray,
  Menu,
  nativeImage,
  session
} from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EchoSettings {
  activationShortcut: string
  apiKey: string
  language: 'en' | 'bn' | 'auto'
  outputText: boolean
  outputVoice: boolean
  cursorIconPath: string
}

const DEFAULT_SETTINGS: EchoSettings = {
  activationShortcut: 'Ctrl+Shift+D',
  apiKey: '',
  language: 'auto',
  outputText: true,
  outputVoice: true,
  cursorIconPath: ''
}

// ─── State ────────────────────────────────────────────────────────────────────

let overlayWindow: BrowserWindow | null = null
let tray: Tray | null = null
let settings: EchoSettings = { ...DEFAULT_SETTINGS }
let cursorPollInterval: ReturnType<typeof setInterval> | null = null
let isActive = false

const SETTINGS_PATH = join(app.getPath('userData'), 'echo-settings.json')

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSettings(): void {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const raw = readFileSync(SETTINGS_PATH, 'utf-8')
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    settings = { ...DEFAULT_SETTINGS }
  }
}

function persistSettings(): void {
  try {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (e) {
    console.error('[Echo] Failed to save settings:', e)
  }
}

// ─── Overlay Window ───────────────────────────────────────────────────────────

function createOverlayWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false, // starts non-focusable so it doesn't steal focus
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Allow mic access for voice input
      webSecurity: true
    }
  })

  // Ensure it stays above everything including full-screen apps
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Start in pass-through mode — mouse events go straight to underlying apps
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.loadURL('http://localhost:5173')
    overlayWindow.webContents.openDevTools({ mode: 'detach' }) // Debug: see API logs
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  overlayWindow.once('ready-to-show', () => {
    overlayWindow?.show()
  })

  // Grant mic permission automatically (needed for voice input)
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') callback(true)
    else callback(false)
  })
}

// ─── Cursor Tracking ──────────────────────────────────────────────────────────

function startCursorPolling(): void {
  // Poll at ~60fps and send cursor position to renderer
  cursorPollInterval = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const point = screen.getCursorScreenPoint()
    overlayWindow.webContents.send('cursor-position', { x: point.x, y: point.y })
  }, 16)
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

function registerShortcut(): boolean {
  globalShortcut.unregisterAll()

  try {
    const ok = globalShortcut.register(settings.activationShortcut, () => {
      toggleEcho()
    })
    if (!ok) console.warn(`[Echo] Could not register shortcut: ${settings.activationShortcut}`)
    return ok
  } catch (e) {
    console.error('[Echo] Shortcut registration error:', e)
    return false
  }
}

// ─── Activation Toggle ────────────────────────────────────────────────────────

async function toggleEcho(): Promise<void> {
  if (!overlayWindow) return

  if (isActive) {
    // Deactivate
    deactivateEcho()
  } else {
    // Take screenshot BEFORE showing UI (captures clean screen)
    const screenshot = await captureScreen()
    isActive = true

    overlayWindow.setFocusable(true)
    overlayWindow.setIgnoreMouseEvents(false)
    overlayWindow.focus()
    overlayWindow.webContents.send('echo-activate', { active: true, screenshot })
  }
}

function deactivateEcho(): void {
  if (!overlayWindow) return
  isActive = false
  overlayWindow.setFocusable(false)
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.webContents.send('echo-activate', { active: false, screenshot: null })
}

// ─── Screen Capture ───────────────────────────────────────────────────────────

async function captureScreen(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })

    if (sources.length === 0) return null

    // Use primary display source
    const primary = sources[0]
    const base64 = primary.thumbnail.toPNG().toString('base64')
    return base64
  } catch (e) {
    console.error('[Echo] Screen capture failed:', e)
    return null
  }
}

// ─── System Tray ─────────────────────────────────────────────────────────────

function createTray(): void {
  // Provide a tray icon — fallback to empty 16x16 if icon.png is missing
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 })
    : nativeImage.createEmpty()

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Echo — AI Screen Assistant')

  const menu = Menu.buildFromTemplate([
    {
      label: `Activate (${settings.activationShortcut})`,
      click: () => toggleEcho()
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        overlayWindow?.webContents.send('show-settings', true)
        if (overlayWindow) {
          overlayWindow.setFocusable(true)
          overlayWindow.setIgnoreMouseEvents(false)
          overlayWindow.focus()
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit Echo', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => toggleEcho())
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function setupIPC(): void {
  // Renderer asks to deactivate (e.g. user pressed Escape or clicked backdrop)
  ipcMain.on('deactivate', () => deactivateEcho())

  // Renderer requests a fresh screenshot on demand (e.g. for follow-up questions)
  ipcMain.handle('take-screenshot', async () => {
    return await captureScreen()
  })

  // Renderer reads settings on startup
  ipcMain.handle('get-settings', () => settings)

  // Renderer saves updated settings
  ipcMain.handle('save-settings', (_event, updated: Partial<EchoSettings>) => {
    const prevShortcut = settings.activationShortcut
    settings = { ...settings, ...updated }
    persistSettings()

    // Re-register shortcut if it changed
    if (updated.activationShortcut && updated.activationShortcut !== prevShortcut) {
      registerShortcut()
      // Update tray menu label
      tray?.setContextMenu(
        Menu.buildFromTemplate([
          { label: `Activate (${settings.activationShortcut})`, click: () => toggleEcho() },
          { type: 'separator' },
          {
            label: 'Settings',
            click: () => overlayWindow?.webContents.send('show-settings', true)
          },
          { type: 'separator' },
          { label: 'Quit Echo', click: () => app.quit() }
        ])
      )
    }

    return settings
  })

  // Renderer opens settings panel
  ipcMain.on('open-settings', () => {
    overlayWindow?.webContents.send('show-settings', true)
    if (overlayWindow) {
      overlayWindow.setFocusable(true)
      overlayWindow.setIgnoreMouseEvents(false)
      overlayWindow.focus()
    }
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  loadSettings()
  setupIPC()
  createOverlayWindow()
  startCursorPolling()
  registerShortcut()
  createTray()

  console.log(`[Echo] Ready! Shortcut: ${settings.activationShortcut}`)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (cursorPollInterval) clearInterval(cursorPollInterval)
})

// Keep app running even if all windows are closed
app.on('window-all-closed', () => {
  /* intentionally empty — app lives in tray */
})
