import i18n from '../i18n'
import { useToast } from '../store/toast'
import { recoverAttachment, recoverFromFile } from './archive'

// Para los botones "Recuperar" (visor, galerías): intenta traerlo y, si no puede, avisa y deja elegir el archivo a mano
export async function recoverWithToast(id: string): Promise<void> {
  const show = useToast.getState().show
  const result = await recoverAttachment(id)
  if (result === 'ok') {
    show({ message: i18n.t('storage.recovered') })
    return
  }
  show({
    message: i18n.t(`storage.recoverErrors.${result}`),
    action: { label: i18n.t('storage.pickFile'), run: () => void pickFileAndRecover(id) },
  })
}

// Abre el selector de archivos y recupera con el que se elija (comprobando la huella)
export function pickFileAndRecover(id: string): Promise<void> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        const result = await recoverFromFile(id, file)
        useToast.getState().show({ message: result === 'ok' ? i18n.t('storage.recovered') : i18n.t(`storage.recoverErrors.${result}`) })
      }
      resolve()
    }
    input.click()
  })
}
