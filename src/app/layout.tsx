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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
