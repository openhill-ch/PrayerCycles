import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.prayercycles.app',
  appName: 'Prayer Cycles',
  webDir: 'dist',
  ios: {
    // 'never' lets the web content extend under the status bar / Dynamic Island
    // and home indicator; the app handles the safe areas itself via CSS
    // env(safe-area-inset-*), so no white gap shows at the top or bottom.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Prayer Cycles',
  },
  plugins: {
    Keyboard: {
      // Resize the web view when the keyboard opens so vh-based layouts (like
      // the Add modal) shrink to the visible area — otherwise the keyboard
      // covers the bottom of the modal and the submit button is unreachable.
      resize: KeyboardResize.Native,
    },
  },
  server: {
    // Needed for local-first Dexie.js — no external server
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
};

export default config;
