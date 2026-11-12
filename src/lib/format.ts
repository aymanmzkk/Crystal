// 85 -> "1 h 25 min", 45 -> "45 min", 120 -> "2 h"
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function formatMoney(amount: number, language: string): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(amount)
}

// Número con como mucho 1 decimal y el separador del idioma: 88.7 -> "88,7" en español
export function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
}
