/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Claves de Supabase: van en .env.local (no se suben a ningún sitio)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

// File System Access API: elegir una carpeta y pedir permiso. Solo existe en Chrome y Edge (no en todos los móviles),
// por eso todo es opcional y se comprueba antes de usarlo.
interface Window {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: 'documents' | 'downloads' | 'pictures' }) => Promise<FileSystemDirectoryHandle>
}

interface FileSystemHandle {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

// Contact Picker API: elegir contactos del móvil (Chrome en Android). El usuario decide cuáles comparte.
interface ContactsSelectResult {
  name?: string[]
  tel?: string[]
  email?: string[]
}
interface ContactsManager {
  getProperties(): Promise<string[]>
  select(properties: string[], options?: { multiple?: boolean }): Promise<ContactsSelectResult[]>
}
interface Navigator {
  contacts?: ContactsManager
}
