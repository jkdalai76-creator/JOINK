import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Joink — Website extraction & research workspace",
    template: "%s · Joink",
  },
  description:
    "Joink extracts useful public information from websites, organizes it into a structured, traceable format, and lets you explore saved results through text or voice.",
};

// Applies the saved (or OS-preferred) theme before first paint — no flash.
const themeInitScript = `try{var t=localStorage.getItem("joink-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
