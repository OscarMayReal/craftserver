"use client"
import { trpc } from "@/lib/trpc";
import { Button } from "@workspace/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { ArrowLeftIcon, DownloadIcon, FileIcon, FolderIcon, FolderPlusIcon, MoreHorizontalIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input";
import { toast } from "@workspace/ui/components/toast";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export default function fileManagerPage() {
    const [path, setPath] = useState("")
    const [uploading, setUploading] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<{ path: string; isDirectory: boolean } | null>(null)
    const fileInput = useRef<HTMLInputElement>(null)
    const files = trpc.files.list.useQuery({ path })
    const trpcUtils = trpc.useUtils()
    const uploadMutation = trpc.files.upload.useMutation()
    const deleteMutation = trpc.files.delete.useMutation()

    async function uploadSelectedFiles(selectedFiles: FileList | null) {
        if (!selectedFiles?.length) return
        setUploading(true)
        try {
            for (const file of Array.from(selectedFiles)) {
                const bytes = new Uint8Array(await file.arrayBuffer())
                let binary = ""
                for (let offset = 0; offset < bytes.length; offset += 0x8000) {
                    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
                }
                const destination = [path, file.name].filter(Boolean).join("/")
                await uploadMutation.mutateAsync({ path: destination, contentBase64: btoa(binary) })
            }
            await files.refetch()
            toast.add({
                title: "File Uploaded",
                description: `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} uploaded`,
            })
        } catch (error) {
            toast.add({
                title: "Upload Failed",
                description: error instanceof Error ? error.message : "Upload failed",
            })
        } finally {
            setUploading(false)
            if (fileInput.current) fileInput.current.value = ""
        }
    }

    async function downloadFile(name: string) {
        const filePath = [path, name].filter(Boolean).join("/")
        try {
            const contentBase64 = await trpcUtils.files.download.fetch({ path: filePath })
            const binary = atob(contentBase64)
            const bytes = new Uint8Array(binary.length)
            for (let index = 0; index < binary.length; index++) {
                bytes[index] = binary.charCodeAt(index)
            }
            const url = URL.createObjectURL(new Blob([bytes]))
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = name
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
        } catch (error) {
            toast.add({
                title: "Download Failed",
                description: error instanceof Error ? error.message : "Could not download file",
            })
        }
    }

    return <div className="p-6">
        <div className="flex flex-row items-center">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-2xl font-medium">File Manager</h1>
        </div>
        <div className="flex flex-row items-center gap-2 mt-4">
            {path !== "" && <Button variant="ghost" size="icon" onClick={() => {
                const parts = path.split("/")
                parts.pop()
                setPath(parts.join("/"))
            }}>
                <ArrowLeftIcon />
            </Button>}
            <p className="text-lg flex-1">{path == "" ? "/" : path}</p>
            <ButtonGroup>
                <CreateFolderDialog path={path} files={files} />
                <Button variant="outline" size="icon" aria-label="Upload files" title="Upload files" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    <UploadIcon />
                </Button>
            </ButtonGroup>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => void uploadSelectedFiles(event.currentTarget.files)} />
        </div>
        <Table className="mt-2">
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[30px]" />
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="w-[30px]" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {files.data?.map((file) => (
                    <TableRow key={file.name} onClick={(ev) => {
                        if (file.isDirectory) {
                            setPath(`${path}/${file.name}`)
                        }
                    }}>
                        <TableCell className="w-[30px]">
                            {file.isDirectory ? <FolderIcon size={16} /> : <FileIcon size={16} />}
                        </TableCell>
                        <TableCell>{file.name}</TableCell>
                        <TableCell>{file.size}</TableCell>
                        <TableCell>{new Date(file.modified).toLocaleString()}</TableCell>
                        <TableCell className="w-[30px]" onClick={(ev) => ev.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button>} />
                                <DropdownMenuContent>
                                    {!file.isDirectory && <DropdownMenuItem onClick={() => void downloadFile(file.name)}><DownloadIcon /> Download</DropdownMenuItem>}
                                    <DropdownMenuItem variant="destructive" onClick={() => {
                                        const filePath = [path, file.name].filter(Boolean).join("/")
                                        setPendingDelete({ path: filePath, isDirectory: file.isDirectory })
                                    }}><Trash2Icon /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
                
            </TableBody>
        </Table>
        <Dialog open={pendingDelete !== null} onOpenChange={(open) => {
            if (!open && !deleteMutation.isPending) setPendingDelete(null)
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {pendingDelete?.isDirectory ? "folder" : "file"}?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-medium text-foreground">{pendingDelete?.path}</span>? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setPendingDelete(null)}>Cancel</Button>
                    <Button variant="destructive" disabled={!pendingDelete || deleteMutation.isPending} onClick={() => {
                        if (!pendingDelete) return
                        deleteMutation.mutate({ path: pendingDelete.path }, {
                            onSuccess: () => {
                                toast.add({
                                    title: pendingDelete.isDirectory ? "Folder deleted" : "File deleted",
                                    description: "Deleted successfully",
                                })
                                setPendingDelete(null)
                                files.refetch()
                            },
                            onError: (error) => {
                                toast.add({ title: "Delete Failed", description: error.message })
                            },
                        })
                    }}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}

function CreateFolderDialog({ path, files }: { path: string, files: ReturnType<typeof trpc.files.list.useQuery> }) {
    const [isOpen, setIsOpen] = useState(false)
    const createFolderMutation = trpc.files.createDirectory.useMutation();
    const [name, setName] = useState("")
    return <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger render={<Button variant="outline" size="icon">
            <FolderPlusIcon />
        </Button>} />
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
                <DialogDescription>
                    Create a new folder in the current directory ({path == "" ? "/" : path}).
                </DialogDescription>
            </DialogHeader>
            <Input placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)} />
            <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => {
                    createFolderMutation.mutate({ path: path + "/" + name }, {
                        onSuccess: () => {
                            files.refetch()
                            toast.add({
                                title: "Folder created",
                                description: "The folder has been created successfully"
                            })
                            setIsOpen(false)
                            setName("")
                        }
                    })
                }}>Create</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}
