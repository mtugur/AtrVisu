import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  ATRVISU_SOURCE_BRANCH_HEADER,
  ATRVISU_SOURCE_HEAD_HEADER,
  readGitSourceProvenance
} from "./scripts/e2eRunnerHelpers.mjs";

const source = readGitSourceProvenance();

export default defineConfig({
  plugins: [
    react(),
    {
      name: "atrvisu-source-provenance",
      configureServer(server) {
        server.config.logger.info(`AtrVisu source: ${source.branch} @ ${source.head}`);
      }
    }
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    headers: {
      [ATRVISU_SOURCE_HEAD_HEADER]: source.head,
      [ATRVISU_SOURCE_BRANCH_HEADER]: source.branch
    }
  }
});
