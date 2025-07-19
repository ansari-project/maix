"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  CheckCircle, 
  Send,
  User,
  X
} from "lucide-react"

// Form schema for creating replies/answers
const createReplySchema = z.object({
  content: z.string().min(10, 'Reply must be at least 10 characters'),
})

type CreateReplyForm = z.infer<typeof createReplySchema>

interface Post {
  id: string
  type: 'QUESTION' | 'ANSWER' | 'PROJECT_UPDATE' | 'PRODUCT_UPDATE' | 'PROJECT_DISCUSSION' | 'PRODUCT_DISCUSSION'
  content: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
}

interface CreateReplyFormProps {
  parentPost: Post
  currentUser: {
    id: string
    name: string | null
    image: string | null
  }
  onSuccess?: (reply: any) => void
  onCancel?: () => void
}

export function CreateReplyForm({ 
  parentPost, 
  currentUser,
  onSuccess,
  onCancel
}: CreateReplyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateReplyForm>({
    resolver: zodResolver(createReplySchema),
    defaultValues: {
      content: ''
    }
  })

  const isAnsweringQuestion = parentPost.type === 'QUESTION'
  const replyType = isAnsweringQuestion ? 'ANSWER' : 'REPLY'

  const getReplyInfo = () => {
    if (isAnsweringQuestion) {
      return {
        title: 'Answer this Question',
        description: 'Share your knowledge to help solve this problem',
        icon: CheckCircle,
        color: 'text-green-600',
        placeholder: 'Provide a detailed answer that helps solve the question. Include explanations, examples, or step-by-step instructions when helpful.',
        actionText: 'Post Answer',
        badgeText: 'Answer'
      }
    } else {
      return {
        title: 'Reply to Post',
        description: 'Add your thoughts or continue the discussion',
        icon: MessageSquare,
        color: 'text-blue-600',
        placeholder: 'Share your thoughts, ask follow-up questions, or add relevant information to continue the discussion.',
        actionText: 'Post Reply',
        badgeText: 'Reply'
      }
    }
  }

  const replyInfo = getReplyInfo()
  const Icon = replyInfo.icon

  const onSubmit = async (data: CreateReplyForm) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: replyType,
          content: data.content,
          parentId: parentPost.id
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create reply')
      }

      const reply = await response.json()
      
      // Reset form
      form.reset()
      
      // Call success callback
      onSuccess?.(reply)
      
    } catch (error) {
      console.error('Error creating reply:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 ${replyInfo.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{replyInfo.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {replyInfo.description}
              </p>
            </div>
          </div>

          {onCancel && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Show parent post context */}
        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {parentPost.author.name || 'Anonymous User'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {parentPost.type.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                {parentPost.content}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* User Context */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">
                  Replying as: {currentUser.name || 'Anonymous User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Your reply will be visible to everyone
                </p>
              </div>
            </div>

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your {replyInfo.badgeText}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={replyInfo.placeholder}
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
                <Badge variant="outline" className={`text-xs ${replyInfo.color}`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {replyInfo.badgeText}
                </Badge>
                {isAnsweringQuestion && (
                  <p className="text-xs text-muted-foreground">
                    Your answer may be marked as the best solution
                  </p>
                )}
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
                  className="min-w-[120px]"
                  variant={isAnsweringQuestion ? "default" : "outline"}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Posting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>{replyInfo.actionText}</span>
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