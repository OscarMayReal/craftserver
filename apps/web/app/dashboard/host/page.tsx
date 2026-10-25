"use client"
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@workspace/ui/components/item";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { ClockIcon, CpuIcon, HammerIcon, MemoryStickIcon, PlayIcon, RefreshCwIcon, ServerIcon, StopCircleIcon, ThermometerIcon, UserIcon, XIcon } from "lucide-react";
import { useState } from "react";

type MinecraftVersion = {
    id: string;
    type: string;
    url: string;
    time: string;
    releaseTime: string;
};

function formatUptime(uptimeSeconds: number | null | undefined) {
    if (uptimeSeconds == null) return "Offline";

    const totalSeconds = Math.floor(uptimeSeconds);
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

function formatCpuTemperature(temperature: number | null | undefined) {
    if (temperature == null || !Number.isFinite(temperature)) return "Unavailable";
    return `${temperature.toFixed(1)} °C`;
}

export default function DashboardPage() {
    const status = trpc.status.host.get.useQuery(undefined, { refetchInterval: 5_000 });
    const thermals = trpc.status.host.thermals.useQuery(undefined, { refetchInterval: 5_000 });
    const refreshStatus = () => {
        void status.refetch();
    };
    // const restartServer = trpc.config.restartServer.useMutation({ onSuccess: refreshStatus });
    // const stopServer = trpc.config.stopServer.useMutation({ onSuccess: refreshStatus });
    // const startServer = trpc.config.startServer.useMutation({ onSuccess: refreshStatus });
    // const serverActionPending = restartServer.isPending || stopServer.isPending || startServer.isPending;
    return <div className="p-6">
        <div className="flex flex-row items-center">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-2xl font-medium">Host Information</h1>
            <div className="flex flex-1" />
            <ButtonGroup>
                <Tooltip>
                    <TooltipTrigger render={<Button onClick={() => {
                        // restartServer.mutate();
                    }} disabled={!status.data?.serverRunning || false} variant="outline" size="icon"><RefreshCwIcon /></Button>} />
                    <TooltipContent>
                        Restart Host
                    </TooltipContent>
                </Tooltip>
            </ButtonGroup>
        </div>
        <div className="mt-6 flex flex-col gap-4 md:flex-row">
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <ServerIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Host Platform</ItemTitle>
                    <ItemDescription>
                        {status.data?.platform}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <UserIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Hostname</ItemTitle>
                    <ItemDescription>
                        {status.data?.hostname}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <ClockIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Host Uptime</ItemTitle>
                    <ItemDescription>
                        {formatUptime(status.data?.uptime)}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <MemoryStickIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Total Memory</ItemTitle>
                    <ItemDescription>{formatMemory(status.data?.totalMemory)}</ItemDescription>
                </ItemContent>
            </Item>
        </div>
        <h2 className="text-xl font-medium mt-6">Thermals</h2>
        <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <CpuIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>CPU Temperature</ItemTitle>
                    <ItemDescription>
                        {thermals.isPending
                            ? "Loading…"
                            : formatCpuTemperature(thermals.data?.cpu.main)}
                    </ItemDescription>
                </ItemContent>
            </Item>
            <Item variant="outline">
                <ItemMedia variant="icon">
                    <ThermometerIcon />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Max Temperature</ItemTitle>
                    <ItemDescription>
                        {thermals.isPending
                            ? "Loading…"
                            : formatCpuTemperature(thermals.data?.cpu.max)}
                    </ItemDescription>
                </ItemContent>
            </Item>
        </div>
    </div>
}
