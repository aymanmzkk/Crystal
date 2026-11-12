import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { moveMemoryPhotos } from '../db/migrations'
import { createRecord } from '../db/repo'
import type { ArchiveTarget, NewRecord, Attachment } from '../db/types'
import { archiveByDownload, archivePath, archiveToFolder, canRelease, recoverAttachment, recoverFromFile, releaseLocalCopies, sha256, verifyDownloads } from './archive'
import { createBackup, restoreBackup } from './backup'

// ───────── Carpeta simulada (File System Access API en memoria) ─────────
class FakeDir {
  dirs = new Map<string, FakeDir>()
  files = new Map<string, Blob>()
  // Si es true, lo que se escribe sale estropeado (para probar que la verificación lo detecta)
  corrupt = false
  constructor(public name: string) {}
  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    if (!this.dirs.has(name)) {
      if (!opts?.create) throw new DOMException('no existe', 'NotFoundError')
      const child = new FakeDir(name)
      child.corrupt = this.corrupt
      this.dirs.set(name, child)
    }
    return this.dirs.get(name)!
  }
  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (!opts?.create) throw new DOMException('no existe', 'NotFoundError')
      this.files.set(name, new Blob([]))
    }
    const dir = this
    return {
      kind: 'file',
      name,
      async createWritable() {
        const parts: BlobPart[] = []
        return {
          write: async (b: Blob) => void parts.push(dir.corrupt ? new Blob(['estropeado']) : b),
          close: async () => void dir.files.set(name, new Blob(parts)),
        }
      },
      async getFile() {
        const b = dir.files.get(name)
        if (!b) throw new DOMException('no existe', 'NotFoundError')
        return new File([b], name)
      },
    }
  }
  async removeEntry(name: string) {
    this.files.delete(name)
  }
  async isSameEntry(other: unknown) {
    return other === this
  }
  // Lee un archivo por su ruta (para comprobar en los tests)
  read(path: string): Blob | undefined {
    const parts = path.split('/')
    let d: FakeDir | undefined = this
    for (const p of parts.slice(0, -1)) d = d?.dirs.get(p)
    return d?.files.get(parts[parts.length - 1])
  }
}

const target = (dir: FakeDir): ArchiveTarget => ({ id: `t-${dir.name}`, name: dir.name, handle: dir as unknown as FileSystemDirectoryHandle, createdAt: 0 })

function attachment(content: string, extra: Partial<NewRecord<Attachment>> = {}): NewRecord<Attachment> {
  const blob = new Blob([content], { type: 'application/pdf' })
  return {
    ownerTable: 'trips', ownerId: 'viaje-1', slot: 'tickets', name: 'billete.pdf', type: 'application/pdf', size: blob.size,
    blob, thumb: null, width: 0, height: 0, date: '2026-11-29', comment: 'vuelo', archive: null, ...extra,
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('rutas del archivo', () => {
  it('guarda cada archivo en la carpeta de su app, por año, con fecha y parte del id', () => {
    const path = archivePath({ id: 'abcdef1234567890', name: 'Billete: Madrid/Lisboa.pdf', type: 'application/pdf', date: '2026-11-29', createdAt: 0, ownerTable: 'trips' })
    expect(path).toBe('Crystal/Viajes/2026/2026-11-29_Billete_ Madrid_Lisboa_abcdef12.pdf')
  })
})

describe('archivar en una carpeta', () => {
  it('copia, verifica y deja la relación con su registro; el original sigue en Crystal', async () => {
    const id = await createRecord('attachments', attachment('contenido del billete'))
    const dir = new FakeDir('Disco externo')
    const [result] = await archiveToFolder(target(dir), [id])
    expect(result.ok).toBe(true)
    const a = (await db.attachments.get(id))!
    expect(a.blob).not.toBeNull()
    expect(a.ownerTable).toBe('trips')
    expect(a.archive?.verifiedAt).toBeTruthy()
    expect(a.archive?.sha256).toBe(await sha256(a.blob!))
    expect(await dir.read(a.archive!.path)!.text()).toBe('contenido del billete')
    // Índice en la carpeta para poder recuperarlo todo
    expect(dir.read('Crystal/crystal-archivo.json')).toBeDefined()
  })

  it('si la copia sale distinta, NO la marca como archivada y la borra', async () => {
    const id = await createRecord('attachments', attachment('original'))
    const dir = new FakeDir('USB')
    dir.corrupt = true
    const [result] = await archiveToFolder(target(dir), [id])
    expect(result).toMatchObject({ ok: false, error: 'verify-failed' })
    const a = (await db.attachments.get(id))!
    expect(a.archive).toBeNull()
    expect(a.blob).not.toBeNull()
    expect(canRelease(a)).toBe(false)
  })
})

describe('liberar espacio', () => {
  it('solo quita el archivo si tiene copia verificada y la huella coincide', async () => {
    const verified = await createRecord('attachments', attachment('verificado'))
    const pending = await createRecord('attachments', attachment('sin verificar'))
    await archiveToFolder(target(new FakeDir('Archivo')), [verified])
    await archiveByDownload([pending], () => undefined)

    const { released, skipped, freed } = await releaseLocalCopies([verified, pending])
    expect(released).toEqual([verified])
    expect(skipped).toEqual([pending])
    expect(freed).toBe(new Blob(['verificado']).size)
    expect((await db.attachments.get(verified))!.blob).toBeNull()
    // El que no está verificado sigue intacto
    expect(await (await db.attachments.get(pending))!.blob!.text()).toBe('sin verificar')
  })

  it('una descarga se verifica al volver a elegir el archivo (aunque tenga otro nombre)', async () => {
    const id = await createRecord('attachments', attachment('billete de tren'))
    await archiveByDownload([id], () => undefined)
    const { verified, unknown } = await verifyDownloads([new File(['billete de tren'], 'otro-nombre.pdf'), new File(['otra cosa'], 'x.pdf')])
    expect(verified).toEqual([id])
    expect(unknown).toEqual(['x.pdf'])
    expect(canRelease((await db.attachments.get(id))!)).toBe(true)
  })
})

describe('recuperar', () => {
  it('trae el archivo de vuelta desde la carpeta', async () => {
    const id = await createRecord('attachments', attachment('para recuperar'))
    const dir = new FakeDir('Archivo')
    await archiveToFolder(target(dir), [id])
    await releaseLocalCopies([id])
    expect(await recoverAttachment(id)).toBe('ok')
    expect(await (await db.attachments.get(id))!.blob!.text()).toBe('para recuperar')
  })

  it('si el archivo ya no está, avisa y NO pierde la referencia', async () => {
    const id = await createRecord('attachments', attachment('se va a perder'))
    const dir = new FakeDir('Disco')
    await archiveToFolder(target(dir), [id])
    await releaseLocalCopies([id])
    const path = (await db.attachments.get(id))!.archive!.path
    await (await dir.getDirectoryHandle('Crystal')).getDirectoryHandle('Viajes').then((d) => d.getDirectoryHandle('2026')).then((d) => d.removeEntry(path.split('/').pop()!))
    expect(await recoverAttachment(id)).toBe('missing')
    const a = (await db.attachments.get(id))!
    expect(a.archive?.path).toBe(path)
    expect(a.blob).toBeNull()
  })

  it('a mano solo acepta el archivo correcto', async () => {
    const id = await createRecord('attachments', attachment('correcto'))
    await archiveToFolder(target(new FakeDir('A')), [id])
    await releaseLocalCopies([id])
    expect(await recoverFromFile(id, new File(['incorrecto'], 'billete.pdf'))).toBe('mismatch')
    expect(await recoverFromFile(id, new File(['correcto'], 'cualquiera.pdf'))).toBe('ok')
  })
})

describe('migración de las fotos de los recuerdos', () => {
  it('pasan a ser adjuntos con el mismo id, en orden, y se puede repetir sin duplicar', async () => {
    const photo = (id: string, text: string) => ({ id, blob: new Blob([text], { type: 'image/jpeg' }), width: 10, height: 10, comment: id === 'p2' ? 'atardecer' : undefined })
    await db.memories.add({ id: 'm1', createdAt: 1000, updatedAt: 1000, deletedAt: 0, dirty: 0, title: 'Lisboa', date: '2026-07-01', place: '', tripId: null, notes: '', photos: [photo('p1', 'uno'), photo('p2', 'dos')] })
    expect(await moveMemoryPhotos(db.memories, db.attachments)).toBe(2)
    expect(await moveMemoryPhotos(db.memories, db.attachments)).toBe(0)
    const rows = await db.attachments.orderBy('id').toArray()
    expect(rows.map((r) => [r.id, r.ownerTable, r.ownerId, r.slot, r.comment, r.date])).toEqual([
      ['p1', 'memories', 'm1', 'photos', '', '2026-07-01'],
      ['p2', 'memories', 'm1', 'photos', 'atardecer', '2026-07-01'],
    ])
    expect((await db.memories.get('m1'))!.photos).toEqual([])
  })
})

describe('copia de seguridad', () => {
  it('guarda los archivos archivados con su referencia y no toca las carpetas elegidas', async () => {
    const id = await createRecord('attachments', attachment('archivado'))
    await archiveToFolder(target(new FakeDir('Archivo')), [id])
    await releaseLocalCopies([id])
    await db.archiveTargets.put({ id: 'carpeta', name: 'Archivo', handle: {} as FileSystemDirectoryHandle, createdAt: 0 })
    const backup = await createBackup()
    expect(await backup.text()).not.toContain('archiveTargets')

    await restoreBackup(backup)
    const a = (await db.attachments.get(id))!
    expect(a.blob).toBeNull()
    expect(a.archive?.verifiedAt).toBeTruthy()
    expect(await db.archiveTargets.count()).toBe(1)
  })
})
