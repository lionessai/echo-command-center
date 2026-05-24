import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Echo — Documentation Agent | Lioness AI Systems',
  description: 'Echo: Documentation Agent for Lioness AI Systems',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#050f0f] text-white`}>
        {children}
      </body>
    </html>
  );
}
