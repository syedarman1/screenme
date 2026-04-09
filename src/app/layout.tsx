
import type { Metadata } from "next";
import "./globals.css";
import DynamicNavbar from "./components/Navbar";
import ThemeProvider from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "ScreenMe - AI-Powered Career Platform",
  description: "AI-powered resume optimization, cover letter generation, job matching, and interview preparation platform. Get your dream job with ScreenMe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('screenme-theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <DynamicNavbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
