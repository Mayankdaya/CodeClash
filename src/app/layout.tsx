import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { auth } from '@/lib/firebase';
import { FirebaseNotConfigured } from '@/components/FirebaseNotConfigured';

export const metadata: Metadata = {
  title: 'CodeClash – Real-Time Coding Arena',
  description: 'A free, mobile-first web app for real-time competitive coding challenges. Select a topic, match with peers, and code to win.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If Firebase is not configured, show a dedicated instruction page.
  if (!auth) {
    return (
      <html lang="en" className="dark">
        <body className="antialiased">
          <FirebaseNotConfigured />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
