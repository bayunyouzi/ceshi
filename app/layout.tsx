import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from 'next/script';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PROMPT.STUDIO | AI 创意生成引擎",
  description: "专业的二次元、写实及视频 AI 提示词生成与图生图引擎",
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light')}}catch(e){}})()`
          }}
        />
        <Script 
          defer 
          src="https://chakan.zeabur.app/script.js" 
          data-website-id="f10a102b-67d0-4927-b45a-8867bfe6dd0c"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
