// Dynamic Expo configuration
// This file allows runtime configuration based on environment

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.CPFI.pro.dev';
  if (IS_PREVIEW) return 'com.CPFI.pro.preview';
  return 'com.CPFI.pro';
};

const getAppName = () => {
  if (IS_DEV) return 'CPFI Dev';
  if (IS_PREVIEW) return 'CPFI Preview';
  return 'CPFI';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'CPFI-pro',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'CPFI',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#3B82F6',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: '1',
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSCameraUsageDescription:
          'CPFI needs camera access to scan credit reports and documents for analysis',
        NSPhotoLibraryUsageDescription:
          'CPFI needs photo library access to upload credit reports and supporting documents',
        NSFaceIDUsageDescription:
          'CPFI uses Face ID to secure your financial data',
        ITSAppUsesNonExemptEncryption: false,
      },
      associatedDomains: [
        'applinks:CPFI.pro',
        'webcredentials:CPFI.pro',
      ],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#3B82F6',
      },
      package: getUniqueIdentifier(),
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'CPFI.pro',
              pathPrefix: '/app',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#3B82F6',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow CPFI to access your camera to scan documents',
        },
      ],
      'expo-localization',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'CPFI-pro-app',
      },
      // Runtime environment variables
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL || 'https://api.CPFI.pro',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    owner: 'CPFI',
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || 'CPFI-pro-app'}`,
      fallbackToCacheTimeout: 30000,
      checkAutomatically: 'ON_LOAD',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};

