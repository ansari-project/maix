"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postCreateSchema } from "@/lib/validations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Clock, 
  FileText,
  Send
} from "lucide-react"

// Use the shared validation schema for consistency
type CreatePostForm = z.infer<typeof postCreateSchema>

interface Project {
  id: string
  name: string
  status?: string
  ownerId?: string
}

interface Product {
  id: string
  name: string
}

interface CreatePostFormProps {
  projects?: Project[]
  products?: Product[]
  defaultType?: 'QUESTION' | 'PROJECT_UPDATE' | 'PRODUCT_UPDATE'
  defaultProjectId?: string
  defaultProductId?: string
  currentUserId?: string
  onSuccess?: (post: any) => void
  onCancel?: () => void
}

export function CreatePostForm({ 
  projects = [], 
  products = [],
  defaultType = 'QUESTION',
  defaultProjectId,
  defaultProductId,
  currentUserId,
  onSuccess,
  onCancel
}: CreatePostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreatePostForm>({
    resolver: zodResolver(postCreateSchema),
    defaultValues: {
      type: defaultType,
      content: '',
      projectId: defaultProjectId,
      productId: defaultProductId
    }
  })

  const watchedType = form.watch('type')
  const watchedProjectId = form.watch('projectId')

  const getPostTypeInfo = (type: CreatePostForm['type']) => {
    switch (type) {
      case 'QUESTION':
        return {
          title: 'Ask a Question',
          description: 'Get help from the community',
          icon: MessageSquare,
          color: 'text-blue-600',
          placeholder: 'Describe your question in detail. Include context about what you\'re trying to achieve, what you\'ve tried, and any specific challenges you\'re facing.'
        }
      case 'PROJECT_UPDATE':
        return {
          title: 'Project Update',
          description: 'Share progress with your team',
          icon: Clock,
          color: 'text-purple-600',
          placeholder: 'Share what you\'ve accomplished, current challenges, next steps, or any important project developments.'
        }
      case 'PRODUCT_UPDATE':
        return {
          title: 'Product Update',
          description: 'Announce new features or changes',
          icon: FileText,
          color: 'text-orange-600',
          placeholder: 'Describe new features, improvements, bug fixes, or important product announcements.'
        }
      default:
        return {
          title: 'Create Post',
          description: 'Share with the community',
          icon: MessageSquare,
          color: 'text-gray-600',
          placeholder: 'Share your thoughts with the community.'
        }
    }
  }

  const typeInfo = getPostTypeInfo(watchedType)
  const Icon = typeInfo.icon

  const onSubmit = async (data: CreatePostForm) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create post')
      }

      const post = await response.json()
      
      // Reset form
      form.reset()
      
      // Call success callback
      onSuccess?.(post)
      
    } catch (error) {
      console.error('Error creating post:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-gray-100 ${typeInfo.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{typeInfo.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {typeInfo.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Post Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select post type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="QUESTION">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span>Question</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PROJECT_UPDATE">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Project Update</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PRODUCT_UPDATE">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Product Update</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Selection (for PROJECT_UPDATE) */}
            {watchedType === 'PROJECT_UPDATE' && (
              <>
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project Status (only for project owners) */}
                {(() => {
                  const selectedProject = projects.find(p => p.id === watchedProjectId)
                  const isProjectOwner = selectedProject && currentUserId && selectedProject.ownerId === currentUserId
                  
                  if (!isProjectOwner) return null

                  return (
                    <FormField
                      control={form.control}
                      name="projectStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Update Project Status (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={`Current: ${selectedProject.status || 'Unknown'}`} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AWAITING_VOLUNTEERS">Awaiting Volunteers</SelectItem>
                              <SelectItem value="PLANNING">Planning</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-1">
                            Update the project status along with your update post
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )
                })()}
              </>
            )}

            {/* Product Selection (for PRODUCT_UPDATE) */}
            {watchedType === 'PRODUCT_UPDATE' && (
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={typeInfo.placeholder}
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Icon className="h-3 w-3 mr-1" />
                  {typeInfo.title}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Posting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>Post</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}