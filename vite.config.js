import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import eslint from "vite-plugin-eslint2";
import fs from "fs";

const CERT_DIR = path.resolve(__dirname, "certs");

export default defineConfig({
  root: "src",
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "react-chatbotify",
      fileName: "index",
      formats: ["es", "cjs"],
      cssFileName: "style",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react-dom/server",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      output: {
        globals: { react: "React" },
        intro: 'import "./style.css";',
      },
    },
    outDir: "../dist",
  },
  assetsInclude: ["**/*.svg", "**/*.png", "**/*.wav"],
  plugins: [
    svgr({ svgrOptions: { ref: true } }),
    react({ include: "**/*.{jsx,tsx}" }),
    eslint(),
  ],
  server: {
    port: 5173,
    host: "0.0.0.0",
    https: {
      key: fs.readFileSync(path.join(CERT_DIR, "q2o-key.pem")),
      cert: fs.readFileSync(path.join(CERT_DIR, "q2o-cert.pem")),
    },
    proxy: {
      "/api": {
        target: "https://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
