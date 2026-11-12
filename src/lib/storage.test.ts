import { describe, expect, it } from 'vitest'
import { GB, MB, addSnapshot, alertLevel, categoryOf, nextAlert, recommend, summarize, type FileInfo } from './storage'

const file = (over: Partial<FileInfo>): FileInfo => ({
  id: Math.random().toString(), ownerTable: 'trips', ownerId: 'v', slot: '', name: 'x', type: 'image/jpeg', category: 'photos', module: 'travel',
  size: 10, localBytes: 10, local: true, archive: null, date: null, createdAt: 0, comment: '', inTrash: false, preview: null, ...over,
})

describe('tipos de archivo', () => {
  it('separa fotos, vídeos, documentos y otros', () => {
    expect(categoryOf('image/png')).toBe('photos')
    expect(categoryOf('video/mp4')).toBe('videos')
    expect(categoryOf('application/pdf')).toBe('documents')
    expect(categoryOf('application/zip')).toBe('other')
  })
})

describe('resumen', () => {
  it('cuenta lo que ocupa en el dispositivo y lo archivado', () => {
    const verified = { kind: 'folder' as const, targetId: 't', targetName: 'USB', path: 'p', sha256: 'h', archivedAt: 1, verifiedAt: 1 }
    const s = summarize([
      file({ localBytes: 100, size: 100 }),
      file({ type: 'application/pdf', category: 'documents', module: 'documents', localBytes: 300, size: 300, archive: verified }),
      file({ local: false, localBytes: 5, size: 400, archive: verified }),
    ])
    expect(s.localBytes).toBe(405)
    expect(s.localCount).toBe(2)
    expect(s.byCategory.documents.bytes).toBe(300)
    expect(s.byModule[0]).toMatchObject({ module: 'documents', bytes: 300 })
    expect(s.released).toBe(1)
    expect(s.releasedBytes).toBe(400)
    expect(s.releasableBytes).toBe(300)
    expect(s.archivedVerified).toBe(2)
  })
})

describe('avisos', () => {
  it('niveles al 70, 85 y 95 %', () => {
    expect(alertLevel(600 * MB, GB)).toBe(0)
    expect(alertLevel(750 * MB, GB)).toBe(70)
    expect(alertLevel(880 * MB, GB)).toBe(85)
    expect(alertLevel(990 * MB, GB)).toBe(95)
  })
  it('no repite el mismo aviso y vuelve a avisar tras liberar espacio', () => {
    let state = nextAlert(750 * MB, GB, 0)
    expect(state.notify).toBe(70)
    state = nextAlert(760 * MB, GB, state.last)
    expect(state.notify).toBeNull()
    state = nextAlert(900 * MB, GB, state.last)
    expect(state.notify).toBe(85)
    // Se archiva y baja mucho: el nivel avisado vuelve a 0
    state = nextAlert(300 * MB, GB, state.last)
    expect(state).toEqual({ notify: null, last: 0 })
    expect(nextAlert(720 * MB, GB, state.last).notify).toBe(70)
  })
})

it('el historial guarda una medida por día', () => {
  let h = addSnapshot([], { date: '2026-11-01', bytes: 1, files: 1 })
  h = addSnapshot(h, { date: '2026-11-01', bytes: 2, files: 2 })
  h = addSnapshot(h, { date: '2026-10-31', bytes: 0, files: 0 })
  expect(h.map((x) => [x.date, x.bytes])).toEqual([['2026-10-31', 0], ['2026-11-01', 2]])
})

describe('recomendaciones', () => {
  const now = Date.UTC(2026, 10, 10)
  const DAY = 24 * 60 * 60 * 1000
  it('propone archivos grandes, antiguos, de viajes terminados y sin abrir, nunca lo ya archivado', () => {
    const files = [
      file({ id: 'grande', size: 8 * MB, localBytes: 8 * MB, createdAt: now }),
      file({ id: 'viejo', date: '2024-01-01', createdAt: now }),
      file({ id: 'viaje', ownerId: 'lisboa', date: '2026-10-01', createdAt: now }),
      file({ id: 'olvidado', createdAt: now - 300 * DAY, date: '2026-09-01' }),
      file({ id: 'papelera', inTrash: true, createdAt: now }),
      file({ id: 'ya', size: 9 * MB, localBytes: 9 * MB, createdAt: now, archive: { kind: 'folder', targetId: 't', targetName: 'x', path: 'p', sha256: 'h', archivedAt: 1, verifiedAt: 1 } }),
    ]
    const tips = recommend(files, { now, tripEnds: new Map([['lisboa', '2026-05-14']]), openedAt: {} })
    const byRule = Object.fromEntries(tips.map((t) => [t.rule, t.ids]))
    expect(byRule.large).toEqual(['grande'])
    expect(byRule.old).toEqual(['viejo'])
    expect(byRule.pastTrips).toContain('viaje')
    expect(byRule.notOpened).toEqual(['olvidado'])
    expect(byRule.trash).toEqual(['papelera'])
    expect(tips.flatMap((t) => t.ids)).not.toContain('ya')
    expect(tips[0].rule).toBe('large')
  })
})
