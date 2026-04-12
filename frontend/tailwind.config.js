/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        figma: {
          toolbar: '#1e1e1e',
          'toolbar-border': '#3a3a3a',
          canvas: '#f5f5f5',
          blue: '#0d99ff',
          'blue-hover': '#0a7fd4',
          red: '#f24822',
          green: '#14ae5c',
          border: '#e0e0e0',
          'border-dark': '#c7c7c7',
          text: '#1a1a1a',
          muted: '#757575',
          light: '#999999',
        },
      },
      boxShadow: {
        node: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'node-selected': '0 2px 8px rgba(13,153,255,0.2)',
        panel: '-1px 0 0 #e0e0e0',
        modal: '0 8px 32px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
