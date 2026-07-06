import * as jose from 'jose';
import { appPath } from '#/shared/paths.ts';
import { config } from './config.ts';

type OidcConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
};

type TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
};

export type UserInfo = {
  sub: string;
  email?: string | undefined;
  name?: string | undefined;
};

let oidcConfig: OidcConfig | null = null;
let jwks: jose.JWTVerifyGetKey | null = null;

const getOidcConfig = async (): Promise<OidcConfig> => {
  if (oidcConfig) {
    return oidcConfig;
  }

  const discoveryUrl = new URL('.well-known/openid-configuration', config.OIDC_ISSUER);
  const response = await fetch(discoveryUrl.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery: ${response.status}`);
  }

  oidcConfig = (await response.json()) as OidcConfig;

  return oidcConfig;
};

const getJwks = async (): Promise<jose.JWTVerifyGetKey> => {
  if (!jwks) {
    const oidc = await getOidcConfig();
    jwks = jose.createRemoteJWKSet(new URL(oidc.jwks_uri));
  }

  return jwks;
};

export const getAuthorizationUrl = async (state: string): Promise<string> => {
  const oidc = await getOidcConfig();
  const url = new URL(oidc.authorization_endpoint);

  url.searchParams.set('client_id', config.OIDC_CLIENT_ID);
  url.searchParams.set('redirect_uri', config.OIDC_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.OIDC_SCOPES);
  url.searchParams.set('state', state);

  return url.toString();
};

export const exchangeCodeForTokens = async (code: string): Promise<TokenResponse> => {
  const oidc = await getOidcConfig();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.OIDC_REDIRECT_URI,
    client_id: config.OIDC_CLIENT_ID,
    client_secret: config.OIDC_CLIENT_SECRET,
  });

  const response = await fetch(oidc.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
};

export const verifyIdToken = async (idToken: string): Promise<UserInfo> => {
  const keySet = await getJwks();

  const { payload } = await jose.jwtVerify(idToken, keySet, {
    issuer: config.OIDC_ISSUER,
    audience: config.OIDC_CLIENT_ID,
  });

  return {
    sub: payload.sub as string,
    email: payload['email'] as string | undefined,
    name: payload['name'] as string | undefined,
  };
};

export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
  const oidc = await getOidcConfig();

  const response = await fetch(oidc.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const data = await response.json();

  return {
    sub: data.sub,
    email: data.email,
    name: data.name,
  };
};

export const getLogoutUrl = async (idTokenHint?: string): Promise<string> => {
  const oidc = await getOidcConfig();

  if (!oidc.end_session_endpoint) {
    return appPath();
  }

  const url = new URL(oidc.end_session_endpoint);

  if (idTokenHint) {
    url.searchParams.set('id_token_hint', idTokenHint);
  }

  // Build post-logout redirect URI from the configured redirect URI
  const redirectUrl = new URL(config.OIDC_REDIRECT_URI);
  redirectUrl.pathname = appPath();
  redirectUrl.search = '';
  url.searchParams.set('post_logout_redirect_uri', redirectUrl.toString());

  return url.toString();
};

export const generateState = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
