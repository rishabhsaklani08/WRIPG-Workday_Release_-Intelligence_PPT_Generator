import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WRIPG — Workday Release Intelligence PPT Generator',
  description: 'Generate beautiful, AI-enriched Workday release presentations in seconds. Select features, choose your audience, and download a branded PowerPoint deck.',
  keywords: ['Workday', 'Release Notes', 'PowerPoint', 'AI', 'Accenture', 'HCM', 'Finance'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
