// Naninha - Baby Sleep Tracker Colors
// Soft, calming palette for a soothing experience

const palette = {
  // Primary colors
  lavender: '#B8A9C9',
  lavenderDark: '#9A8AAE',
  
  // Accent colors
  coral: '#F4A896',
  coralDark: '#E8927E',
  mint: '#A8D5BA',
  mintDark: '#8BC4A2',
  
  // Neutrals
  cream: '#FDF8F5',
  creamDark: '#1A1A2E',
  warmGray: '#8E8E93',
  softWhite: '#FEFEFE',
  
  // Sleep states
  sleeping: '#7C9CBF', // Soft blue for active sleep
  awake: '#F4D06F',    // Warm yellow for awake
};

export default {
  light: {
    text: '#2D2D3A',
    textSecondary: '#6B6B7B',
    background: palette.cream,
    cardBackground: palette.softWhite,
    tint: palette.lavender,
    tabIconDefault: palette.warmGray,
    tabIconSelected: palette.lavender,
    
    // Nap-specific
    napActive: palette.coral,
    napInactive: palette.lavender,
    sleeping: palette.sleeping,
    awake: palette.awake,
    mint: palette.mint,
    
    // Borders & shadows
    border: '#E8E4E1',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    text: '#FEFEFE',
    textSecondary: '#A0A0B0',
    background: palette.creamDark,
    cardBackground: '#252538',
    tint: palette.lavender,
    tabIconDefault: palette.warmGray,
    tabIconSelected: palette.lavender,
    
    // Nap-specific
    napActive: palette.coralDark,
    napInactive: palette.lavenderDark,
    sleeping: palette.sleeping,
    awake: palette.awake,
    mint: palette.mintDark,
    
    // Borders & shadows
    border: '#3A3A4A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};
