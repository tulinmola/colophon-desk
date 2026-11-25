import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

const PAGES = {
  index: fileURLToPath(new URL("./src/index.html", import.meta.url)),
  desk: fileURLToPath(new URL("./src/desk.html", import.meta.url))
}

export default defineConfig({
  root: "./src",
  build: { outDir: "../dist", emptyOutDir: true, rolldownOptions: { input: PAGES } },
  server: { port: 5175 }
})
