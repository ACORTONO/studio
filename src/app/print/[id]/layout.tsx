import '@/app/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Print Job Order',
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
