import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createRecord } from '../db/repo'
import { createBackup, restoreBackup } from './backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('copia de seguridad', () => {
  it('guarda y restaura todos los datos, también los archivos', async () => {
    const taskId = await createRecord('tasks', { title: 'Comprar pan', status: 'todo', categoryId: null, due: null, dueTime: null, urgent: false, important: false, reminders: [], notes: '', order: 1, completedAt: null })
    await createRecord('attachments', {
      ownerTable: 'tasks', ownerId: taskId, slot: '', name: 'ticket.txt', type: 'text/plain', size: 4,
      blob: new Blob(['hola'], { type: 'text/plain' }), thumb: null, width: 0, height: 0, date: null, comment: 'ok', archive: null,
    })
    const backup = await createBackup()

    await db.tasks.clear()
    await db.attachments.clear()
    await createRecord('tasks', { title: 'Otra', status: 'todo', categoryId: null, due: null, dueTime: null, urgent: false, important: false, reminders: [], notes: '', order: 2, completedAt: null })

    await restoreBackup(backup)
    const tasks = await db.tasks.toArray()
    expect(tasks.map((x) => x.title)).toEqual(['Comprar pan'])
    const file = (await db.attachments.toArray())[0]
    expect(file.comment).toBe('ok')
    expect(await file.blob!.text()).toBe('hola')
  })

  it('rechaza un archivo que no es una copia', async () => {
    await expect(restoreBackup(new Blob(['{"a":1}']))).rejects.toThrow()
  })
})
