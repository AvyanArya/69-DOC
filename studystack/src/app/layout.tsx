import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "StudyStack — Make science addictive",
  description:
    "Read one study a day, take a quiz, build a streak, grow your Knowledge Tower, and become a published science writer. Gamified science learning for students.",
  applicationName: "StudyStack",
  keywords: ["science", "learning", "students", "biology", "medicine", "quizzes", "streaks"],
};

export const viewport: Viewport = {
  themeColor: "#ec4899",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-canvas">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
