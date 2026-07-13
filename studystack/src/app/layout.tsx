import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "StudyStack — Make science addictive",
  description:
    "Read one study a day, take a quiz, build a streak, grow your Knowledge Tower, and become a published science writer. Gamified science learning for students.",
  applicationName: "StudyStack",
  keywords: ["science", "learning", "students", "biology", "medicine", "quizzes", "streaks"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ec4899" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b1a" },
  ],
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-canvas">
        <ThemeProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
