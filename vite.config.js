// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 1. Membuka akses agar bisa diakses via IP di jaringan
    host: '0.0.0.0', 
    port: 5173,
    strictPort: true, 
    
    proxy: {
      '/api': {
        // 2. Arahkan ke IP PC yang menjalankan wppconnect-server (backend)
        // WAJIB pakai protokol (http://) supaya tidak salah tafsir jadi port 80.
        // Backend & frontend beda mesin, jadi harus pakai IP backend, bukan localhost.
        target: 'http://192.168.1.15:21465', 
        changeOrigin: true,
        secure: false,
        // 3. Tambahkan rewrite jika backend kamu tidak mengharapkan prefix /api
        // rewrite: (path) => path.replace(/^\/api/, ''), 
        
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log ini membantu kamu melihat apakah request beneran lewat proxy
            // console.log('Sending Request to the Target:', req.method, req.url);
          });
        },
      }
    }
  }
})

// // vite.config.js
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     // Biarkan kosong atau hapus properti host agar default ke localhost
//     proxy: {
//       '/api': {
//         target: 'http://localhost:21465',
//         changeOrigin: true,
//         secure: false,
//         headers: {
//           Connection: 'keep-alive'
//         },
//         configure: (proxy, _options) => {
//           proxy.on('error', (err, _req, _res) => {
//             console.log('proxy error', err);
//           });
//         },
//       }
//     }
//   }
// })