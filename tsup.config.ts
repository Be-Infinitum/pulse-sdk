import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'es2022',
    splitting: false,
  },
  {
    entry: { checkout: 'src/checkout.standalone.ts' },
    format: ['iife'],
    outExtension: () => ({ js: '.js' }),
    minify: true,
    target: 'es2020',
    splitting: false,
  },
  {
    entry: ['src/ai.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    target: 'es2022',
    splitting: false,
    external: ['ai', '@ai-sdk/provider'],
  },
])
