/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                customPurple: '#f6863a',
                customPurpleLight: '#f8c6a0',
                'blue': '#094f89',
                'neutral-blue': '#0d66a0',
                'light-neutral-blue': '#5E67A4',
                'light-blue': '#EEF0D1',
                'light-gray': '#000000',
                'dark-blue': '#171A26',
            },
            fontFamily: {
                sans: ['Roboto', 'sans-serif']
            },
            screens: {
                mobile: '375px',
                tablet: '768px',
                desktop: '1024px',
            },
            fontSize:{
                'mobile-sm': ['12px', '16px'],
                'mobile-base': ['14px', '20px'],
                'mobile-lg': ['16px', '24px'],
                'mobile-xl': ['18px', '28px'],
                'mobile-2xl': ['20px', '32px'],
                'mobile-3xl': ['22px', '36px'],
                'desktop-sm': ['14px', '18px'],
                'desktop-base': ['16px', '24px'],
                'desktop-lg': ['18px', '28px'],
                'desktop-xl': ['20px', '32px'],
                'desktop-2xl': ['22px', '34px'],
                'desktop-3xl': ['24px', '36px'],
            }
        },

    },
    plugins: [],
}
