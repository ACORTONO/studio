
import '@/app/globals.css';
import type { Metadata } from 'next';

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
