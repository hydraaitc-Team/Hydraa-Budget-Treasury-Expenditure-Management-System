import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HYDRAA - Budget, Treasury & Expenditure Management System',
  description: 'Hyderabad Disaster Response and Asset Protection Agency, Government of Telangana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
