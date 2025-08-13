import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Print Invoice',
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
