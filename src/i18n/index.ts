import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettings } from '../store/settings'
import es from './es.json'
import en from './en.json'

const initial = useSettings.getState().language

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})
document.documentElement.lang = initial

// Cuando el usuario cambia el idioma en los ajustes, se cambia en toda la app
useSettings.subscribe((state, prev) => {
  if (state.language !== prev.language) {
    void i18n.changeLanguage(state.language)
    document.documentElement.lang = state.language
  }
})

export default i18n
