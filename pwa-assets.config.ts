import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Fondo oscuro del logo para el relleno de los iconos "maskable" y de Apple (si no, saldría blanco)
const background = '#0b0d16'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/logo.svg'],
})
