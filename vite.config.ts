/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Keycloak n'accepte que http://localhost:5173 pour le client web-bo :
    // sur un autre port, la connexion echouerait.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Les tests d'ecran tapent au clavier lettre par lettre dans jsdom : sur une machine chargee,
    // ou avec toute la suite en parallele, les plus longs depassaient les 5 s par defaut.
    testTimeout: 15_000,
  },
})
