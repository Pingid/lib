import { defineConfig } from 'vite'

import { iife } from '@pingid/lib/vite/plugin/iife'

export default defineConfig({
  resolve: { conditions: ['ts'] },
  plugins: [iife({ sw: './src/sw.ts' })],
})
