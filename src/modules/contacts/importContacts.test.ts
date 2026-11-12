import { describe, expect, it } from 'vitest'
import type { Contact } from '../../db/types'
import { parseBirthday, parseVCard, planImport } from './importContacts'

describe('archivos .vcf', () => {
  it('lee nombre, teléfono, correo y cumpleaños, también de varios contactos y líneas partidas', () => {
    const vcf = [
      'BEGIN:VCARD', 'VERSION:3.0', 'FN:María García', 'N:García;María;;;', 'TEL;TYPE=CELL:+34 600 11 22 33', 'EMAIL:Maria@Ejemplo.com', 'BDAY:1999-03-07', 'END:VCARD',
      'BEGIN:VCARD', 'VERSION:3.0', 'N:Pérez;Juan;;;', 'TEL:611223344', 'BDAY:--12-25', 'NOTE:una nota muy lar', ' ga partida', 'END:VCARD',
    ].join('\r\n')
    expect(parseVCard(vcf)).toEqual([
      { name: 'María García', phone: '+34 600 11 22 33', email: 'maria@ejemplo.com', birthday: '03-07', birthYear: 1999 },
      { name: 'Juan Pérez', phone: '611223344', email: '', birthday: '12-25', birthYear: null },
    ])
  })

  it('entiende las vCard 2.1 de Android con acentos codificados', () => {
    const vcf = ['BEGIN:VCARD', 'VERSION:2.1', 'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Mam=C3=A1', 'TEL;CELL:622 33 44 55', 'END:VCARD'].join('\n')
    expect(parseVCard(vcf)[0]).toMatchObject({ name: 'Mamá', phone: '622 33 44 55' })
  })

  it('cumpleaños en varios formatos', () => {
    expect(parseBirthday('19980307')).toEqual({ birthday: '03-07', birthYear: 1998 })
    expect(parseBirthday('--0412')).toEqual({ birthday: '04-12', birthYear: null })
    expect(parseBirthday('mañana')).toBeNull()
  })
})

describe('duplicados', () => {
  const existing = (over: Partial<Contact>): Contact => ({
    id: 'e1', createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0, name: 'Mamá', relation: 'family', phone: '', email: '', birthday: null, birthYear: null,
    lastContact: null, contactEveryDays: null, gifts: [], notes: '', ...over,
  })
  it('reconoce el mismo número aunque cambie el formato, y solo rellena lo que falta', () => {
    const rows = planImport(
      [
        { name: 'Mama', phone: '+34 622 33 44 55', email: 'mama@x.com', birthday: '05-01', birthYear: 1970 },
        { name: 'Nuevo', phone: '699000111', email: '', birthday: null, birthYear: null },
        { name: 'Nuevo', phone: '699000111', email: '', birthday: null, birthYear: null },
      ],
      [existing({ phone: '622334455', email: 'ya@tengo.com' })],
    )
    expect(rows).toHaveLength(2)
    const mama = rows.find((r) => r.existingId === 'e1')!
    expect(mama.status).toBe('update')
    // El correo que ya tenías no se cambia
    expect(mama.changes).toEqual({ birthday: '05-01', birthYear: 1970 })
    expect(rows.find((r) => r.contact.name === 'Nuevo')!.status).toBe('new')
  })
})
