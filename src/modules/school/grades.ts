import type { Assessment } from '../../db/types'

export const PASS_GRADE = 5
export const MAX_GRADE = 10

export interface GradeSummary {
  // Media ponderada de lo que ya tiene nota (null si nada tiene nota)
  average: number | null
  // Parte del total de la nota que ya está evaluada (0 a 1)
  evaluated: number
  // Nota media que necesitas en lo que queda para llegar a `target` (null si ya no queda nada por evaluar)
  needed: number | null
}

// Si ninguna evaluación tiene peso, todas pesan lo mismo
function weights(list: Assessment[]): number[] {
  const anyWeight = list.some((a) => a.weight > 0)
  return list.map((a) => (anyWeight ? Math.max(0, a.weight) : 1))
}

export function summarizeGrades(assessments: Assessment[], target = PASS_GRADE): GradeSummary {
  const w = weights(assessments)
  const total = w.reduce((a, b) => a + b, 0)
  let gradedWeight = 0
  let points = 0
  assessments.forEach((a, i) => {
    if (a.grade === null) return
    gradedWeight += w[i]
    points += a.grade * w[i]
  })
  const remaining = total - gradedWeight
  return {
    average: gradedWeight > 0 ? points / gradedWeight : null,
    evaluated: total > 0 ? gradedWeight / total : 0,
    needed: remaining > 0 ? Math.max(0, (target * total - points) / remaining) : null,
  }
}

// 7.25 -> "7,3" en español, "7.3" en inglés
export function formatGrade(grade: number, language: string): string {
  return new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(grade)
}
