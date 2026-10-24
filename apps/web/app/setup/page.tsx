"use client"
import { Button } from "@workspace/ui/components/button"
import { ArrowRightIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { StepperUi } from "@/components/stepper"
import type { StepState } from "@/components/stepper"
import { SetupProvider, useSetupSettings } from "@/components/setup-context"

import { trpc } from '@/lib/trpc';


import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import { Field, FieldTitle, FieldContent, FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Checkbox } from "@workspace/ui/components/checkbox"

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"
import { UserPlus } from "lucide-react"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@workspace/ui/components/item"
import { useRouter } from "next/navigation"

const steps = [
  { title: "Basic Info", component: SetupPageBasicInfo },
  { title: "Security", component: SetupPageSecurity },
  { title: "Mods", component: SetupPageMods },
  { title: "Review", component: SetupPageReview },
]

type MinecraftVersion = {
      id: string;
      type: string;
      url: string;
      time: string;
      releaseTime: string;
};

function SetupPageBasicInfo({ currentStep, setCurrentStep }: StepState) {
    const [versions, setVersions] = useState<MinecraftVersion[]>([])
    if (versions.length === 0) {
        fetch("/api/version_manifest.json")
            .then(response => response.json())
            .then(data => {
                setVersions(data.versions)
            })
    }
    const {
      showSnapshots, setShowSnapshots,
      serverType, setServerType,
      mojangEula, setMojangEula,
      minecraftVersion, setMinecraftVersion,
      serverName, setServerName,
      serverMOTD, setServerMOTD,
      serverPort, setServerPort,
      worldSeed, setWorldSeed,
      gameMode, setGameMode,
      difficulty, setDifficulty,
    } = useSetupSettings()
  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto gap-4">
      <Frame stacked>
        <FrameHeader>
          <FrameTitle>Server Information</FrameTitle>
          <FrameDescription>Help identify your server</FrameDescription>
        </FrameHeader>
        <FramePanel>
            <Field>
                <FieldTitle>Server Name</FieldTitle>
                <FieldDescription>This will only be visible to you</FieldDescription>
                <FieldContent>
                    <Input placeholder="Server Name" value={serverName} onChange={(e) => setServerName(e.target.value)} />
                </FieldContent>
            </Field>
        </FramePanel>
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
                <FieldTitle>Server Port</FieldTitle>
                <FieldDescription>You can probably leave this as is, unless you are running multiple servers</FieldDescription>
                <FieldContent>
                    <Input type="number" placeholder="Server Port" value={serverPort} onChange={(e) => setServerPort(Number(e.target.value))} />
                </FieldContent>
            </Field>
        </FramePanel>
      </Frame>
      <Frame stacked>
        <FrameHeader>
          <FrameTitle>Server Version</FrameTitle>
          <FrameDescription>Select the Minecraft version for your server</FrameDescription>
        </FrameHeader>
        <FramePanel>
            <Field>
                <FieldTitle>Server Version</FieldTitle>
                <FieldDescription>Select the Minecraft version for your server</FieldDescription>
                <FieldContent>
                    <Select value={minecraftVersion} onValueChange={(value) => value !== null && setMinecraftVersion(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a version" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {versions.filter((version) => showSnapshots || version.type !== 'snapshot').map((version) => (
                                    <SelectItem key={version.id} value={version.id}>
                                        {version.id}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </FieldContent>
            </Field>
        </FramePanel>
        <FramePanel>
            <Field>
                <FieldTitle>Server Type</FieldTitle>
                <FieldDescription>Select the type of server you want to create</FieldDescription>
                <FieldContent>
                    <Select value={serverType} onValueChange={(value) => value !== null && setServerType(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="Vanilla">Vanilla</SelectItem>
                                <SelectItem value="Fabric">Fabric</SelectItem>
                                {/* <SelectItem value="Paper">Paper</SelectItem> */}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </FieldContent>
            </Field>
        </FramePanel>
        <FramePanel>
            <Field>
                <FieldTitle>Mojang EULA</FieldTitle>
                <FieldDescription>Accept the <a href="https://account.mojang.com/documents/minecraft_eula" target="_blank" rel="noopener noreferrer">Mojang EULA</a></FieldDescription>
                <FieldContent className="flex flex-row items-center gap-2">
                    <Checkbox id="mojang-eula" checked={mojangEula} onCheckedChange={setMojangEula} /> <label htmlFor="mojang-eula">I accept the Mojang EULA</label>
                </FieldContent>
            </Field>
        </FramePanel>
        <FrameFooter className="flex flex-row items-center gap-3 py-4">
            <Switch id="show-snapshot-versions" checked={showSnapshots} onCheckedChange={setShowSnapshots} />
            <label htmlFor="show-snapshot-versions">Show Snapshots, pre-releases, and release candidates</label>
        </FrameFooter>
      </Frame>
      <Frame stacked>
        <FrameHeader>
          <FrameTitle>World Configuration</FrameTitle>
          <FrameDescription>Configure your server's world</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Field>
            <FieldTitle>World seed</FieldTitle>
            <FieldDescription>The seed used to generate the world, leave blank for a random seed</FieldDescription>
            <FieldContent>
              <Input placeholder="Enter world seed" value={worldSeed} onChange={(e) => setWorldSeed(e.target.value)} />
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
      </Frame>
      <Frame>
        <FrameHeader className="flex flex-row items-center gap-3">
          <div>
            <FrameTitle>Continue to Security</FrameTitle>
            <FrameDescription>Configure security settings for your server</FrameDescription>
          </div>
          <div className="ml-auto">
            <Button disabled={!mojangEula || !serverName || !serverMOTD || !minecraftVersion || !serverType} onClick={() => setCurrentStep(currentStep + 1)}>Next<ArrowRightIcon /></Button>
          </div>
        </FrameHeader>
      </Frame>
      <div className="h-4" />
    </div>
  )
}

function SetupPageSecurity({ currentStep, setCurrentStep }: StepState) {
  const [newPlayer, setNewPlayer] = useState<string>("")
  const { accessMode, setAccessMode, allowedPlayers, setAllowedPlayers } = useSetupSettings()
  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto gap-4">
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
              <Select value={accessMode} onValueChange={(value) => value !== null && setAccessMode(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select access mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="public">Allow all players</SelectItem>
                    <SelectItem value="private">Allow specific players</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </FramePanel>
      </Frame>
      {accessMode === "private" && (
        <Frame stacked>
          <FrameHeader>
            <FrameTitle>Allowed Players</FrameTitle>
            <FrameDescription>Enter the usernames of players who can join your server</FrameDescription>
          </FrameHeader>
          <FramePanel>
            <Field>
              <FieldLabel>Add Players</FieldLabel>
              <FieldDescription>Enter player username</FieldDescription>
              <FieldContent>
                <Input placeholder="Enter player username" value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setAllowedPlayers([...allowedPlayers, newPlayer])
                    setNewPlayer("")
                  }
                }} />
              </FieldContent>
            </Field>
          </FramePanel>
          <FramePanel>
            {allowedPlayers.length > 0 && (
              <div className="flex flex-col gap-2">
                {allowedPlayers.map((player, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{player}</span>
                    <Button variant="ghost" size="sm" onClick={() => setAllowedPlayers(allowedPlayers.filter((_, i) => i !== index))}>
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {allowedPlayers.length === 0 && (
              <Empty className="gap-1">
                <EmptyMedia variant="icon">
                  <UserPlus />
                </EmptyMedia>
                <EmptyTitle>No players added</EmptyTitle>
                <EmptyDescription>An empty access list will not allow any players to join</EmptyDescription>
              </Empty>
            )}
          </FramePanel>
        </Frame>
      )}
      <Frame>
        <FrameHeader className="flex flex-row items-center gap-3">
          <div>
            <FrameTitle>Continue to Mods</FrameTitle>
            <FrameDescription>Review and configure mods for your server</FrameDescription>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setCurrentStep(currentStep + 1)}>Next<ArrowRightIcon /></Button>
          </div>
        </FrameHeader>
      </Frame>
      <div className="h-4"></div>
    </div>
  )
}

function ExtensionItem({logo, title, description}: {logo: string, title: string, description: string}) {
    const { selectedMods, setSelectedMods } = useSetupSettings()
    const isAdded = selectedMods.includes(title)
  return (
    <FramePanel>
        <Item className="p-0 gap-4">
            <ItemMedia>
                <img className="size-10 border-1 border-border rounded-md" src={logo} alt={title} />
            </ItemMedia>
            <ItemContent>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{description}</ItemDescription>
            </ItemContent>
            <ItemActions>
                <Button variant={isAdded ? "destructive" : "outline"} onClick={() => setSelectedMods(isAdded ? selectedMods.filter((mod) => mod !== title) : [...selectedMods, title])}>{isAdded ? <XIcon /> : <PlusIcon />}{isAdded ? "Remove" : "Add"}</Button>
            </ItemActions>
        </Item>
    </FramePanel>
  )
}

function SetupPageMods({ currentStep, setCurrentStep }: StepState) {
  const { serverType } = useSetupSettings()
  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto gap-4">
      {serverType === "Vanilla" ? (
        <Frame>
          <FrameHeader>
            <FrameTitle>Mods not supported</FrameTitle>
            <FrameDescription>Vanilla Minecraft does not support mods. Choose Fabric in Basic Info to add mods.</FrameDescription>
          </FrameHeader>
        </Frame>
      ) : (
        <Frame stacked>
          <FrameHeader>
            <FrameTitle>Recommended Mods</FrameTitle>
            <FrameDescription>Mods available for your Fabric server</FrameDescription>
          </FrameHeader>
          <ExtensionItem logo="https://cdn.modrinth.com/data/1u6JkXh5/1aae10b5289feeba4b534ee408ce60bc01813165.png" title="WorldEdit" description="Build and edit your world with powerful tools" />
          <ExtensionItem logo="https://cdn.modrinth.com/data/DYtfQEYj/1bd0bd5d7d1aac59722848847452026affbe3bae.png" title="Effortless Building" description="Makes building easier. For survival and creative mode." />
          <ExtensionItem logo="https://cdn.modrinth.com/data/gvQqBUqZ/icon.png" title="Lithium" description="Optimize your server performance" />
          <ExtensionItem logo="https://cdn.modrinth.com/data/9n1I001p/4cb3c8b48fbab0bcd2c04d0baca67ccf31e4ab7f.png" title="ServerPress" description="Multiplayer news mod for servers" />
          <ExtensionItem logo="https://cdn.modrinth.com/data/lfHFW1mp/icon.png" title="JourneyMap" description="Real-time map used for mapping as you explore." />
        </Frame>
      )}
      <Frame>
        <FrameHeader className="flex flex-row items-center gap-3">
          <div>
            <FrameTitle>Continue to Review</FrameTitle>
            <FrameDescription>Review your server configuration before creation</FrameDescription>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setCurrentStep(currentStep + 1)}>Next<ArrowRightIcon /></Button>
          </div>
        </FrameHeader>
      </Frame>
    </div>
  )
}

export function SetupPageReview(_stepState: StepState) {
    const { serverType, minecraftVersion, serverName, serverMOTD, serverPort, gameMode, difficulty, worldSeed, accessMode } = useSetupSettings()
    const saveConfig = trpc.config.set.useMutation();
    const initializeServer = trpc.config.initializeServer.useMutation();
    const router = useRouter();
    
  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto gap-4">
      <Frame stacked>
        <FrameHeader>
          <FrameTitle>Review</FrameTitle>
          <FrameDescription>Review your server configuration</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Server Name:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{serverName}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Server MOTD:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{serverMOTD}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Server Type:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{serverType}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Server Version:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{minecraftVersion}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Gamemode:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{gameMode}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Difficulty:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{difficulty}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>World Seed:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{worldSeed}</FieldDescription>
          </Field>  
        </FramePanel>
        <FramePanel>
          <Field className="flex flex-row gap-2">
            <FieldLabel>Access Mode:</FieldLabel>
            <FieldDescription className="ml-auto text-end">{accessMode}</FieldDescription>
          </Field>  
        </FramePanel>
      </Frame>
      <Frame>
        <FrameHeader className="flex flex-row items-center gap-3">
          <div>
            <FrameTitle>Create Server</FrameTitle>
            <FrameDescription>Once you have confirmed your settings, click the button to create your server.</FrameDescription>
          </div>
          <div className="ml-auto">
            <Button onClick={() => {
                saveConfig.mutate({
                    serverType,
                    minecraftVersion,
                    serverName,
                    serverMOTD,
                    serverPort,
                    worldSeed,
                    gameMode,
                    difficulty,
                    accessMode,
                    allowedPlayers: [],
                    selectedMods: []
                }, {
                    onSuccess: () => initializeServer.mutate(undefined, {
                        onSuccess: () => router.push('/dashboard')
                    }),
                });
            }}><CheckIcon />Create Server</Button>
          </div>
        </FrameHeader>
      </Frame>
    </div>
  )
}

export default function SetupPage() {
    const [introComplete, setIntroComplete] = useState(false)
    if (!introComplete) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                <SetupPageIntro setComplete={setIntroComplete} />
            </div>
        )
    }
    return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-2 px-4  overflow-y-auto">
            <SetupProvider>
              <StepperUi steps={steps} />
            </SetupProvider>
        </div>
    )
}

export function SetupPageIntro({ setComplete }: { setComplete: (complete: boolean) => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-2">
      <motion.div
        className="flex text-2xl font-bold"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        Setup Your Server
      </motion.div>
      <motion.div
        className="flex text-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
      >
        Configure your Minecraft server settings
      </motion.div>
      <motion.div
        className="mt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.7 }}
      >
        <Button onClick={() => setComplete(true)}>Get Started<ArrowRightIcon /></Button>
      </motion.div>
    </div>
  )
}
