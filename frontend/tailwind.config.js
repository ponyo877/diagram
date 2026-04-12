/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        soft: {
          bg: '#fdfaf5',
          canvas: '#f7f3ed',
          surface: '#ffffff',
          input: '#faf7f2',
          hover: '#f5f0e8',
          primary: '#4a9ce8',
          'primary-hover': '#3d8ad6',
          'primary-light': '#e8f2fc',
          green: '#5bb98c',
          red: '#e8725c',
          yellow: '#f0c05a',
          text: '#3d3836',
          muted: '#7a7168',
          light: '#a39e95',
          placeholder: '#c4bdb4',
          border: '#e8e2d8',
          'border-dark': '#d8d0c4',
        },
      },
      boxShadow: {
        node: '0 2px 8px rgba(139,120,100,0.08), 0 0 0 1px rgba(139,120,100,0.06)',
        'node-selected': '0 3px 12px rgba(74,156,232,0.18)',
        panel: '-1px 0 0 #e8e2d8',
        modal: '0 12px 40px rgba(139,120,100,0.15)',
      },
    },
  },
  plugins: [],
}
