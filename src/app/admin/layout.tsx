import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Studio admin", template: "%s · Studio admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
