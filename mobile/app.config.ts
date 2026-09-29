import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the config. This only adds the web base path when building
 * the web app for GitHub Pages (EXPO_BASE_URL=/BoostYourCommunity/app), so
 * local development still serves from the root.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
