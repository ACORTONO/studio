import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Print Dashboard Report',
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
        {children}
    </>
  );
}
