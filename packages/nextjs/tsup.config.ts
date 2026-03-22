import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/middleware.ts', 'src/server.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'next'],
})
