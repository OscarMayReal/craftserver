"use client"
import { Button } from "@workspace/ui/components/button"
import { ArrowRightIcon } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { StepperUi } from "@/components/stepper"
import type { StepState } from "@/components/stepper"


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

const steps = [
  { title: "Basic Info", component: <SetupPageBasicInfo /> },
  { title: "Security", component: <SetupPageSecurity /> },
  { title: "Plugins", component: <SetupPagePlugins /> },
  { title: "Review", component: <SetupPageReview /> },
]

type MinecraftVersion = {
      id: string;
      type: string;
      url: string;
      time: string;
      releaseTime: string;
};

export function SetupPageBasicInfo({ currentStep, setCurrentStep }: StepState) {
    const [versions, setVersions] = useState<MinecraftVersion[]>([])
    if (versions.length === 0) {
        fetch("/api/version_manifest.json")
            .then(response => response.json())
            .then(data => {
                setVersions(data.versions)
            })
    }
    const [showSnapshots, setShowSnapshots] = useState(false)
    const [mojangEula, setMojangEula] = useState(false)
    const [serverType, setServerType] = useState("Vanilla")
    const [minecraftVersion, setMinecraftVersion] = useState("")
    const [serverName, setServerName] = useState("")
    const [serverMOTD, setServerMOTD] = useState("")
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
                    <Input placeholder="Server Port" value="25565" />
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
                    <Select value={minecraftVersion} onValueChange={setMinecraftVersion}>
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
                    <Select value={serverType} onValueChange={setServerType}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="Vanilla">Vanilla</SelectItem>
                                <SelectItem value="Fabric">Fabric</SelectItem>
                                <SelectItem value="Paper">Paper</SelectItem>
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

export function SetupPageSecurity({ currentStep, setCurrentStep }: StepState) {
  const [accessMode, setAccessMode] = useState<string>("private")
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
              <Select value={accessMode} onValueChange={setAccessMode}>
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
                <Input placeholder="Enter player username" />
              </FieldContent>
            </Field>
          </FramePanel>
          <FramePanel>
            <Empty className="gap-1">
                <EmptyMedia variant="icon">
                  <UserPlus />
                </EmptyMedia>
                <EmptyTitle>No players added</EmptyTitle>
                <EmptyDescription>An empty access list will not allow any players to join</EmptyDescription>
            </Empty>
          </FramePanel>
        </Frame>
      )}
      <Frame>
        <FrameHeader className="flex flex-row items-center gap-3">
          <div>
            <FrameTitle>Continue to Plugins</FrameTitle>
            <FrameDescription>Review and configure plugins for your server</FrameDescription>
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

export function SetupPagePlugins() {
  return (
    <div>
      <h1>Plugins</h1>
    </div>
  )
}

export function SetupPageReview() {
  return (
    <div>
      <h1>Review</h1>
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
            <StepperUi steps={steps} />
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
