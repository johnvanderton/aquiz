import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Palette "encre & sauge" — un thème distinct, pensé pour un quizz :
// encre profonde pour la lecture, sauge pour la validation, corail pour l'erreur.
const inkTheme = {
  dark: false,
  colors: {
    background: '#F6F5F1',
    surface: '#FFFFFF',
    'surface-variant': '#ECEAE3',
    primary: '#22314F',      // encre bleu-nuit
    'primary-darken-1': '#16223A',
    secondary: '#5B7A6B',    // sauge
    accent: '#C97B3F',       // terre cuite pour les CTA
    success: '#3E7A5C',
    error: '#B4482F',
    warning: '#C9973F',
    info: '#3F6FA6'
  }
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'inkTheme',
    themes: { inkTheme }
  },
  defaults: {
    VBtn: { rounded: 'lg', style: 'letter-spacing: 0.02em;' },
    VCard: { rounded: 'lg' }
  }
})
