import type { ReactNode } from "react";
import { tokenize } from "./inline-parse";

export { safeHref, tokenize } from "./inline-parse";

export function Inline({ text }: { text: string }): ReactNode {
  return tokenize(text).map((t, i) => {
    switch (t.kind) {
      case "strong":
        return <strong key={i}>{t.text}</strong>;
      case "em":
        return <em key={i}>{t.text}</em>;
      case "link": {
        const external = !t.href.startsWith("/");
        return (
          <a key={i} href={t.href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
            {t.text}
          </a>
        );
      }
      default:
        return <span key={i}>{t.text}</span>;
    }
  });
}
