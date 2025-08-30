import './globals.css';

export const metadata = {
  title: 'HelloMolar',
  description: 'HelloMolar application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black">{children}</body>
    </html>
  );
}
