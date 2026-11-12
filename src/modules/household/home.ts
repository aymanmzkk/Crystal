import type { Aisle, Chore, DateKey } from '../../db/types'
import { diffDays } from '../../lib/dates'

export const AISLES: Aisle[] = ['fruit', 'bakery', 'dairy', 'meat', 'pantry', 'frozen', 'drinks', 'cleaning', 'hygiene', 'other']

// Palabras que delatan el pasillo (en español y en inglés). Se busca el inicio de cada palabra.
const KEYWORDS: Record<Exclude<Aisle, 'other'>, string[]> = {
  fruit: ['manzana', 'plátano', 'platano', 'naranja', 'tomate', 'lechuga', 'cebolla', 'patata', 'zanahoria', 'fruta', 'verdura', 'limón', 'limon', 'aguacate', 'pimiento', 'apple', 'banana', 'orange', 'tomato', 'lettuce', 'onion', 'potato', 'fruit'],
  bakery: ['pan', 'barra', 'bollo', 'croissant', 'galleta', 'bread', 'cookie'],
  dairy: ['leche', 'yogur', 'queso', 'mantequilla', 'nata', 'huevo', 'milk', 'yogurt', 'cheese', 'butter', 'egg'],
  meat: ['pollo', 'carne', 'ternera', 'cerdo', 'jamón', 'jamon', 'pavo', 'pescado', 'salmón', 'salmon', 'atún', 'atun', 'chicken', 'beef', 'pork', 'ham', 'fish'],
  pantry: ['arroz', 'pasta', 'macarrones', 'espagueti', 'aceite', 'sal', 'azúcar', 'azucar', 'harina', 'lentejas', 'garbanzos', 'tomate frito', 'café', 'cafe', 'cereales', 'rice', 'oil', 'sugar', 'flour', 'coffee', 'cereal'],
  frozen: ['congelad', 'helado', 'pizza', 'frozen', 'ice cream'],
  drinks: ['agua', 'refresco', 'zumo', 'cerveza', 'vino', 'coca', 'water', 'juice', 'beer', 'wine', 'soda'],
  cleaning: ['detergente', 'lejía', 'lejia', 'friegaplatos', 'suavizante', 'bayeta', 'estropajo', 'basura', 'limpia', 'papel de cocina', 'detergent', 'bleach', 'sponge'],
  hygiene: ['champú', 'champu', 'gel', 'pasta de dientes', 'cepillo', 'desodorante', 'papel higiénico', 'papel higienico', 'compresas', 'shampoo', 'toothpaste', 'deodorant', 'toilet paper'],
}

// Pasillo más probable para un producto; 'other' si no se reconoce
export function guessAisle(name: string): Aisle {
  const text = name.toLowerCase()
  // Las frases de varias palabras ganan a las sueltas ("pasta de dientes" no es pasta)
  let best: { aisle: Aisle; length: number } = { aisle: 'other', length: 0 }
  for (const [aisle, words] of Object.entries(KEYWORDS) as [Aisle, string[]][]) {
    for (const word of words) {
      const at = text.indexOf(word)
      const startsWord = at === 0 || (at > 0 && /[\s,(-]/.test(text[at - 1]))
      if (at >= 0 && startsWord && word.length > best.length) best = { aisle, length: word.length }
    }
  }
  return best.aisle
}

// "leche x2", "2 leche", "huevos 12" -> nombre y cantidad
export function parseItem(text: string): { name: string; quantity: string } {
  const clean = text.trim().replace(/\s+/g, ' ')
  const suffix = clean.match(/^(.*?)\s*(?:x\s*(\d+)|(\d+)\s*(?:uds?|kg|g|l)?)$/i)
  if (suffix && suffix[1]) return { name: suffix[1].trim(), quantity: (suffix[2] ?? suffix[3]) + (/\d+\s*(kg|g|l)$/i.exec(clean)?.[1] ?? '') }
  const prefix = clean.match(/^(\d+)\s*x?\s+(.+)$/i)
  if (prefix) return { name: prefix[2].trim(), quantity: prefix[1] }
  return { name: clean, quantity: '' }
}

// Días que faltan para que toque (negativo = atrasada). Si nunca se ha hecho, toca hoy.
export function choreDaysLeft(chore: Pick<Chore, 'everyDays' | 'lastDone'>, today: DateKey): number {
  if (!chore.lastDone) return 0
  return chore.everyDays - diffDays(chore.lastDone, today)
}
