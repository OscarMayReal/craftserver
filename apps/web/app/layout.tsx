import localFont from "next/font/local"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/components/trpc-provider"
import { cn } from "@workspace/ui/lib/utils";
import { Toaster } from "@workspace/ui/components/toast"
import { TooltipProvider } from "@workspace/ui/components/tooltip";

const figtree = localFont({
  src: "./fonts/figtree-latin.woff2",
  display: "swap",
  variable: "--font-figtree",
  weight: "300 900",
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", figtree.variable)}
    >
      <body className="w-[100dvw] h-[100dvh] fixed top-0 left-0 flex">
        <ThemeProvider>
          <TRPCProvider>
            <TooltipProvider>
              <Toaster />
              {children}
            </TooltipProvider>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
