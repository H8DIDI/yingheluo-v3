/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Red-themed high-contrast color scheme
        'app-bg': '#0A0404',          // Very dark red-tinted black
        'panel-bg': '#1A0808',        // Dark red-tinted panel
        'panel-border': '#4A1515',    // Medium dark red border
        'text-main': '#FFFFFF',       // Pure white for maximum contrast
        'text-secondary': '#E5E5E5',  // Light gray for secondary text
        'primary': '#DC2626',         // Vibrant red (primary color)
        'primary-hover': '#EF4444',   // Lighter red for hover
        'accent-orange': '#F59E0B',   // Amber/orange accent
        'accent-yellow': '#FBBF24',   // Yellow accent
        'danger': '#DC2626',          // Red for danger
        'success': '#10B981',         // Green for success
        'warning': '#F59E0B',         // Amber for warning
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(220, 38, 38, 0.6)',
        'glow-danger': '0 0 18px rgba(220, 38, 38, 0.7)',
        'glow-orange': '0 0 16px rgba(245, 158, 11, 0.5)',
      }
    },
  },
  plugins: [],
}
