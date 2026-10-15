// Expo Go does not load EAS build-profile variables. Use the existing public links
// in development; release builds still require their configured environment.
export const RELEASE_LINKS = {
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || (__DEV__ ? 'support@flapfitapp.com' : ''),
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() || (__DEV__ ? 'https://flapfitapp.com/privacy/' : ''),
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL?.trim() || (__DEV__ ? 'https://flapfitapp.com/terms/' : ''),
  accountDeletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL?.trim() || (__DEV__ ? 'https://flapfitapp.com/delete-account/' : ''),
  marketingUrl: process.env.EXPO_PUBLIC_MARKETING_URL?.trim() || (__DEV__ ? 'https://flapfitapp.com/' : ''),
  iosAppUrl: process.env.EXPO_PUBLIC_IOS_APP_URL?.trim() ?? '',
  androidAppUrl: process.env.EXPO_PUBLIC_ANDROID_APP_URL?.trim() ?? '',
} as const;

export const ONLINE_SERVICES = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
} as const;
