import { useEffect, useState } from 'react'

// Fecha y hora actuales, actualizadas cada minuto (para la línea de "ahora" y las cuentas atrás)
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}
