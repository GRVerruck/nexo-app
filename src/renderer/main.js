import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'
import router from './router'
import './styles/main.scss'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  theme: {
    defaultTheme: 'nexoLight',
    themes: {
      nexoLight: {
        dark: false,
        colors: {
          background: '#f3f5f7',
          surface: '#ffffff',
          primary: '#1a5f4a',
          secondary: '#2c3e50',
          accent: '#c4782b',
          error: '#c62828',
          info: '#1565c0',
          success: '#2e7d32',
          warning: '#ef6c00',
          'on-background': '#1b242c',
          'on-surface': '#1b242c'
        }
      },
      nexoDark: {
        dark: true,
        colors: {
          background: '#0f1419',
          surface: '#1a222c',
          primary: '#3d9b7a',
          secondary: '#90a4ae',
          accent: '#e0a04a',
          error: '#ef5350',
          info: '#42a5f5',
          success: '#66bb6a',
          warning: '#ffa726'
        }
      }
    }
  },
  defaults: {
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VDataTable: { hover: true }
  }
})

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
