"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Copy, Trash2, Key, ExternalLink, CheckCircle } from "lucide-react"
import { format } from "date-fns"

interface PersonalAccessToken {
  id: string
  name: string
  token: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  createdAt: Date
}

export function PATManagement() {
  const { data: session } = useSession()
  const [tokens, setTokens] = useState<PersonalAccessToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<PersonalAccessToken | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: ""
  })

  useEffect(() => {
    if (session) {
      fetchTokens()
    }
  }, [session])

  const fetchTokens = async () => {
    try {
      const response = await fetch("/api/auth/tokens")
      if (response.ok) {
        const data = await response.json()
        setTokens(data.tokens || [])
      }
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
    setLoading(false)
  }

  const handleCreateToken = async () => {
    if (!createForm.name.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/auth/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name,
          expiresAt: null // Never expires
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewToken({ ...data.tokenRecord, token: data.token })
        setCreateForm({ name: "" })
        setShowCreateDialog(false)
        fetchTokens()
      }
    } catch (error) {
      console.error("Error creating token:", error)
    }
    setCreating(false)
  }

  const handleDeleteToken = async (tokenId: string) => {
    setDeleting(tokenId)
    try {
      const response = await fetch(`/api/auth/tokens/${tokenId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTokens()
      }
    } catch (error) {
      console.error("Error deleting token:", error)
    }
    setDeleting(null)
    setShowDeleteDialog(null)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error copying to clipboard:", error)
    }
  }

  const isExpired = (token: PersonalAccessToken) => {
    return token.expiresAt && new Date() > new Date(token.expiresAt)
  }

  const getExpirationStatus = (token: PersonalAccessToken) => {
    if (!token.expiresAt) return { text: "Never", variant: "secondary" as const }
    
    const now = new Date()
    const expiry = new Date(token.expiresAt)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return { text: "Expired", variant: "destructive" as const }
    if (daysUntilExpiry <= 7) return { text: `${daysUntilExpiry} days`, variant: "destructive" as const }
    if (daysUntilExpiry <= 30) return { text: `${daysUntilExpiry} days`, variant: "secondary" as const }
    
    return { text: format(expiry, "MMM dd, yyyy"), variant: "secondary" as const }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Personal access tokens function like ordinary OAuth access tokens. They can be used to authenticate to the API over HTTP.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInstructionsDialog(true)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Claude Code Setup
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Personal Access Token</DialogTitle>
                <DialogDescription>
                  Create a new token for API access. Make sure to copy it - you won&apos;t be able to see it again!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Claude Code Integration"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Personal access tokens do not expire and remain valid until deleted.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateToken} disabled={creating || !createForm.name.trim()}>
                    {creating ? "Creating..." : "Create Token"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No personal access tokens yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first token
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => {
            const expiration = getExpirationStatus(token)
            const expired = isExpired(token)
            
            return (
              <Card key={token.id} className={expired ? "opacity-60" : ""}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">{token.name}</h4>
                        {expired && <Badge variant="destructive">Expired</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(token.createdAt), "MMM dd, yyyy")}
                      </p>
                      {token.lastUsedAt && (
                        <p className="text-sm text-muted-foreground">
                          Last used {format(new Date(token.lastUsedAt), "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={expiration.variant}>
                        Expires {expiration.text}
                      </Badge>
                      <AlertDialog open={showDeleteDialog === token.id} onOpenChange={(open) => setShowDeleteDialog(open ? token.id : null)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteDialog(token.id)}
                          disabled={deleting === token.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Personal Access Token</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{token.name}&quot;? This action cannot be undone and will immediately revoke access for any applications using this token.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteToken(token.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Token
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Token Display Dialog */}
      <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Personal Access Token Created</DialogTitle>
            <DialogDescription>
              Make sure to copy your personal access token now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Token</Label>
              <div className="flex gap-2">
                <Input
                  value={newToken?.token || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newToken?.token || "")}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Important Security Notes:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• This token will only be shown once</li>
                <li>• Store it securely in your password manager</li>
                <li>• Never share it in public repositories or forums</li>
                <li>• If compromised, delete and create a new one immediately</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claude Code Instructions Dialog */}
      <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Claude Code Integration Setup</DialogTitle>
            <DialogDescription>
              Follow these steps to integrate your personal access token with Claude Code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Step 1: Create a Personal Access Token</h4>
              <p className="text-sm text-muted-foreground">
                If you haven&apos;t already, create a new personal access token using the &quot;New Token&quot; button above.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Step 2: Open Claude Code Settings</h4>
              <p className="text-sm text-muted-foreground">
                Open Claude Code and go to Settings (Cmd+, on macOS or Ctrl+, on Windows/Linux)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Step 3: Add MCP Server</h4>
              <p className="text-sm text-muted-foreground">
                Go to &quot;Model Context Protocol&quot; section and click &quot;Add Server&quot;. Choose &quot;HTTP Server&quot; (not local/stdio server).
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Step 4: Configure Server Details</h4>
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div>
                  <strong className="text-sm">Name:</strong>
                  <code className="text-sm ml-2">MAIX Platform</code>
                </div>
                <div>
                  <strong className="text-sm">Server URL:</strong>
                  <code className="text-sm ml-2">https://api.maix.app/mcp</code>
                </div>
                <div>
                  <strong className="text-sm">Authentication Type:</strong>
                  <code className="text-sm ml-2">Bearer Token</code>
                </div>
                <div>
                  <strong className="text-sm">Token:</strong>
                  <code className="text-sm ml-2">[Your API token from Step 1]</code>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Step 5: Save and Test</h4>
              <p className="text-sm text-muted-foreground">
                Click &quot;Save&quot; and restart Claude Code if prompted. Test by asking: &quot;Can you list my MAIX projects?&quot;
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <h5 className="font-semibold text-sm mb-1">Alternative: Manual Configuration</h5>
              <p className="text-xs text-muted-foreground mb-2">
                If you prefer editing config files directly, add this to your mcp-servers.json:
              </p>
              <div className="bg-muted p-2 rounded text-xs">
                <code>
                  {`{
  "servers": {
    "maix": {
      "type": "http",
      "url": "https://api.maix.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      },
      "name": "MAIX Platform"
    }
  }
}`}
                </code>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}