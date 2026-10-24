"use client"

import { createContext, useContext, useState } from "react"

type SetupSettings = {
  serverName: string
  setServerName: (value: string) => void
  serverMOTD: string
  setServerMOTD: (value: string) => void
  serverPort: number
  setServerPort: (value: number) => void
  minecraftVersion: string
  setMinecraftVersion: (value: string) => void
  serverType: string
  setServerType: (value: string) => void
  mojangEula: boolean
  setMojangEula: (value: boolean) => void
  showSnapshots: boolean
  setShowSnapshots: (value: boolean) => void
  worldSeed: string
  setWorldSeed: (value: string) => void
  gameMode: string
  setGameMode: (value: string) => void
  difficulty: string
  setDifficulty: (value: string) => void
  accessMode: "private" | "public"
  setAccessMode: (value: "private" | "public") => void
  allowedPlayers: string[]
  setAllowedPlayers: (value: string[]) => void
  selectedMods: string[]
  setSelectedMods: (value: string[]) => void
}

const SetupContext = createContext<SetupSettings | null>(null)

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const [serverName, setServerName] = useState("")
  const [serverMOTD, setServerMOTD] = useState("")
  const [serverPort, setServerPort] = useState(25565)
  const [minecraftVersion, setMinecraftVersion] = useState("")
  const [serverType, setServerType] = useState("Vanilla")
  const [mojangEula, setMojangEula] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [worldSeed, setWorldSeed] = useState("")
  const [gameMode, setGameMode] = useState("Survival")
  const [difficulty, setDifficulty] = useState("Normal")
  const [accessMode, setAccessMode] = useState<"private" | "public">("private")
  const [allowedPlayers, setAllowedPlayers] = useState<string[]>([])
  const [selectedMods, setSelectedMods] = useState<string[]>([])

  return (
    <SetupContext.Provider
      value={{
        serverName, setServerName,
        serverMOTD, setServerMOTD,
        serverPort, setServerPort,
        minecraftVersion, setMinecraftVersion,
        serverType, setServerType,
        mojangEula, setMojangEula,
        showSnapshots, setShowSnapshots,
        worldSeed, setWorldSeed,
        gameMode, setGameMode,
        difficulty, setDifficulty,
        accessMode, setAccessMode,
        allowedPlayers, setAllowedPlayers,
        selectedMods, setSelectedMods,
      }}
    >
      {children}
    </SetupContext.Provider>
  )
}

export function useSetupSettings() {
  const settings = useContext(SetupContext)
  if (!settings) {
    throw new Error("useSetupSettings must be used within SetupProvider")
  }
  return settings
}
