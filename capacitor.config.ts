// Capacitor configuration for packaging this web app into a native Android APK.
// Build locally with:
//   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/local-notifications
//   npm run build
//   npx cap add android
//   npx cap sync android
//   cd android && ./gradlew assembleDebug

export interface CapacitorAndroidConfig {
  appId: string;
  appName: string;
  webDir: string;
  android: {
    allowMixedContent: boolean;
    backgroundColor: string;
  };
  plugins: {
    LocalNotifications: {
      smallIcon: string;
      iconColor: string;
      sound?: string;
    };
  };
}

const config: CapacitorAndroidConfig = {
  appId: 'com.nabd.bp.tracker',
  appName: 'نبض - ضغط الدم',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#F8FAFC',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_heartbeat',
      iconColor: '#0F766E',
    },
  },
};

export default config;
