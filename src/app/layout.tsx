import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import AuthNav from './AuthNav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'UPSI',
  description:
    'Prototype for UPSI scheduling app using WorkOS AuthKit and Next.js 13',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthNav />
        <AuthKitProvider>
          <div className="px-6">{children}</div>
        </AuthKitProvider>
      </body>
    </html>
  );
}
