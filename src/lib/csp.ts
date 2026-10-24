/**
 * Content Security Policy builders.
 *
 * Everywhere except guide pages with AdSense switched on we use a strict,
 * nonce-based policy with no 'unsafe-eval'. AdSense only supports Google's
 * documented policy (nonce + 'strict-dynamic', which also lists 'unsafe-eval'
 * and https:/http: fallbacks), so that looser policy is scoped to /guides only.
 * https://support.google.com/adsense/answer/16283098
 */

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

export function strictCsp(opts: { nonce: string; supabaseUrl?: string; dev?: boolean }): string {
  const sb = opts.supabaseUrl ? new URL(opts.supabaseUrl).host : "";
  const supabaseHttp = sb ? ` https://${sb}` : "";
  const supabaseWs = sb ? ` wss://${sb}` : "";
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${opts.nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    // React style attributes and Next's injected styles need inline styles.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:${supabaseHttp}`,
    `font-src 'self'`,
    `connect-src 'self'${supabaseHttp}${supabaseWs}${opts.dev ? " ws:" : ""}`,
    `frame-src https://challenges.cloudflare.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  if (!opts.dev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function adsenseCsp(opts: { nonce: string }): string {
  return [
    `script-src 'nonce-${opts.nonce}' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `frame-ancestors 'none'`,
  ].join("; ");
}
