import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agency Dashboard',
  description: 'Agency AI Operating System - Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
