import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppSidebar } from '@/components/AppSidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { JobOrderProvider } from '@/contexts/JobOrderContext';

export const metadata: Metadata = {
  title: 'Job Order',
  description: 'Automated Job Order form and dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <JobOrderProvider>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar>
                <AppSidebar />
              </Sidebar>
              <SidebarInset className="flex-1">
                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
              </SidebarInset>
            </div>
            <Toaster />
          </SidebarProvider>
        </JobOrderProvider>
      </body>
    </html>
  );
}
