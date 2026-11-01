import { z } from 'zod/v4';

// NOTE: Configuration is loaded at startup time.
// In TanStack Start context, this runs on the server side.

const emptyAsUnset = <T extends z.ZodType>(schema: T) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(7000),

  ROCRATE_API_BASE_URL: z.url(),

  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.url(),
  OIDC_SCOPES: z.string().default('public openid profile email'),

  SESSION_SECRET: z.string().min(32),

  AWS_REGION: z.string().default('ap-southeast-2'),
  S3_BUCKET: z.string().min(1),
  EMAIL_FROM: z.email(),

  SENTRY_DSN: emptyAsUnset(z.url()),
  SENTRY_ENVIRONMENT: emptyAsUnset(z.string()),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(JSON.stringify(z.treeifyError(result.error), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const config = parseEnv();
