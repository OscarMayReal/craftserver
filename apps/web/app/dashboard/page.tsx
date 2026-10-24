"use client"
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@workspace/ui/components/item";
import { ClockIcon, MemoryStickIcon, UserIcon } from "lucide-react";
import { useState } from "react";

type MinecraftVersion = {
    id: string;
    type: string;
    url: string;
    time: string;
    releaseTime: string;
};

function formatUptime(uptimeMs: number | null | undefined) {
    if (uptimeMs == null) return "Offline";

    const totalSeconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        days > 0 ? `${days}d` : null,
        hours > 0 || days > 0 ? `${hours}h` : null,
        minutes > 0 || hours > 0 || days > 0 ? `${minutes}m` : null,
        `${seconds}s`,
    ].filter(Boolean).join(" ");
}

function formatMemory(bytes: number | undefined) {
    if (bytes == null) return "Loading…";
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export default function DashboardPage() {
    const [versions, setVersions] = useState<MinecraftVersion[]>([])
    const config = trpc.config.get.useQuery();
    const status = trpc.status.get.useQuery(undefined, { refetchInterval: 5_000 });
    if (versions.length === 0) {
        fetch("/api/version_manifest.json")
            .then(response => response.json())
            .then(data => {
                setVersions(data.versions)
            })
    }
    return <div className="p-6">
        <h1 className="text-2xl font-medium">Dashboard</h1>
        <div className="mt-6 flex flex-row gap-4">
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <UserIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Online Players</ItemTitle>
                    <ItemDescription>
                        {status.isPending
                            ? "Loading…"
                            : status.data?.currentPlayers == null
                                ? "Offline"
                                : status.data.currentPlayers}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <ClockIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Server Uptime</ItemTitle>
                    <ItemDescription>
                        {formatUptime(status.data?.currentPlayers == null ? null : status.data.uptimeMs)}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <MemoryStickIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Memory Usage</ItemTitle>
                    <ItemDescription>{formatMemory(status.data?.memoryUsage.heapUsedBytes)}</ItemDescription>
                </ItemContent>
            </Item>
        </div>
        {config.data?.minecraftVersion && config.data.minecraftVersion !== versions.filter(v => v.type === "release")[0]?.id && <Alert>
            <AlertTitle>Update Available</AlertTitle>
            <AlertDescription>
                A new version of the server is available. Please update to the latest version.
            </AlertDescription>
        </Alert>}
    </div>
}
