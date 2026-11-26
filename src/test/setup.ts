Object.assign(process.env, {
  ROCRATE_API_BASE_URL: 'https://api.example.com',
  OIDC_ISSUER: 'https://idp.example.com',
  OIDC_CLIENT_ID: 'client-id',
  OIDC_CLIENT_SECRET: 'client-secret',
  OIDC_REDIRECT_URI: 'http://localhost:7000/auth/callback',
  SESSION_SECRET: 'a-session-secret-of-at-least-32-characters',
  S3_BUCKET: 'bucket',
  EMAIL_FROM: 'noreply@example.com',
});
