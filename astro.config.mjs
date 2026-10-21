// astro.config.mjs

// ============================================================================
// PART 1: IMPORTS (Tools we bring in)
// ============================================================================
// 1. 'defineConfig': Astro's official helper function that validates your settings.
import { defineConfig } from 'astro/config';

// 2. 'tailwindcss': The official Vite plugin for Tailwind CSS (handles styles & utility classes).
import tailwindcss from '@tailwindcss/vite';

// 3. 'path': Node.js built-in toolkit for handling file paths across Windows, Mac, and Linux.
import path from 'node:path';


// ============================================================================
// PART 2: THE MAIN CONFIGURATION OBJECT
// ============================================================================
export default defineConfig({
  vite: {
    // ------------------------------------------------------------------------
    // PLUGINS SECTION
    // Plugins give Vite extra powers during development and bundling.
    // ------------------------------------------------------------------------
    plugins: [
      // Plugin 1: Compiles all your Tailwind CSS utility classes into actual CSS
      tailwindcss(),

      // Plugin 2: Our Custom Excel Hot-Reload Watcher
      {
        // Internal name for this custom plugin
        name: 'watch-excel-reload',

        // 'configureServer' only runs during local development ('npm run dev').
        // It does NOTHING on Cloudflare production builds (safe & clean).
        configureServer(server) {

          // STEP A: Locate the folder where your spreadsheets live ('src/data')
          // .replace(/\\/g, '/') converts Windows backslashes (C:\...) to forward slashes (C:/...)
          // so the file watcher doesn't get confused on Windows.
          const dataFolder = path.resolve(process.cwd(), 'src/data').replace(/\\/g, '/');

          // STEP B: Tell Vite's watcher to actively monitor the entire src/data folder
          server.watcher.add(dataFolder);

          // STEP C: Listen for any file event inside that folder (save, rename, add, delete)
          server.watcher.on('all', (event, filePath) => {
            // Clean up the file path to forward slashes
            const normalized = filePath.replace(/\\/g, '/');

            // Grab just the file name (e.g. "blogs.xlsx" instead of "C:/Users/.../blogs.xlsx")
            const fileName = path.basename(normalized);

            // ----------------------------------------------------------------
            // FILTER 1: Is it an Excel spreadsheet?
            // AND ignore Excel's hidden lock files (which start with '~$')
            // When Excel is open, it creates files like '~$blogs.xlsx' which we must ignore.
            // ----------------------------------------------------------------
            if (fileName.endsWith('.xlsx') && !fileName.startsWith('~$')) {

              // --------------------------------------------------------------
              // FILTER 2: Did the user save or add new rows? ('change' or 'add')
              // --------------------------------------------------------------
              if (event === 'change' || event === 'add') {

                // 1. Print a friendly green log in your VS Code terminal
                //    \x1b[32m makes the text green in the terminal console
                console.log(`\x1b[32m[excel-update]\x1b[0m ${fileName} saved (${event}). Reloading site...`);

                // 2. WIPE ASTRO'S IN-MEMORY CACHE
                // Astro stores pre-rendered pages in RAM so it doesn't have to rebuild them.
                // If we don't clear this cache, Astro serves the old blog post from memory!
                // We loop through the internal module map and invalidate:
                // - getBlog (the helper reading the spreadsheet)
                // - any page inside /src/pages/
                for (const [url, mod] of server.moduleGraph.urlToModuleMap.entries()) {
                  if (url.includes('getBlog') || url.includes('/src/pages/')) {
                    server.moduleGraph.invalidateModule(mod);
                  }
                }

                // 3. SEND WEBSOCKET RELOAD SIGNAL TO YOUR BROWSER
                // Sends a message directly to your open browser tab saying:
                // "A file changed! Refresh the page right now."
                server.ws.send({
                  type: 'full-reload',
                  path: '*',
                });
              }
            }
          });
        },
      },
    ],

    // ------------------------------------------------------------------------
    // ASSETS INCLUDE
    // Tells Vite that .xlsx files are recognized project assets.
    // ------------------------------------------------------------------------
    assetsInclude: ['**/*.xlsx'],

    // ------------------------------------------------------------------------
    // SERVER POLLING
    // On Windows, file saves can be silent depending on disk drivers.
    // 'usePolling: true' checks disk files every 150 milliseconds to ensure
    // saves are never missed.
    // ------------------------------------------------------------------------
    server: {
      watch: {
        usePolling: true,
        interval: 150, // Check disk every 150ms
      },
    },
  },
});