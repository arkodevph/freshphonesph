import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden">{children}</body>
    </html>
  );
}
