import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// Shared code for store-paypal-create-order and store-paypal-capture-order.
// Secrets: PAYPAL_ENV (sandbox | live), PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET.
// Prices come only from store_sandbox_products. The client never sends a price.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function secret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function paypalEnvironment(): 'sandbox' | 'live' {
  const env = secret('PAYPAL_ENV');
  if (env !== 'sandbox' && env !== 'live') throw new Error('PAYPAL_ENV must be sandbox or live');
  return env;
}

export function paypalApi(): string {
  return paypalEnvironment() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export async function timedFetch(url: string, options: RequestInit = {}) {
  return await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
}

export function centsToValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function paypalToken(): Promise<string> {
  const credentials = btoa(`${secret('PAYPAL_CLIENT_ID')}:${secret('PAYPAL_CLIENT_SECRET')}`);
  const response = await timedFetch(`${paypalApi()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal auth failed (${response.status})`);
  const data = await response.json();
  if (typeof data.access_token !== 'string') throw new Error('Missing PayPal access token');
  return data.access_token;
}

// Verifies the caller from the bearer token. Never trusts a user id sent by the client.
export async function authenticate(
  request: Request,
): Promise<{ admin: SupabaseClient; user: User } | Response> {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return json(401, { error: 'LOGIN_REQUIRED', message: 'Please sign in to the game first.' });
  const admin = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(match[1]);
  if (error || !user) return json(401, { error: 'INVALID_SESSION', message: 'Please sign in again.' });
  return { admin, user };
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
