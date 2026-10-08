import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const displayFace = Barlow_Condensed({
  variable: "--font-display-face",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

const bodyFace = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "FC Không Giải Tán - Quản Lý Điểm Danh",
    template: "%s | FC Không Giải Tán",
  },
  description:
    "Hệ thống quản lý điểm danh và quỹ đội bóng FC Không Giải Tán. Quản lý trận đấu, điểm danh cầu thủ, và theo dõi quỹ đội một cách dễ dàng.",
  keywords: [
    "bóng đá",
    "quản lý đội bóng",
    "điểm danh",
    "FC Không Giải Tán",
    "quỹ đội",
  ],
  authors: [{ name: "FC Không Giải Tán" }],
  creator: "FC Không Giải Tán",
  publisher: "FC Không Giải Tán",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://fkas.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://fkas.vercel.app",
    title: "FC Không Giải Tán - Quản Lý Điểm Danh",
    description: "Hệ thống quản lý điểm danh và quỹ đội bóng FC Không Giải Tán",
    siteName: "FC Không Giải Tán",
  },
  twitter: {
    card: "summary",
    title: "FC Không Giải Tán - Quản Lý Điểm Danh",
    description: "Hệ thống quản lý điểm danh và quỹ đội bóng FC Không Giải Tán",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${displayFace.variable} ${bodyFace.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              borderRadius: "0.5rem",
              borderLeft: "4px solid var(--pitch)",
            },
          }}
        />
      </body>
    </html>
  );
}
