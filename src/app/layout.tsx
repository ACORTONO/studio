
"use client";

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppSidebar } from '@/components/AppSidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { JobOrderProvider } from '@/contexts/JobOrderContext';
import { InvoiceProvider } from '@/contexts/InvoiceContext';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isDarkPage = pathname.startsWith('/job-order') || pathname.startsWith('/dashboard');

    useEffect(() => {
        const html = document.documentElement;
        if (isDarkPage) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }, [pathname, isDarkPage]);

    return (
        <>
            <head>
                <title>Job Order Generator</title>
                <meta name="description" content="Automated Job Order form and dashboard" />
                <link rel="manifest" href="/manifest.json" />
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
                <meta name="theme-color" content="#000000" />
            </head>
            <body className="font-body antialiased">
                <JobOrderProvider>
                <InvoiceProvider>
                    <SidebarProvider>
                    <div className="flex min-h-screen">
                        <Sidebar className='no-print'>
                        <AppSidebar />
                        </Sidebar>
                        <SidebarInset className="flex-1">
                        <main className="p-4 sm:p-6 lg:p-8 printable-area">{children}</main>
                        </SidebarInset>
                    </div>
                    <Toaster />
                    </SidebarProvider>
                </InvoiceProvider>
                </JobOrderProvider>
            </body>
        </>
    )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
        <ConditionalLayout>{children}</ConditionalLayout>
    </html>
  );
}
