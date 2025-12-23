// vite.config.ts
import { defineConfig } from "file:///E:/%E5%B7%A5%E6%97%B6%E7%AE%A1%E7%90%86/node_modules/vite/dist/node/index.js";
import react from "file:///E:/%E5%B7%A5%E6%97%B6%E7%AE%A1%E7%90%86/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "E:\\\u5DE5\u65F6\u7BA1\u7406";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  build: {
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("react-dom") || id.includes("react")) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@dnd-kit")) return "vendor-dnd";
            if (id.includes("sonner")) return "vendor-toast";
            return "vendor-common";
          }
          if (id.includes("/src/pages/Reports")) return "chunk-reports";
          if (id.includes("/src/pages/Dashboard")) return "chunk-dashboard";
          return void 0;
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "sonner",
      "lucide-react"
    ]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxcdTVERTVcdTY1RjZcdTdCQTFcdTc0MDZcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFx1NURFNVx1NjVGNlx1N0JBMVx1NzQwNlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU1JUI3JUE1JUU2JTk3JUI2JUU3JUFFJUExJUU3JTkwJTg2L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA5MDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3Qtcm91dGVyJykpIHJldHVybiAndmVuZG9yLXJvdXRlcidcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0JykpIHJldHVybiAndmVuZG9yLXJlYWN0J1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAc3VwYWJhc2UnKSkgcmV0dXJuICd2ZW5kb3Itc3VwYWJhc2UnXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3hsc3gnKSkgcmV0dXJuICd2ZW5kb3IteGxzeCdcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykpIHJldHVybiAndmVuZG9yLWljb25zJ1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAZG5kLWtpdCcpKSByZXR1cm4gJ3ZlbmRvci1kbmQnXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3Nvbm5lcicpKSByZXR1cm4gJ3ZlbmRvci10b2FzdCdcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWNvbW1vbidcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL1JlcG9ydHMnKSkgcmV0dXJuICdjaHVuay1yZXBvcnRzJ1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9wYWdlcy9EYXNoYm9hcmQnKSkgcmV0dXJuICdjaHVuay1kYXNoYm9hcmQnXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgICdzb25uZXInLFxuICAgICAgJ2x1Y2lkZS1yZWFjdCdcbiAgICBdXG4gIH1cbn0pKVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyTyxTQUFTLG9CQUFvQjtBQUN4USxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxJQUNwQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDeEMsZ0JBQUksR0FBRyxTQUFTLFdBQVcsS0FBSyxHQUFHLFNBQVMsT0FBTyxFQUFHLFFBQU87QUFDN0QsZ0JBQUksR0FBRyxTQUFTLFdBQVcsRUFBRyxRQUFPO0FBQ3JDLGdCQUFJLEdBQUcsU0FBUyxNQUFNLEVBQUcsUUFBTztBQUNoQyxnQkFBSSxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDeEMsZ0JBQUksR0FBRyxTQUFTLFVBQVUsRUFBRyxRQUFPO0FBQ3BDLGdCQUFJLEdBQUcsU0FBUyxRQUFRLEVBQUcsUUFBTztBQUNsQyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxvQkFBb0IsRUFBRyxRQUFPO0FBQzlDLGNBQUksR0FBRyxTQUFTLHNCQUFzQixFQUFHLFFBQU87QUFDaEQsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
