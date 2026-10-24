import { getAdSettings } from "@/lib/content/queries";

export const dynamic = "force-dynamic";

/** https://midnightpoetry.studio/ads.txt — generated from the AdSense publisher ID set in the admin. */
export async function GET() {
  let body = "# No ad networks are authorised yet.\n";
  try {
    const s = await getAdSettings();
    const client = s?.adsense_client;
    if (client && /^ca-pub-\d{16}$/.test(client)) body = `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
  } catch {
    /* keep the placeholder */
  }
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
