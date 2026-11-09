/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        '4.5': '1.125rem',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
        ],
      },
      fontSize: {
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        'h3': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['16px', { lineHeight: '1.45', fontWeight: '600' }],
        'h5': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        'h6': ['13px', { lineHeight: '1.5', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'table-header': ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        'table-cell': ['13.5px', { lineHeight: '1.45', fontWeight: '400' }],
        'badge': ['12px', { lineHeight: '1.3', fontWeight: '500' }],
        'helper': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0f3a78", // HYDRAA Government deep royal/navy blue
          foreground: "#ffffff",
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0a2350',
        },
        secondary: {
          DEFAULT: "#e2e8f0",
          foreground: "#0f172a",
        },
        accent: {
          DEFAULT: "#c99738", // Official Telangana gold
          foreground: "#1a1a1a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

