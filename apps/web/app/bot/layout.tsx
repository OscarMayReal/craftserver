"use client"
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenuButton } from "@workspace/ui/components/sidebar"
import { HomeIcon } from "lucide-react";
import Link from "next/link";

export default function BotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>
    <Sidebar collapsible="icon">
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Server</SidebarGroupLabel>
                <SidebarGroupContent>
                    <Link href="/bot">
                        <SidebarMenuButton>
                            <HomeIcon /> Overview
                        </SidebarMenuButton>
                    </Link>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
    <SidebarInset>
        {children}
    </SidebarInset>
  </SidebarProvider>
}