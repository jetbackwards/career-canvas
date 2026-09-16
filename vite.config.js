import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	root: 'client',
	plugins: [vue()],
	publicDir: '../public',
	server: {
		host: '0.0.0.0',
		port: 5173,
		proxy: {
			'/api': {
				target: process.env.VITE_API_PROXY || 'http://localhost:3000',
				changeOrigin: true
			}
		}
	},
	build: { outDir: '../dist', emptyOutDir: true }
});
