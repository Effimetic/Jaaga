// Theme definitions decoupled from react-native-paper to work with NativeWind

export const lightTheme = {
  colors: {
    primary: '#1976d2',
    primaryContainer: '#e3f2fd',
    secondary: '#03dac6',
    secondaryContainer: '#e0f2f1',
    tertiary: '#ff9800',
    tertiaryContainer: '#fff3e0',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    background: '#fafafa',
    error: '#d32f2f',
    errorContainer: '#ffebee',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#002171',
    onSecondary: '#000000',
    onSecondaryContainer: '#002020',
    onTertiary: '#000000',
    onTertiaryContainer: '#e65100',
    onSurface: '#1a1a1a',
    onSurfaceVariant: '#424242',
    onBackground: '#1a1a1a',
    onError: '#ffffff',
    onErrorContainer: '#790e0e',
  },
} as const;

export const darkTheme = {
  colors: {
    primary: '#90caf9',
    primaryContainer: '#1565c0',
    secondary: '#80cbc4',
    secondaryContainer: '#00695c',
    tertiary: '#ffcc02',
    tertiaryContainer: '#f57c00',
    surface: '#1a1a1a',
    surfaceVariant: '#2a2a2a',
    background: '#121212',
    error: '#ff5555',
    errorContainer: '#b71c1c',
    onPrimary: '#002171',
    onPrimaryContainer: '#e3f2fd',
    onSecondary: '#002020',
    onSecondaryContainer: '#e0f2f1',
    onTertiary: '#e65100',
    onTertiaryContainer: '#fff3e0',
    onSurface: '#ffffff',
    onSurfaceVariant: '#cccccc',
    onBackground: '#ffffff',
    onError: '#000000',
    onErrorContainer: '#ffebee',
  },
} as const;

export const theme = lightTheme;

export const colors = {
  primary: '#1976d2',
  secondary: '#03dac6',
  tertiary: '#ff9800',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#d32f2f',
  info: '#2196f3',
  
  // Boat ticketing specific colors
  ocean: '#006064',
  sand: '#d7ccc8',
  coral: '#ff7043',
  seafoam: '#4db6ac',
  sunset: '#ff8a65',
  
  // Semantic colors
  booked: '#ff5722',
  available: '#4caf50',
  pending: '#ff9800',
  cancelled: '#9e9e9e',
  
  // Role colors
  public: '#2196f3',
  agent: '#9c27b0',
  owner: '#000000',
  admin: '#f44336',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
};
