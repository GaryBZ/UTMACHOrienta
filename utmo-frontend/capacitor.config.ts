import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'UTMACHOrienta',
  webDir: 'www',
  plugins: {
  SplashScreen: {
    launchShowDuration: 3000,
    backgroundColor: "#ffffff",
    showSpinner: false
  }
}
};


export default config;
