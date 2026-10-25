"use client"
import { SetupProvider } from "@/components/setup-context";
import { Field, FieldTitle, FieldDescription, FieldContent, FieldLabel } from "@workspace/ui/components/field";
import { FrameHeader, FrameTitle, FrameDescription, FramePanel, Frame, FrameFooter } from "@workspace/ui/components/reui/frame";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@workspace/ui/components/select";
import { useSetupSettings } from "@/components/setup-context";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { SaveIcon, XIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "@workspace/ui/components/toast";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@workspace/ui/components/empty";
import { UserPlus } from "lucide-react";

export default function ConfigPage() {
    return (
        <SetupProvider>
            <div className="p-6 flex flex-col gap-4">
                <h1 className="text-2xl font-medium">Config</h1>
                <ConfigPageContent />
            </div>
        </SetupProvider>
    )
}
function ConfigPageContent() {
    const {
      serverMOTD, setServerMOTD,
      gameMode, setGameMode,
      difficulty, setDifficulty,
    } = useSetupSettings()
    const restartServer = trpc.config.restartServer.useMutation()
    const config = trpc.config.get.useQuery()
    const [offlineMode, setOfflineMode] = useState(false)
    const [accessMode, setAccessMode] = useState<"public" | "private">("public")
    const [allowedPlayers, setAllowedPlayers] = useState<string[]>([])
    const [newPlayer, setNewPlayer] = useState("")
    useEffect(() => {
      if (config.data) {
        setServerMOTD(config.data.serverMOTD)
        setGameMode(config.data.gameMode)
        setDifficulty(config.data.difficulty)
        setOfflineMode(config.data.offlineMode)
        setAccessMode(config.data.accessMode)
        setAllowedPlayers(config.data.allowedPlayers ?? [])
      }
    }, [config.data])
    const updateConfig = trpc.config.updateConfig.useMutation()
    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <Frame stacked>
                <FrameHeader>
                    <FrameTitle>Server Configuration</FrameTitle>
                    <FrameDescription>Configure your server's settings</FrameDescription>
                </FrameHeader>
                <FramePanel>
                    <Field>
                        <FieldTitle>Server MOTD</FieldTitle>
                        <FieldDescription>This will be shown to players in the server list</FieldDescription>
                        <FieldContent>
                            <Input placeholder="Server MOTD" value={serverMOTD} onChange={(e) => setServerMOTD(e.target.value)} />
                        </FieldContent>
                    </Field>
                </FramePanel>
                <FramePanel>
                    <Field>
                        <FieldTitle>Game Mode</FieldTitle>
                        <FieldDescription>Select the game mode for your server</FieldDescription>
                        <FieldContent>
                            <Select value={gameMode} onValueChange={(value) => value !== null && setGameMode(value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a game mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="Survival">Survival</SelectItem>
                                        <SelectItem value="Creative">Creative</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FieldContent>
                    </Field>
                </FramePanel>
                <FramePanel>
                    <Field>
                        <FieldTitle>Difficulty</FieldTitle>
                        <FieldDescription>Select the difficulty for your server</FieldDescription>
                        <FieldContent>
                            <Select value={difficulty} onValueChange={(value) => value !== null && setDifficulty(value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="Peaceful">Peaceful</SelectItem>
                                        <SelectItem value="Easy">Easy</SelectItem>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="Hard">Hard</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FieldContent>
                    </Field>
                </FramePanel>
                <FramePanel>
                    <Field>
                        <FieldTitle>Offline mode</FieldTitle>
                        <FieldDescription>Allows players to join without Mojang or Microsoft authentication, so player identities can be impersonated. Use this only with people you trust and when you need it for the built-in bot. Do not use cracked clients to bypass the Minecraft EULA.</FieldDescription>
                        <FieldContent className="flex flex-row items-center gap-2">
                            <Switch id="offline-mode" checked={offlineMode} onCheckedChange={setOfflineMode} />
                            <label htmlFor="offline-mode">Enable offline mode</label>
                        </FieldContent>
                    </Field>
                </FramePanel>
                <FrameFooter>
                    <Button onClick={() => {
                        updateConfig.mutate({
                            serverMOTD,
                            gameMode,
                            difficulty,
                            offlineMode,
                            accessMode,
                            allowedPlayers,
                        }, {
                            onSuccess: () => {
                                toast.add({
                                    title: "Config updated",
                                    description: "Server configuration has been updated, restarting server...",
                                })
                                restartServer.mutate()
                            }
                        })
                    }}><SaveIcon />Save and restart server</Button>
                </FrameFooter>

            </Frame>
                <Frame stacked>
                    <FrameHeader>
                        <FrameTitle>Access Mode</FrameTitle>
                        <FrameDescription>Who should be able to access your server?</FrameDescription>
                    </FrameHeader>
                    <FramePanel>
                        <Field>
                            <FieldLabel>Access Mode</FieldLabel>
                            <FieldDescription>Choose how players can join your server</FieldDescription>
                            <FieldContent>
                                <Select value={accessMode} onValueChange={(value) => value !== null && setAccessMode(value as "public" | "private")}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select access mode" /></SelectTrigger>
                                    <SelectContent><SelectGroup>
                                        <SelectItem value="public">Allow all players</SelectItem>
                                        <SelectItem value="private">Allow specific players</SelectItem>
                                    </SelectGroup></SelectContent>
                                </Select>
                            </FieldContent>
                        </Field>
                    </FramePanel>
                </Frame>
                {accessMode === "private" && <Frame stacked>
                    <FrameHeader>
                        <FrameTitle>Allowed Players</FrameTitle>
                        <FrameDescription>Enter the usernames of players who can join your server</FrameDescription>
                    </FrameHeader>
                    <FramePanel>
                        <Field>
                            <FieldLabel>Add Players</FieldLabel>
                            <FieldDescription>Enter player username</FieldDescription>
                            <FieldContent>
                                <Input placeholder="Enter player username" value={newPlayer} onChange={(event) => setNewPlayer(event.target.value)} onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault()
                                        const name = newPlayer.trim()
                                        if (/^[A-Za-z0-9_]{1,16}$/.test(name) && !allowedPlayers.some((player) => player.toLowerCase() === name.toLowerCase())) {
                                            setAllowedPlayers([...allowedPlayers, name]); setNewPlayer("")
                                        }
                                    }
                                }} />
                                <Button type="button" disabled={!/^[A-Za-z0-9_]{1,16}$/.test(newPlayer.trim())} onClick={() => {
                                    const name = newPlayer.trim()
                                    if (!allowedPlayers.some((player) => player.toLowerCase() === name.toLowerCase())) setAllowedPlayers([...allowedPlayers, name])
                                    setNewPlayer("")
                                }}>Add player</Button>
                            </FieldContent>
                        </Field>
                    </FramePanel>
                    <FramePanel>
                        {allowedPlayers.length > 0 ? <div className="flex flex-col gap-2">
                            {allowedPlayers.map((player) => <div key={player.toLowerCase()} className="flex items-center justify-between">
                                <span>{player}</span>
                                <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${player}`} onClick={() => setAllowedPlayers(allowedPlayers.filter((name) => name !== player))}><XIcon /></Button>
                            </div>)}
                        </div> : <Empty className="gap-1">
                            <EmptyMedia variant="icon"><UserPlus /></EmptyMedia>
                            <EmptyTitle>No players added</EmptyTitle>
                            <EmptyDescription>An empty access list will not allow any players to join</EmptyDescription>
                        </Empty>}
                    </FramePanel>
                </Frame>}
        </div>
    )
}
