export const RELEASE_LINKS = {
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL?.trim() ?? '',
  accountDeletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL?.trim() ?? '',
  marketingUrl: process.env.EXPO_PUBLIC_MARKETING_URL?.trim() ?? '',
  iosAppUrl: process.env.EXPO_PUBLIC_IOS_APP_URL?.trim() ?? '',
  androidAppUrl: process.env.EXPO_PUBLIC_ANDROID_APP_URL?.trim() ?? '',
} as const;

export const ONLINE_SERVICES = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
} as const;
