import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import eslint from "vite-plugin-eslint2";
import { defineConfig, loadEnv } from "vite";
import fs from "fs";

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  // Point to your certs folder
  const CERT_DIR = path.resolve(__dirname, "certs");

  return defineConfig({
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
          globals: {
            react: "React",
          },
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
      host: "0.0.0.0",   // bind all for LAN/WSL
      https: {
        key: fs.readFileSync(path.join(CERT_DIR, "q2o-key.pem")),
        cert: fs.readFileSync(path.join(CERT_DIR, "q2o-cert.pem")),
      },
      proxy: {
        "/api": {
          target: "https://127.0.0.1:5000", // backend now on HTTPS
          changeOrigin: true,
          secure: false,                    // accept self-signed cert
        },
      },
    },
  });
};
