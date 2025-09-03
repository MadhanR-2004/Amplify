// Shared background theme configurations
export const backgroundThemes = [
  {
    id: 'default',
    name: 'Ocean Blue',
    preview: 'linear-gradient(135deg, #054983 0%, #2387BF 25%, #00A6FF 75%, #2A92C3 100%)',
    colors: ['#054983', '#2387BF', '#00A6FF', '#2A92C3'],
    config: {
      colors: [
        { color: '#054983', enabled: true },
        { color: '#2387BF', enabled: true },
        { color: '#00A6FF', enabled: true },
        { color: '#2A92C3', enabled: true },
      ],
      backgroundColor: '#004E64',
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Vibes',
    preview: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FF6B9D 75%, #C44569 100%)',
    colors: ['#FF6B6B', '#FF8E53', '#FF6B9D', '#C44569'],
    config: {
      colors: [
        { color: '#FF6B6B', enabled: true },
        { color: '#FF8E53', enabled: true },
        { color: '#FF6B9D', enabled: true },
        { color: '#C44569', enabled: true },
      ],
      backgroundColor: '#8B2635',
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    preview: 'linear-gradient(135deg, #2D5016 0%, #3E7B27 25%, #76BA1B 75%, #4C9141 100%)',
    colors: ['#2D5016', '#3E7B27', '#76BA1B', '#4C9141'],
    config: {
      colors: [
        { color: '#2D5016', enabled: true },
        { color: '#3E7B27', enabled: true },
        { color: '#76BA1B', enabled: true },
        { color: '#4C9141', enabled: true },
      ],
      backgroundColor: '#1A2E05',
    }
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    preview: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 25%, #A855F7 75%, #8B5CF6 100%)',
    colors: ['#4C1D95', '#7C3AED', '#A855F7', '#8B5CF6'],
    config: {
      colors: [
        { color: '#4C1D95', enabled: true },
        { color: '#7C3AED', enabled: true },
        { color: '#A855F7', enabled: true },
        { color: '#8B5CF6', enabled: true },
      ],
      backgroundColor: '#2E1065',
    }
  },
  {
    id: 'cosmic',
    name: 'Cosmic Dark',
    preview: 'linear-gradient(135deg, #0F0F23 0%, #1A1A2E 25%, #16213E 75%, #0F3460 100%)',
    colors: ['#0F0F23', '#1A1A2E', '#16213E', '#0F3460'],
    config: {
      colors: [
        { color: '#0F0F23', enabled: true },
        { color: '#1A1A2E', enabled: true },
        { color: '#16213E', enabled: true },
        { color: '#0F3460', enabled: true },
      ],
      backgroundColor: '#0B0B15',
    }
  },
  {
    id: 'warm',
    name: 'Warm Sunset',
    preview: 'linear-gradient(135deg, #FF9A56 0%, #FF6B6B 25%, #4ECDC4 75%, #45B7D1 100%)',
    colors: ['#FF9A56', '#FF6B6B', '#4ECDC4', '#45B7D1'],
    config: {
      colors: [
        { color: '#FF9A56', enabled: true },
        { color: '#FF6B6B', enabled: true },
        { color: '#4ECDC4', enabled: true },
        { color: '#45B7D1', enabled: true },
      ],
      backgroundColor: '#FF7F50',
    }
  }
];

// Get theme configuration by ID
export function getThemeById(themeId: string) {
  return backgroundThemes.find(theme => theme.id === themeId) || backgroundThemes[0];
}

// Save theme to localStorage
export function saveTheme(themeId: string) {
  try {
    localStorage.setItem('backgroundTheme', themeId);
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}

// Load theme from localStorage
export function loadTheme(): string {
  try {
    return localStorage.getItem('backgroundTheme') || 'default';
  } catch (error) {
    console.error('Error loading theme:', error);
    return 'default';
  }
}
