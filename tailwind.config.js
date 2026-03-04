/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                aurum: {
                    primary: '#5A8A00',
                    'primary-light': '#7AB800',
                    bg: '#080A0E',
                    surface: '#0D1017',
                    surface2: '#131820',
                    surface3: '#1C2330',
                    border: '#1F2B3A',
                    text: '#E8EDF5',
                    'text-muted': '#5A6A80',
                    green: '#00E676',
                    red: '#FF4757',
                    cyan: '#00D4FF',
                    gold: '#F0C96B',
                }
            },
            fontFamily: {
                sans: ['DM Sans', 'sans-serif'],
                mono: ['DM Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'flash-green': 'flashGreen 0.5s ease-out',
                'flash-red': 'flashRed 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                flashGreen: {
                    '0%': { backgroundColor: 'rgba(0, 230, 118, 0.15)' },
                    '100%': { backgroundColor: 'transparent' },
                },
                flashRed: {
                    '0%': { backgroundColor: 'rgba(255, 71, 87, 0.15)' },
                    '100%': { backgroundColor: 'transparent' },
                },
            }
        },
    },
    plugins: [],
}
