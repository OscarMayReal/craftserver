"use client"
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@workspace/ui/components/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { ClockIcon, MemoryStickIcon, PlayIcon, RefreshCwIcon, ServerIcon, StopCircleIcon, UserIcon } from "lucide-react";
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
    const players = trpc.status.online.useQuery(undefined, { refetchInterval: 5_000 });
    const refreshStatus = () => {
        void status.refetch();
        void players.refetch();
    };
    const restartServer = trpc.config.restartServer.useMutation({ onSuccess: refreshStatus });
    const stopServer = trpc.config.stopServer.useMutation({ onSuccess: refreshStatus });
    const startServer = trpc.config.startServer.useMutation({ onSuccess: refreshStatus });
    const serverActionPending = restartServer.isPending || stopServer.isPending || startServer.isPending;
    if (versions.length === 0) {
        fetch("/api/version_manifest.json")
            .then(response => response.json())
            .then(data => {
                setVersions(data.versions)
            })
    }
    return <div className="p-6">
        <div className="flex flex-row items-center">
            <h1 className="text-2xl font-medium">Dashboard</h1>
            <div className="flex flex-1" />
            <ButtonGroup>
                <Tooltip>
                    <TooltipTrigger render={<Button onClick={() => {
                        restartServer.mutate();
                    }} disabled={!status.data?.serverRunning || serverActionPending} variant="outline" size="icon"><RefreshCwIcon /></Button>} />
                    <TooltipContent>
                        Restart Server
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger render={<Button onClick={() => {
                        stopServer.mutate();
                    }} disabled={!status.data?.serverRunning || serverActionPending} variant="outline" size="icon"><StopCircleIcon /></Button>} />
                    <TooltipContent>
                        Stop Server
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger render={<Button onClick={() => {
                        startServer.mutate();
                    }} disabled={status.data?.serverRunning || serverActionPending} variant="outline" size="icon"><PlayIcon /></Button>} />
                    <TooltipContent>
                        Start Server
                    </TooltipContent>
                </Tooltip>
            </ButtonGroup>
        </div>
        <div className="mt-6 flex flex-row gap-4">
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <ServerIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Server Status</ItemTitle>
                    <ItemDescription>
                        {status.isPending
                            ? "Loading…"
                            : status.data?.serverRunning
                                ? "Running"
                                : "Stopped"}
                    </ItemDescription>
                </ItemContent>
            </Item>
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
        {config.data?.minecraftVersion && config.data.minecraftVersion !== versions.filter(v => v.type === "release")[0]?.id && <Alert className="mt-6">
            <AlertTitle>Update Available</AlertTitle>
            <AlertDescription>
                A new version of the server is available. Please update to the latest version.
            </AlertDescription>
        </Alert>}
        <div className="mt-6">
            <h1 className="text-xl font-medium">Online Players</h1>
            {(players.data?.length && players.data.length > 0) ? <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30px]" />
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[30px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {players.data?.map(player => (
                        <TableRow key={player}> 
                            <TableCell className="w-[30px]">
                                <UserIcon size={16} />
                            </TableCell>
                            <TableCell>{player}</TableCell>
                            <TableCell className="w-[30px]">
                                
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table> : <div>No players online right now</div>}
        </div>
    </div>
}
