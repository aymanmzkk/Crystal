// Cifra destacada con su etiqueta (resúmenes de cada app)
export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'danger' | 'success' }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="text-xs text-fg-3">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold tracking-tight ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-fg-3">{sub}</div>}
    </div>
  )
}
