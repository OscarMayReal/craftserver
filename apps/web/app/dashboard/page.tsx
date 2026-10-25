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
import { ClockIcon, HammerIcon, MemoryStickIcon, PlayIcon, RefreshCwIcon, SendIcon, ServerIcon, ShieldCheckIcon, StopCircleIcon, UserIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    const logs = trpc.status.logs.useQuery(undefined, { refetchInterval: 2_000 });
    const [command, setCommand] = useState("");
    const logContainer = useRef<HTMLDivElement>(null);
    const runCommand = trpc.config.runCommand.useMutation({ onSuccess: () => void logs.refetch() });
    useEffect(() => {
        if (logContainer.current) logContainer.current.scrollTop = logContainer.current.scrollHeight;
    }, [logs.data]);
    const refreshStatus = () => {
        void status.refetch();
        void players.refetch();
    };
    const restartServer = trpc.config.restartServer.useMutation({ onSuccess: refreshStatus });
    const stopServer = trpc.config.stopServer.useMutation({ onSuccess: refreshStatus });
    const startServer = trpc.config.startServer.useMutation({ onSuccess: refreshStatus });
    const updateServer = trpc.config.updateServer.useMutation({
        onSuccess: async () => {
            await Promise.all([config.refetch(), status.refetch(), players.refetch(), logs.refetch()]);
        },
        onError: refreshStatus,
    });
    const serverActionPending = restartServer.isPending || stopServer.isPending || startServer.isPending || updateServer.isPending;
    const latestRelease = versions.find(version => version.type === "release")?.id;
    useEffect(() => {
        fetch("/api/version_manifest.json")
            .then(response => {
                if (!response.ok) throw new Error("Could not load Minecraft versions")
                return response.json()
            })
            .then(data => {
                setVersions(data.versions)
            })
            .catch((error: unknown) => console.error(error))
    }, [])
    return <div className="p-6">
        <div className="flex flex-row items-center">
            <SidebarTrigger className="mr-2" />
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
        <div className="mt-6 flex flex-col gap-4 md:flex-row">
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
        {config.data?.minecraftVersion && latestRelease && config.data.minecraftVersion !== latestRelease && <Alert className="mt-6">
            <AlertTitle>Update Available</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>A new version of the server is available. Updating will stop the server, install Minecraft {latestRelease}, and start it again.</span>
                <Button onClick={() => updateServer.mutate()} disabled={serverActionPending}>
                    <RefreshCwIcon className={updateServer.isPending ? "animate-spin" : ""} />
                    {updateServer.isPending ? "Updating server…" : "Update and restart"}
                </Button>
            </AlertDescription>
        </Alert>}
        {updateServer.error && <Alert variant="destructive" className="mt-6">
            <AlertTitle>Server update failed</AlertTitle>
            <AlertDescription>{updateServer.error.message}</AlertDescription>
        </Alert>}
        <div className="mt-6">
            <h1 className="text-xl font-medium">Online Players</h1>
            {(players.data?.length && players.data.length > 0) ? <div className="mt-4 overflow-hidden rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30px]" />
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[190px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {players.data?.map(player => (
                        <TableRow key={player}> 
                            <TableCell className="w-[30px]">
                                <UserIcon size={16} />
                            </TableCell>
                            <TableCell>{player}</TableCell>
                            <TableCell className="w-[190px]">
                                <div className="flex items-center gap-2">
                                    <UserOpButton username={player} />
                                    <UserKickButton username={player} playerList={players} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div> : <div className="flex flex-col items-center justify-center h-32 rounded-md border mt-4">
                <p className="text-muted-foreground">No players online right now</p>
            </div>}
        </div>
        <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-medium">Server Console</h2>
                <Button variant="outline" size="sm" onClick={() => void logs.refetch()} disabled={logs.isFetching}>
                    <RefreshCwIcon className={logs.isFetching ? "animate-spin" : ""} /> Refresh
                </Button>
            </div>
            <div ref={logContainer} aria-live="polite" className="h-80 overflow-auto rounded-md border bg-neutral-950 p-4 font-mono text-xs text-neutral-100">
                {logs.isPending ? <p className="text-neutral-400">Loading server log…</p> : logs.data?.length
                    ? logs.data.map((line, index) => <div key={`${index}-${line}`} className="whitespace-pre-wrap break-all">{line}</div>)
                    : <p className="text-neutral-400">No server log available. Start the server to see console output.</p>}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                const value = command.trim();
                if (!value) return;
                runCommand.mutate({ command: value }, { onSuccess: () => setCommand("") });
            }}>
                <Input aria-label="Server command" placeholder="Enter a server command, e.g. say Hello" value={command} onChange={(event) => setCommand(event.target.value)} disabled={!status.data?.serverRunning || runCommand.isPending} />
                <Button type="submit" disabled={!status.data?.serverRunning || !command.trim() || runCommand.isPending}>
                    <SendIcon /> Send
                </Button>
            </form>
            {runCommand.error && <p role="alert" className="mt-2 text-sm text-destructive">{runCommand.error.message}</p>}
        </section>
    </div>
}

function UserOpButton({ username }: { username: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const opMutation = trpc.config.opPlayer.useMutation()
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline">
                <ShieldCheckIcon /> Make OP
            </Button>} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Grant operator access</DialogTitle>
                    <DialogDescription>
                        Make {username} a server operator? Operators have full control over the server.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}><XIcon />Cancel</Button>
                    <Button onClick={async () => {
                        await opMutation.mutateAsync({ username })
                        setIsOpen(false)
                    }} disabled={opMutation.isPending}>
                        <ShieldCheckIcon /> Grant OP
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UserKickButton({username, playerList}: {username: string, playerList: ReturnType<typeof trpc.status.online.useQuery>}) {
    const [isOpen, setIsOpen] = useState(false)
    const [reason, setReason] = useState("")
    const kickMutation = trpc.config.kickPlayer.useMutation()
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button size="sm">
                <HammerIcon /> Kick
            </Button>} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kick User</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to Kick {username}?
                    </DialogDescription>
                </DialogHeader>
                <Input placeholder="Kick reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                <DialogFooter>
                    <Button variant="outline" onClick={() => {
                        setIsOpen(false)
                    }}> <XIcon />Cancel</Button>
                    <Button onClick={async () => {
                        await kickMutation.mutateAsync({username, reason})
                        setIsOpen(false)
                        setReason("")
                        await new Promise(resolve => setTimeout(resolve, 500))
                        playerList.refetch()
                    }}> <HammerIcon />Kick User</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
