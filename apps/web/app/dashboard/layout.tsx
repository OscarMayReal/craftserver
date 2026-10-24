"use client"
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenuButton } from "@workspace/ui/components/sidebar"
import { FolderIcon, HomeIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                    <Link href="/dashboard">
                        <SidebarMenuButton>
                            <HomeIcon /> Home
                        </SidebarMenuButton>
                    </Link>
                    <Link href="/dashboard/files">
                        <SidebarMenuButton>
                            <FolderIcon /> Files
                        </SidebarMenuButton>
                    </Link>
                    <Link href="/dashboard/config">
                        <SidebarMenuButton>
                            <SettingsIcon /> Config
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