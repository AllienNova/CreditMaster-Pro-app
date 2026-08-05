// Dynamic Expo configuration
// This file allows runtime configuration based on environment

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) return "com.fynvita.app.dev";
  if (IS_PREVIEW) return "com.fynvita.app.preview";
  return "com.fynvita.app";
};

const getAppName = () => {
  if (IS_DEV) return "Fynvita Dev";
  if (IS_PREVIEW) return "Fynvita Preview";
  return "Fynvita";
};

export default {
  expo: {
    name: getAppName(),
    slug: "fynvita",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "fynvita",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#10B981",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: "1",
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSCameraUsageDescription:
          "Fynvita needs camera access to scan credit reports and documents for analysis",
        NSPhotoLibraryUsageDescription:
          "Fynvita needs photo library access to upload credit reports and supporting documents",
        NSFaceIDUsageDescription:
          "Fynvita uses Face ID to secure your financial data",
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["fetch", "remote-notification", "processing"],
        BGTaskSchedulerPermittedIdentifiers: [
          "com.fynvita.app.creditmonitor",
          "com.fynvita.app.datasync",
          "com.fynvita.app.pricealert",
        ],
      },
      associatedDomains: ["applinks:fynvita.com", "webcredentials:fynvita.com"],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#10B981",
      },
      package: getUniqueIdentifier(),
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "fynvita.com",
              pathPrefix: "/app",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#10B981",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow Fynvita to access your camera to scan documents",
        },
      ],
      "expo-font",
      "expo-localization",
      "expo-background-fetch",
      "expo-task-manager",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "40f2866c-c0be-4537-8288-681588999236",
      },
      // Runtime environment variables
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    owner: "kimhons",
  },
};
