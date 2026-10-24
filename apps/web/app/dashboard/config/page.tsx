"use client"
import { SetupProvider } from "@/components/setup-context";
import { Field, FieldTitle, FieldDescription, FieldContent } from "@workspace/ui/components/field";
import { FrameHeader, FrameTitle, FrameDescription, FramePanel, Frame, FrameFooter } from "@workspace/ui/components/reui/frame";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@workspace/ui/components/select";
import { useSetupSettings } from "@/components/setup-context";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { SaveIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { toast } from "@workspace/ui/components/toast";

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
    useEffect(() => {
      if (config.data) {
        setServerMOTD(config.data.serverMOTD)
        setGameMode(config.data.gameMode)
        setDifficulty(config.data.difficulty)
      }
    }, [config.data])
    const updateConfig = trpc.config.updateConfig.useMutation()
    return (
        <div className="w-full max-w-2xl mx-auto">
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
                <FrameFooter>
                    <Button onClick={() => {
                        updateConfig.mutate({
                            serverMOTD,
                            gameMode,
                            difficulty,
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
        </div>
    )
}