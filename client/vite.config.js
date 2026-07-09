import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Use rolldownOptions (not rollupOptions) for Rolldown
    rolldownOptions: {
      output: {
        // Use codeSplitting object (not manualChunks function)
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom)/,
              priority: 20,
            },
            {
              name: "router",
              test: /node_modules[\\/]react-router-dom/,
              priority: 19,
            },
            {
              name: "socket",
              test: /node_modules[\\/]socket.io-client/,
              priority: 18,
            },
            {
              name: "emoji",
              test: /node_modules[\\/]emoji-picker-react/,
              priority: 17,
            },
            {
              name: "vendor",
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
    // Your react chunk is 538 KB - consider splitting it further
    chunkSizeWarningLimit: 600, // Increased to 600KB temporarily
  },
});