import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

const CPC6128_PAGE = new URL("./src/index.html", import.meta.url),
  CPC464_PAGE = new URL("./src/cpc464.html", import.meta.url),
  CPC464_DDI1_PAGE = new URL("./src/cpc464-ddi1.html", import.meta.url),
  PAGES = [CPC6128_PAGE, CPC464_PAGE, CPC464_DDI1_PAGE].map(page => fileURLToPath(page))

export default defineConfig({
  root: "./src",
  build: { outDir: "../dist", emptyOutDir: true, rolldownOptions: { input: PAGES } },
  server: { port: 5175 }
})
