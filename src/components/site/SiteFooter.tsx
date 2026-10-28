import Link from "next/link";
import { CookieChoices } from "./CookieChoices";

export function SiteFooter({ showCookieChoices = false, className = "" }: { showCookieChoices?: boolean; className?: string }) {
  return (
    <footer className={`site-footer wrap ${className}`} data-foot>
      <span className="glow">© {new Date().getFullYear()} Midnight Poetry Studio · Made after dark.</span>
      <nav aria-label="Footer">
        <a href="https://zyra.midnightpoetry.studio/">Zyra</a>
        <a href="https://zeno.midnightpoetry.studio/">Zeno</a>
        <a href="https://zora.midnightpoetry.studio/">Zora</a>
        <a href="https://zotikos.midnightpoetry.studio/">Zotikos</a>
        <Link href="/guides">Guides</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/about-ads">About ads</Link>
        {showCookieChoices ? <CookieChoices /> : null}
      </nav>
    </footer>
  );
}
