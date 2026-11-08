import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

const CPC6128_PAGE = new URL("./src/index.html", import.meta.url),
  CPC464_PAGE = new URL("./src/cpc464.html", import.meta.url),
  SPECTRUM48_PAGE = new URL("./src/spectrum48.html", import.meta.url),
  PAGES = [fileURLToPath(CPC6128_PAGE), fileURLToPath(CPC464_PAGE), fileURLToPath(SPECTRUM48_PAGE)]

export default defineConfig({
  root: "./src",
  build: { outDir: "../dist", emptyOutDir: true, rolldownOptions: { input: PAGES } },
  server: { port: 5175 }
})
