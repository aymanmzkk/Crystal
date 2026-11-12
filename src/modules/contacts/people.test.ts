import { describe, expect, it } from 'vitest'
import { ageOn, contactOverdue, nextBirthday } from './people'

describe('contactos', () => {
  it('próximo cumpleaños este año o el siguiente', () => {
    expect(nextBirthday('11-17', '2026-11-06')).toBe('2026-11-17')
    expect(nextBirthday('11-06', '2026-11-06')).toBe('2026-11-06')
    expect(nextBirthday('03-02', '2026-11-06')).toBe('2027-03-02')
  })

  it('el 29 de febrero pasa al 28 en años no bisiestos', () => {
    expect(nextBirthday('02-29', '2026-11-06')).toBe('2027-02-28')
    expect(nextBirthday('02-29', '2027-11-06')).toBe('2028-02-29')
  })

  it('calcula la edad que cumple', () => {
    expect(ageOn(1970, '2026-11-17')).toBe(56)
    expect(ageOn(null, '2026-11-17')).toBeNull()
  })

  it('avisa cuando han pasado más días de los que querías', () => {
    const base = { createdAt: new Date(2026, 0, 1).getTime(), contactEveryDays: 14 }
    expect(contactOverdue({ ...base, lastContact: '2026-10-20' }, '2026-11-06')).toBe(3)
    expect(contactOverdue({ ...base, lastContact: '2026-11-01' }, '2026-11-06')).toBeNull()
    expect(contactOverdue({ ...base, contactEveryDays: null, lastContact: null }, '2026-11-06')).toBeNull()
  })
})
