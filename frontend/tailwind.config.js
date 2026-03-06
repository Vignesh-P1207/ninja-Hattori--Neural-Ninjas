/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#050000',
                cardBg: '#0f0202',
                border: '#3a0909',
                primary: '#ff2a2a',
                success: '#3FB950',
                warning: '#D29922',
                danger: '#ff0000',
                textPrimary: '#ffe5e5',
                textMuted: '#a37c7c',
            },
            fontFamily: {
                code: ['"JetBrains Mono"', 'monospace'],
                ui: ['"IBM Plex Sans"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
