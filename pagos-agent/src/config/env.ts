export const env = {
  MONGODB_URI: process.env.MONGODB_URI!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  EMAIL_USER: process.env.EMAIL_USER!,
  EMAIL_PASS: process.env.EMAIL_PASS!,
  CRON_SECRET: process.env.CRON_SECRET,
} as const;
