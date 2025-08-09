"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Common timezone options with GMT offsets
const TIMEZONE_OPTIONS = [
  { value: "Pacific/Auckland", label: "Auckland (GMT+13)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time - Sydney (GMT+11)" },
  { value: "Asia/Dhaka", label: "Bangladesh - Dhaka (GMT+6)" },
  { value: "Europe/Berlin", label: "Central European Time - Berlin (GMT+1)" },
  { value: "America/Chicago", label: "Central Time - Chicago (GMT-6)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "America/Denver", label: "Denver (GMT-7)" },
  { value: "America/New_York", label: "Eastern Time - New York (GMT-5)" },
  { value: "America/Toronto", label: "Eastern Time - Toronto (GMT-5)" },
  { value: "Europe/London", label: "Greenwich Mean Time - London (GMT+0)" },
  { value: "Asia/Kolkata", label: "India Standard Time - Mumbai (GMT+5:30)" },
  { value: "Asia/Jakarta", label: "Indonesia - Jakarta (GMT+7)" },
  { value: "Asia/Tokyo", label: "Japan - Tokyo (GMT+9)" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia - Kuala Lumpur (GMT+8)" },
  { value: "America/Los_Angeles", label: "Pacific Time - Los Angeles (GMT-8)" },
  { value: "Asia/Karachi", label: "Pakistan - Karachi (GMT+5)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia - Riyadh (GMT+3)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Europe/Istanbul", label: "Turkey - Istanbul (GMT+3)" },
]

// Availability options
const AVAILABILITY_OPTIONS = [
  "<1 hour/wk",
  "1 hr/wk", 
  "2 hrs/wk",
  "5 hrs/wk",
  "10 hrs/wk",
  "20 hrs/wk",
  "40 hrs/wk",
  "Other"
]

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    bio: "",
    specialty: "",
    experienceLevel: "",
    skills: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    availability: "",
    timezone: ""
  })
  const [customAvailability, setCustomAvailability] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.email) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        const availability = data.availability || ""
        const isCustomAvailability = availability && !AVAILABILITY_OPTIONS.includes(availability)
        
        setProfile({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          specialty: data.specialty || "",
          experienceLevel: data.experienceLevel || "",
          skills: data.skills?.join(", ") || "",
          linkedinUrl: data.linkedinUrl || "",
          githubUrl: data.githubUrl || "",
          portfolioUrl: data.portfolioUrl || "",
          availability: isCustomAvailability ? "Other" : availability,
          timezone: data.timezone || ""
        })
        
        if (isCustomAvailability) {
          setCustomAvailability(availability)
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const skillsArray = profile.skills.split(",").map(s => s.trim()).filter(s => s)
      const finalAvailability = profile.availability === "Other" ? customAvailability : profile.availability
      
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          availability: finalAvailability,
          skills: skillsArray
        }),
      })

      if (response.ok) {
        router.push("/dashboard")
      } else {
        console.error("Error saving profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
    }
    setSaving(false)
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Help us match you with the right projects by completing your volunteer profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                  placeholder="Your unique username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself and your background..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={profile.specialty} onValueChange={(value) => setProfile({...profile, specialty: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI">AI & Machine Learning</SelectItem>
                      <SelectItem value="FULL_STACK">Full Stack Development</SelectItem>
                      <SelectItem value="PROGRAM_MANAGER">Program Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select value={profile.experienceLevel} onValueChange={(value) => setProfile({...profile, experienceLevel: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOBBYIST">Hobbyist</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                      <SelectItem value="NEW_GRAD">New Graduate</SelectItem>
                      <SelectItem value="SENIOR">Senior (3+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Input
                  id="skills"
                  value={profile.skills}
                  onChange={(e) => setProfile({...profile, skills: e.target.value})}
                  placeholder="React, Python, Machine Learning, etc. (comma-separated)"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={profile.availability} onValueChange={(value) => setProfile({...profile, availability: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your availability" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {profile.availability === "Other" && (
                    <Input
                      value={customAvailability}
                      onChange={(e) => setCustomAvailability(e.target.value)}
                      placeholder="e.g., weekends only, evenings after 6pm"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile({...profile, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Links (Optional)</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    value={profile.linkedinUrl}
                    onChange={(e) => setProfile({...profile, linkedinUrl: e.target.value})}
                    placeholder="https://linkedin.com/in/yourprofile"
                    type="url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    value={profile.githubUrl}
                    onChange={(e) => setProfile({...profile, githubUrl: e.target.value})}
                    placeholder="https://github.com/yourusername"
                    type="url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input
                    id="portfolioUrl"
                    value={profile.portfolioUrl}
                    onChange={(e) => setProfile({...profile, portfolioUrl: e.target.value})}
                    placeholder="https://yourportfolio.com"
                    type="url"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}