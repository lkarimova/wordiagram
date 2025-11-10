import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BodyClass } from "@/src/components/BodyBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wordiagram — A Real-Time Painting of the Latest World News.",
  description:
    "Wordiagram takes breaking world news and turns it into a symbolic painting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen text-black`}
      >
        <BodyClass />
          {children}
      </body>
    </html>
  );
}
