export const metadata = {
  title: "Ask the Handbook",
  description: "Ask questions about the Lincoln Handbook",
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
