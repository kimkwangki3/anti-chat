/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                peach: {
                    50: '#FFF8F5',
                    100: '#FFE8DC',
                    200: '#FFD0BC',
                    300: '#FFB5A0',
                    400: '#FF9A80',
                    500: '#FF8C69', // 메인
                    600: '#E8735A',
                    700: '#C05A42',
                    800: '#8B3D2A',
                    900: '#5A2015',
                }
            }
        },
    },
    plugins: [],
}
