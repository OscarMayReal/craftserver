"use client"
import { trpc } from "@/lib/trpc"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Page() {
  const isServerConfigured = trpc.config.isServerConfigured.useQuery()
  const router = useRouter()
  useEffect(() => {
    if (isServerConfigured.data) {
      router.push("/dashboard")
    } else {
      router.push("/setup")
    }
  }, [isServerConfigured.data, router])
  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">
      Loading...
    </div>
  )
}
