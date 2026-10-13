import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fresh Phones PH · iPhone & iPad Paluwagan",
  description:
    "Quality pre-owned and brand-new iPhones and iPad through paluwagan and installment. Flexible weekly, 15 & 30, or monthly payments as low as ₱59 a day. DTI registered as FP Gadget Center.",
  keywords: [
    "iPhone paluwagan",
    "iPad paluwagan",
    "iPhone installment Philippines",
    "Fresh Phones PH",
    "FP Gadget Center",
    "pre-owned iPhone Philippines",
  ],
  openGraph: {
    title: "Fresh Phones PH · iPhone & iPad Paluwagan",
    description:
      "Quality pre-owned and brand-new iPhones and iPad through paluwagan. Flexible payments as low as ₱59 a day. DTI registered.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('freshphones-system-theme');var theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.systemTheme=theme}catch(e){document.documentElement.dataset.systemTheme='light'}})()`,
          }}
        />
      </head>
      <body className="min-h-full overflow-x-hidden">{children}</body>
    </html>
  );
}
