
import type { Metadata } from "next";
import "./globals.css";
import DynamicNavbar from "./components/Navbar"; 

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
    <html lang="en">
      <body className="bg-[#212121] text-white min-h-screen antialiased">
        <DynamicNavbar />
        {children}
      </body>
    </html>
  );
}
