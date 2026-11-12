import { useEffect, useState } from 'react'
import type { Photo } from '../db/types'

// Lado mayor de las fotos guardadas: suficiente para verlas bien sin llenar el almacenamiento
const MAX_SIDE = 1600

// Reduce una imagen y la convierte a JPEG antes de guardarla en el dispositivo
export async function resizeImage(file: Blob, maxSide = MAX_SIDE, quality = 0.82): Promise<Photo> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', quality))
  return { id: crypto.randomUUID(), blob, width, height }
}

// URL temporal para mostrar un Blob en un <img>; se libera al dejar de usarla
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return blob ? url : undefined
}
