import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss()],
  nitro: {
    preset: "vercel",
  },
});
