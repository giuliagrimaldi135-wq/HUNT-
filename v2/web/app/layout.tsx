import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUNT — Fashion & Luxury Career Intelligence",
  description: "Career intelligence for fashion and luxury."
};

const nav = [
  ["/opportunities", "Opportunità"],
  ["/direct", "Spontanee"],
  ["/intelligence", "Intelligence"],
  ["/applications", "Candidature"],
  ["/profile", "Profilo"]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/opportunities" className="brand">HUNT<span>.</span></Link>
            <div className="brandSub">Fashion & Luxury Career Intelligence</div>
            <nav className="nav">
              {nav.map(([href, label]) => (
                <Link key={href} href={href}>{label}</Link>
              ))}
            </nav>
            <div className="sidebarFooter">
              <div className="statusDot" /> Motore attivo
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
        <nav className="mobileNav">
          {nav.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
