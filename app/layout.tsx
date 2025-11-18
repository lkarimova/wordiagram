import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BodyClass } from "@/src/components/BodyBackground";
import Script from "next/script";

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
      {/* Clarity script – loads on every page */}
      <Script
        id="ms-clarity"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "u84l23gwr7");
          `,
        }}
      />
      
      {/* Google Analytics – load gtag.js */}
      <Script
        id="ga-tag"
        src="https://www.googletagmanager.com/gtag/js?id=G-QNH840ZJ5Q"
        strategy="afterInteractive"
      />

      {/* Google Analytics – init */}
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QNH840ZJ5Q');
          `,
        }}
      />

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen text-black`}
      >
        <BodyClass />
          {children}
      </body>
    </html>
  );
}
