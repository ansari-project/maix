/**
 * Event Manager AI Assistant Configuration
 * 
 * This module defines the system prompts and conversation flows
 * for the AI assistant that guides users through event planning.
 */

export const EVENT_ASSISTANT_SYSTEM_PROMPT = `You are the Maix Event Manager Assistant, a friendly and knowledgeable AI that helps users plan and manage successful events. Your role is to guide users through the entire event planning process, from initial concept to execution.

## Your Personality
- Friendly and encouraging, like a supportive event planning partner
- Proactive in suggesting next steps and identifying potential issues
- Detail-oriented but not overwhelming
- Focused on making event planning feel manageable and fun

## Your Capabilities
You have access to powerful tools to help manage events:
- Create and update events with all details (name, date, venue, capacity)
- Manage registrations and attendee lists
- Create and track event todos/tasks
- Provide event statistics and insights
- Generate task checklists based on event type

## Conversation Flow

### 1. Initial Greeting
When a user wants to plan an event, start with enthusiasm:
"Great! I'd love to help you plan your [event type]. Let's make this event amazing! 🎉"

### 2. Information Gathering (Progressive)
Gather information step by step, not all at once:
- First: Event type and basic concept
- Second: Date and expected attendance
- Third: Venue or location preferences
- Fourth: Any special requirements

### 3. Smart Defaults
Based on event type, suggest appropriate defaults:
- Tech Meetup: Evening timing, 30-50 attendees, presentation space needed
- Workshop: Weekend timing, 15-25 attendees, hands-on space needed
- Conference: Full day, 100+ attendees, multiple spaces needed
- Social Event: Flexible timing, varied attendance, casual space

### 4. Task Generation
After creating the event, automatically generate relevant tasks:
- Use templates based on event type
- Adjust timeline based on event date
- Prioritize tasks by importance

### 5. Ongoing Support
Continue helping throughout the planning process:
- Check on progress regularly
- Suggest next actions
- Alert about upcoming deadlines
- Help manage registrations

## Tool Usage Guidelines

### Creating Events
When you have enough information (at minimum: name, date, organization), create the event immediately:
- Use maix_create_event tool
- Confirm creation with the user
- Move immediately to task generation

### Managing Tasks
After event creation, generate tasks automatically:
- Use maix_manage_todo tool to create each task
- Group tasks by category (Setup, Marketing, Day-of, etc.)
- Set appropriate priorities

### Registration Management
Help track and manage registrations:
- Use maix_list_registrations to show attendee list
- Alert when approaching capacity
- Suggest waitlist management strategies

## Response Examples

### Example 1: Starting Event Planning
User: "I want to organize a tech meetup"
Assistant: "Excellent! I'd love to help you organize a tech meetup. Let's create something great together! 

First, let me understand what you have in mind:
- What's the main topic or theme for your meetup?
- Do you have a target date in mind, or are you flexible?

Once I know a bit more, I'll help you set everything up and create a complete planning checklist."

### Example 2: After Basic Info Gathered
User: "It's about AI tools for developers, probably next month"
Assistant: "Perfect! An AI tools meetup for developers sounds fantastic and very timely. For next month, we should start planning now to give enough time for promotion.

A few more quick questions:
- How many attendees are you expecting? (Tech meetups typically work well with 30-50 people)
- Do you have a venue in mind, or would you like suggestions?
- Will you have speakers/demos, or more of a casual discussion format?

I'll create your event and set up your planning checklist as soon as we nail down these details."

### Example 3: Creating Event and Tasks
Assistant: "Great! I'm creating your event now... ✨

[Uses maix_create_event tool]

Perfect! Your 'AI Tools for Developers Meetup' is all set for [date]. 

Now let me set up your planning checklist. I'll create tasks for:
📋 Venue & Logistics (confirm space, equipment, refreshments)
📣 Marketing & Promotion (event page, social media, email)
👥 Content & Speakers (confirm speakers, prepare agenda)
📝 Registration & Attendees (open registration, send reminders)
🎯 Day-of Execution (setup, registration desk, MC duties)

[Uses maix_manage_todo tool multiple times]

All set! You have 15 tasks to help you stay organized. Would you like to review them together, or should we focus on the most urgent ones first?"

## Important Rules
1. Always be encouraging and positive
2. Break complex planning into manageable steps
3. Create events as soon as you have minimum required information
4. Generate comprehensive task lists automatically
5. Use specific event details in your responses (not generic)
6. Proactively suggest next actions
7. Never overwhelm with too much information at once
8. Adapt your suggestions based on event type and scale

## Error Handling
If something goes wrong:
- Acknowledge the issue simply
- Provide a clear next step
- Stay positive and solution-focused
- Example: "I couldn't create that task, but no worries! Let's try describing it differently..."

Remember: Your goal is to make event planning feel achievable and even enjoyable. Be the supportive partner that helps users create successful events!`

/**
 * Event type templates for task generation
 */
export const EVENT_TASK_TEMPLATES = {
  tech_meetup: {
    name: "Tech Meetup",
    tasks: [
      // 4 weeks before
      { category: "Planning", title: "Define meetup agenda and format", priority: "high", weeksBefore: 4 },
      { category: "Venue", title: "Book venue and confirm capacity", priority: "high", weeksBefore: 4 },
      { category: "Speakers", title: "Recruit and confirm speakers", priority: "high", weeksBefore: 4 },
      
      // 3 weeks before
      { category: "Marketing", title: "Create event page and description", priority: "high", weeksBefore: 3 },
      { category: "Marketing", title: "Share on social media channels", priority: "medium", weeksBefore: 3 },
      { category: "Logistics", title: "Arrange refreshments/catering", priority: "medium", weeksBefore: 3 },
      
      // 2 weeks before
      { category: "Content", title: "Review speaker presentations", priority: "medium", weeksBefore: 2 },
      { category: "Marketing", title: "Send first email announcement", priority: "high", weeksBefore: 2 },
      { category: "Logistics", title: "Confirm A/V equipment needs", priority: "medium", weeksBefore: 2 },
      
      // 1 week before
      { category: "Marketing", title: "Send reminder email to registered attendees", priority: "high", weeksBefore: 1 },
      { category: "Content", title: "Finalize agenda and run-of-show", priority: "high", weeksBefore: 1 },
      { category: "Logistics", title: "Prepare name tags and registration list", priority: "low", weeksBefore: 1 },
      
      // Day of event
      { category: "Day-of", title: "Set up venue (chairs, A/V, signage)", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Test all technical equipment", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Brief speakers and volunteers", priority: "medium", weeksBefore: 0 },
      { category: "Day-of", title: "Manage registration check-in", priority: "high", weeksBefore: 0 },
      
      // After event
      { category: "Follow-up", title: "Send thank you email to attendees", priority: "medium", weeksBefore: -1 },
      { category: "Follow-up", title: "Share slides/recordings if available", priority: "low", weeksBefore: -1 },
      { category: "Follow-up", title: "Gather feedback via survey", priority: "medium", weeksBefore: -1 }
    ]
  },
  
  workshop: {
    name: "Workshop",
    tasks: [
      // 3 weeks before
      { category: "Planning", title: "Define workshop objectives and outline", priority: "high", weeksBefore: 3 },
      { category: "Venue", title: "Book appropriate workshop space", priority: "high", weeksBefore: 3 },
      { category: "Content", title: "Develop workshop materials and handouts", priority: "high", weeksBefore: 3 },
      
      // 2 weeks before
      { category: "Marketing", title: "Create registration page with prerequisites", priority: "high", weeksBefore: 2 },
      { category: "Logistics", title: "Prepare participant materials/supplies", priority: "medium", weeksBefore: 2 },
      { category: "Marketing", title: "Promote through relevant channels", priority: "medium", weeksBefore: 2 },
      
      // 1 week before
      { category: "Content", title: "Finalize exercises and activities", priority: "high", weeksBefore: 1 },
      { category: "Logistics", title: "Print handouts and prepare folders", priority: "medium", weeksBefore: 1 },
      { category: "Communication", title: "Send prep email with pre-work if any", priority: "high", weeksBefore: 1 },
      
      // Day of
      { category: "Day-of", title: "Set up workspace and materials", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Prepare refreshments and breaks", priority: "low", weeksBefore: 0 },
      { category: "Day-of", title: "Conduct workshop and manage time", priority: "high", weeksBefore: 0 },
      
      // After
      { category: "Follow-up", title: "Send follow-up resources", priority: "medium", weeksBefore: -1 },
      { category: "Follow-up", title: "Collect feedback and testimonials", priority: "medium", weeksBefore: -1 }
    ]
  },
  
  networking: {
    name: "Networking Event",
    tasks: [
      // 3 weeks before
      { category: "Planning", title: "Define event format and flow", priority: "high", weeksBefore: 3 },
      { category: "Venue", title: "Book venue with cocktail setup", priority: "high", weeksBefore: 3 },
      
      // 2 weeks before
      { category: "Marketing", title: "Create and share event invitation", priority: "high", weeksBefore: 2 },
      { category: "Logistics", title: "Arrange catering and beverages", priority: "high", weeksBefore: 2 },
      { category: "Content", title: "Plan ice-breaker activities", priority: "low", weeksBefore: 2 },
      
      // 1 week before
      { category: "Marketing", title: "Send reminder with parking/directions", priority: "medium", weeksBefore: 1 },
      { category: "Logistics", title: "Prepare name tags with company/role", priority: "medium", weeksBefore: 1 },
      { category: "Content", title: "Prepare welcome speech/introduction", priority: "low", weeksBefore: 1 },
      
      // Day of
      { category: "Day-of", title: "Set up registration and welcome table", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Ensure music and ambiance", priority: "low", weeksBefore: 0 },
      { category: "Day-of", title: "Facilitate introductions and connections", priority: "medium", weeksBefore: 0 },
      
      // After
      { category: "Follow-up", title: "Share attendee contact list (with permission)", priority: "medium", weeksBefore: -1 },
      { category: "Follow-up", title: "Thank attendees and share photos", priority: "low", weeksBefore: -1 }
    ]
  },
  
  conference: {
    name: "Conference",
    tasks: [
      // 8 weeks before
      { category: "Planning", title: "Form organizing committee", priority: "high", weeksBefore: 8 },
      { category: "Planning", title: "Define conference theme and tracks", priority: "high", weeksBefore: 8 },
      { category: "Venue", title: "Book venue with multiple rooms", priority: "high", weeksBefore: 8 },
      
      // 6 weeks before
      { category: "Speakers", title: "Open call for speakers/papers", priority: "high", weeksBefore: 6 },
      { category: "Marketing", title: "Launch conference website", priority: "high", weeksBefore: 6 },
      { category: "Sponsorship", title: "Reach out to potential sponsors", priority: "medium", weeksBefore: 6 },
      
      // 4 weeks before
      { category: "Speakers", title: "Review and select speakers", priority: "high", weeksBefore: 4 },
      { category: "Marketing", title: "Open registration with early bird pricing", priority: "high", weeksBefore: 4 },
      { category: "Logistics", title: "Arrange catering for all meals", priority: "medium", weeksBefore: 4 },
      
      // 3 weeks before
      { category: "Content", title: "Finalize conference schedule", priority: "high", weeksBefore: 3 },
      { category: "Marketing", title: "Promote through all channels", priority: "high", weeksBefore: 3 },
      { category: "Logistics", title: "Coordinate A/V for all rooms", priority: "medium", weeksBefore: 3 },
      
      // 2 weeks before
      { category: "Content", title: "Review all presentations", priority: "medium", weeksBefore: 2 },
      { category: "Logistics", title: "Prepare conference swag and badges", priority: "medium", weeksBefore: 2 },
      { category: "Volunteers", title: "Brief volunteer team", priority: "medium", weeksBefore: 2 },
      
      // 1 week before
      { category: "Communication", title: "Send attendee information packet", priority: "high", weeksBefore: 1 },
      { category: "Logistics", title: "Confirm all vendor arrangements", priority: "high", weeksBefore: 1 },
      { category: "Content", title: "Prepare opening/closing remarks", priority: "medium", weeksBefore: 1 },
      
      // Day of
      { category: "Day-of", title: "Set up registration and info desk", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Coordinate speaker green room", priority: "medium", weeksBefore: 0 },
      { category: "Day-of", title: "Manage session transitions", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Host networking reception", priority: "medium", weeksBefore: 0 },
      
      // After
      { category: "Follow-up", title: "Send thank you and survey", priority: "high", weeksBefore: -1 },
      { category: "Follow-up", title: "Share recordings and slides", priority: "medium", weeksBefore: -1 },
      { category: "Follow-up", title: "Prepare post-event report", priority: "low", weeksBefore: -1 }
    ]
  },
  
  hackathon: {
    name: "Hackathon",
    tasks: [
      // 6 weeks before
      { category: "Planning", title: "Define hackathon theme and rules", priority: "high", weeksBefore: 6 },
      { category: "Venue", title: "Book 24-hour accessible venue", priority: "high", weeksBefore: 6 },
      { category: "Sponsorship", title: "Secure sponsors for prizes", priority: "high", weeksBefore: 6 },
      
      // 4 weeks before
      { category: "Marketing", title: "Launch registration site", priority: "high", weeksBefore: 4 },
      { category: "Judges", title: "Recruit and confirm judges", priority: "medium", weeksBefore: 4 },
      { category: "Platform", title: "Set up submission platform", priority: "medium", weeksBefore: 4 },
      
      // 2 weeks before
      { category: "Logistics", title: "Arrange food for entire event", priority: "high", weeksBefore: 2 },
      { category: "Tech", title: "Ensure WiFi and power capacity", priority: "high", weeksBefore: 2 },
      { category: "Content", title: "Prepare judging criteria", priority: "medium", weeksBefore: 2 },
      
      // 1 week before
      { category: "Communication", title: "Send participant guide", priority: "high", weeksBefore: 1 },
      { category: "Mentors", title: "Brief mentor volunteers", priority: "medium", weeksBefore: 1 },
      { category: "Logistics", title: "Prepare swag bags", priority: "low", weeksBefore: 1 },
      
      // Day of
      { category: "Day-of", title: "Registration and team formation", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Kick-off presentation", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Manage overnight logistics", priority: "medium", weeksBefore: 0 },
      { category: "Day-of", title: "Coordinate final presentations", priority: "high", weeksBefore: 0 },
      { category: "Day-of", title: "Award ceremony", priority: "high", weeksBefore: 0 },
      
      // After
      { category: "Follow-up", title: "Share project showcases", priority: "medium", weeksBefore: -1 },
      { category: "Follow-up", title: "Connect winners with prizes", priority: "high", weeksBefore: -1 }
    ]
  }
}

/**
 * Helper function to determine event type from description
 */
export function detectEventType(description: string): keyof typeof EVENT_TASK_TEMPLATES | null {
  const lower = description.toLowerCase()
  
  if (lower.includes('meetup') || lower.includes('tech talk') || lower.includes('demo')) {
    return 'tech_meetup'
  }
  if (lower.includes('workshop') || lower.includes('training') || lower.includes('hands-on')) {
    return 'workshop'
  }
  if (lower.includes('network') || lower.includes('social') || lower.includes('mixer')) {
    return 'networking'
  }
  if (lower.includes('conference') || lower.includes('summit') || lower.includes('symposium')) {
    return 'conference'
  }
  if (lower.includes('hackathon') || lower.includes('hack') || lower.includes('competition')) {
    return 'hackathon'
  }
  
  return null
}

/**
 * Generate tasks for an event based on its type and date
 */
export function generateEventTasks(
  eventType: keyof typeof EVENT_TASK_TEMPLATES,
  eventDate: Date,
  eventId: string
): Array<{
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: Date
  eventId: string
  labels: string[]
}> {
  const template = EVENT_TASK_TEMPLATES[eventType]
  const tasks: Array<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    dueDate: Date
    eventId: string
    labels: string[]
  }> = []
  
  for (const task of template.tasks) {
    const dueDate = new Date(eventDate)
    if (task.weeksBefore > 0) {
      dueDate.setDate(dueDate.getDate() - (task.weeksBefore * 7))
    } else if (task.weeksBefore < 0) {
      dueDate.setDate(dueDate.getDate() - (task.weeksBefore * 7)) // Negative value, so this adds days
    }
    
    tasks.push({
      title: task.title,
      description: `${task.category}: ${task.title}`,
      priority: task.priority as 'low' | 'medium' | 'high',
      dueDate,
      eventId,
      labels: [task.category, template.name]
    })
  }
  
  return tasks
}