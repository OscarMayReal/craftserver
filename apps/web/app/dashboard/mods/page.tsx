'use client'

import { trpc } from '@/lib/trpc'
import { Button } from '@workspace/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'
import { toast } from '@workspace/ui/components/toast'
import { FileArchiveIcon, RefreshCwIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ModsPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const config = trpc.config.get.useQuery()
  const mods = trpc.mods.list.useQuery()
  const uploadMutation = trpc.mods.upload.useMutation()
  const deleteMutation = trpc.mods.delete.useMutation()

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    let uploaded = 0
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.jar')) throw new Error(`${file.name} is not a .jar file`)
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
        }
        await uploadMutation.mutateAsync({ filename: file.name, contentBase64: btoa(binary) })
        uploaded++
      }
      await mods.refetch()
      toast.add({ title: 'Mods uploaded', description: `${uploaded} mod${uploaded === 1 ? '' : 's'} uploaded to the server.` })
    } catch (error) {
      toast.add({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Could not upload mod.' })
      await mods.refetch()
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  if (config.data && config.data.serverType.toLowerCase() !== 'fabric') {
    return <div className="p-6">
      <div className="flex items-center"><SidebarTrigger className="mr-2" /><h1 className="text-2xl font-medium">Mods</h1></div>
      <p className="mt-4 text-sm text-muted-foreground">Mod management is only available for Fabric servers.</p>
    </div>
  }

  return <div className="p-6">
    <div className="flex items-center">
      <SidebarTrigger className="mr-2" />
      <div className="flex-1">
        <h1 className="text-2xl font-medium">Mods</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage Fabric mod .jar files installed on this server.</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void mods.refetch()} disabled={mods.isFetching}>
        <RefreshCwIcon className={mods.isFetching ? 'animate-spin' : ''} /> Refresh
      </Button>
      <Button className="ml-2" onClick={() => fileInput.current?.click()} disabled={uploading}>
        <UploadIcon /> {uploading ? 'Uploading…' : 'Upload mods'}
      </Button>
      <input ref={fileInput} type="file" accept=".jar,application/java-archive" multiple className="hidden" onChange={(event) => void uploadFiles(event.currentTarget.files)} />
    </div>

    {mods.error ? <p role="alert" className="mt-6 text-sm text-destructive">{mods.error.message}</p> : <Table className="mt-6">
      <TableHeader><TableRow>
        <TableHead className="w-[30px]" />
        <TableHead>Name</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Modified</TableHead>
        <TableHead className="w-[50px]" />
      </TableRow></TableHeader>
      <TableBody>
        {mods.data?.map((mod) => <TableRow key={mod.name}>
          <TableCell><FileArchiveIcon size={16} /></TableCell>
          <TableCell>{mod.name}</TableCell>
          <TableCell>{formatSize(mod.size)}</TableCell>
          <TableCell>{new Date(mod.modified).toLocaleString()}</TableCell>
          <TableCell><Button variant="ghost" size="icon-sm" aria-label={`Delete ${mod.name}`} title="Delete mod" onClick={() => setPendingDelete(mod.name)}><Trash2Icon /></Button></TableCell>
        </TableRow>)}
        {!mods.isPending && mods.data?.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No mods installed. Upload a .jar file to add one.</TableCell></TableRow>}
      </TableBody>
    </Table>}

    <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setPendingDelete(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this mod?</DialogTitle>
          <DialogDescription>Remove <span className="font-medium text-foreground">{pendingDelete}</span> from the server&apos;s mods folder. The server may need a restart for changes to take effect.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="destructive" disabled={!pendingDelete || deleteMutation.isPending} onClick={() => {
            if (!pendingDelete) return
            deleteMutation.mutate({ filename: pendingDelete }, {
              onSuccess: () => {
                toast.add({ title: 'Mod deleted', description: `${pendingDelete} was removed.` })
                setPendingDelete(null)
                void mods.refetch()
              },
              onError: (error) => toast.add({ title: 'Delete failed', description: error.message }),
            })
          }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
