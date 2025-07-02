import type {Metadata} from 'next';
import './globals.css';
import FirebaseConfigGuard from '@/components/FirebaseConfigGuard';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from "@/components/ui/toaster";


export const metadata: Metadata = {
  title: 'CodeClash – Real-Time Coding Arena',
  description: 'A free, mobile-first web app for real-time competitive coding challenges. Select a topic, match with peers, and code to win.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseConfigGuard>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseConfigGuard>
      </body>
    </html>
  );
}
