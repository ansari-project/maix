# MCP Stage 2: Comprehensive CRUD/Search Operations

## Overview

MCP Stage 2 extends our minimal MCP implementation to provide comprehensive CRUD and search operations for all key content types in MAIX. This plan leverages the existing unified Post model architecture for maximum simplicity and consistency.

## Key Insight: Unified Post Model

The database uses a single `Post` table with a `PostType` enum to handle all content types:
- QUESTION - Community questions seeking help
- ANSWER - Responses to questions
- PROJECT_UPDATE - Progress updates on projects
- PRODUCT_UPDATE - Updates on products
- PROJECT_DISCUSSION - Discussion thread for a project
- PRODUCT_DISCUSSION - Discussion thread for a product

This architecture allows us to implement just 3 tools instead of 10+ separate tools, dramatically simplifying the implementation while maintaining full functionality.

## Tool Design

### 1. `maix_manage_post`
Single-item CRUD operations for all post types (no listing functionality).

**Actions:**
- `create` - Create new post (question, answer, update, or discussion)
- `get` - Retrieve single post details by ID
- `update` - Edit existing post
- `delete` - Remove post

**Input Schema:**
```json
{
  "action": "create|get|update|delete",
  "postId": "string (required for get/update/delete)",
  "type": "QUESTION|ANSWER|PROJECT_UPDATE|PRODUCT_UPDATE|PROJECT_DISCUSSION|PRODUCT_DISCUSSION (for create)",
  "content": "string (for create/update)",
  "parentId": "string (for ANSWER type - the question ID)",
  "projectId": "string (for PROJECT_UPDATE/PROJECT_DISCUSSION)",
  "productId": "string (for PRODUCT_UPDATE/PRODUCT_DISCUSSION)"
}
```

**Type-Specific Validation:**
- **QUESTION**: Requires content only
- **ANSWER**: Requires parentId (question ID) and content
- **PROJECT_UPDATE**: Requires projectId and content
- **PRODUCT_UPDATE**: Requires productId and content
- **PROJECT_DISCUSSION**: Requires projectId (one per project)
- **PRODUCT_DISCUSSION**: Requires productId (one per product)

### 2. `maix_search_posts`
All listing and search operations - from simple lists to complex queries.

**Input Schema:**
```json
{
  "query": "string (optional - text search)",
  "type": "PostType[] (optional - filter by post types)",
  "authorId": "string (optional - posts by specific user)",
  "projectId": "string (optional - posts related to project)",
  "productId": "string (optional - posts related to product)",
  "parentId": "string (optional - answers to specific question)",
  "isResolved": "boolean (optional - only applies to QUESTION type)",
  "dateFrom": "datetime (optional)",
  "dateTo": "datetime (optional)",
  "limit": "number (default: 20, max: 100)",
  "offset": "number (default: 0)"
}
```

**Usage Examples:**
- Get my questions: `{authorId: "myId", type: ["QUESTION"]}`
- Get unanswered questions: `{type: ["QUESTION"], isResolved: false}`
- Get project updates: `{projectId: "xyz", type: ["PROJECT_UPDATE"]}`
- Search all content: `{query: "authentication Next.js"}`

### 3. `maix_manage_comment`
CRUD operations for comments on any post.

**Actions:**
- `create` - Add comment to a post
- `get` - Get single comment by ID
- `update` - Edit comment
- `delete` - Remove comment

**Input Schema:**
```json
{
  "action": "create|get|update|delete",
  "commentId": "string (required for get/update/delete)",
  "postId": "string (required for create)",
  "content": "string (for create/update)"
}
```

### 4. `maix_search_comments`
List and search comments.

**Input Schema:**
```json
{
  "postId": "string (optional - comments on specific post)",
  "authorId": "string (optional - comments by specific user)",
  "query": "string (optional - text search)",
  "limit": "number (default: 20, max: 100)",
  "offset": "number (default: 0)"
}
```

## Implementation Phases

### Phase 1: Core Post Management
**Completion Criteria**: Working maix_manage_post tool with all single-item operations

1. **Create tool file structure**
   ```
   src/lib/mcp/tools/
   ├── managePost.ts
   ├── searchPosts.ts
   ├── manageComment.ts
   └── searchComments.ts
   ```

2. **Implement maix_manage_post**
   - Reuse patterns from existing manageProject.ts
   - Use modular validation strategy pattern for each PostType
   - Handle parent-child relationships for Q&A
   - Enforce one discussion per project/product with concurrency handling
   - Implement isResolved/bestAnswerId state management for questions

3. **Add to MCP route handler**
   - Register new tool in route.ts
   - Ensure authentication applies

### Phase 2: Search Implementation
**Completion Criteria**: Working search functionality across all post types

1. **Implement maix_search_posts**
   - Use PostgreSQL Full-Text Search (FTS) for query parameter
   - Support all filter combinations
   - Add proper pagination
   - Return relevant excerpts

2. **Add search indexes**
   - Create database indexes for performance
   - Index common query patterns

### Phase 3: Comment Management
**Completion Criteria**: Full comment functionality on all posts

1. **Implement maix_manage_comment**
   - Simple flat comments (no threading initially)
   - Standard CRUD operations
   - Proper authorization checks

2. **Implement maix_search_comments**
   - List comments by post
   - Search within comments
   - Pagination support

### Phase 4: Testing & Documentation
**Completion Criteria**: Comprehensive tests and user documentation

1. **Write tests**
   - Unit tests for each tool
   - Integration tests with database
   - Test type-specific validations

2. **Update documentation**
   - Add new tools to user guide
   - Provide usage examples
   - Document type-specific behaviors

## Security Considerations

### Permissions Model
- **Create**: Any authenticated user can create posts/comments
- **Read**: Public content visible to all, private based on relationships
- **Update/Delete**: Only content authors (and project/product owners for their content)
- **Special Cases**: 
  - Project owners can moderate discussions on their projects
  - Only question authors can mark answers as "best"

### Input Validation
- Reuse existing Zod schemas where possible
- Validate type-specific requirements
- Prevent XSS and injection attacks
- Enforce character limits

## Database Considerations

### Existing Schema Usage
- Leverage unified Post model with PostType enum
- Use existing relationships (parent-child, foreign keys)
- No new tables required

### Performance Optimization
- Add indexes for common queries
- Use pagination for all list operations
- Consider caching for frequently accessed content

## Success Metrics

### Technical Metrics
- Tool response time < 500ms
- Search response time < 1s
- Zero data integrity issues

### Adoption Metrics
- % of content created via MCP
- Tool usage frequency
- User satisfaction scores

## Future Enhancements

Once Stage 2 is complete and stable:

1. **Vector Search** - Add semantic search using embeddings
2. **Batch Operations** - Process multiple items at once
3. **Rich Content** - Support markdown, code blocks, images
4. **Real-time Updates** - Notifications via MCP
5. **Analytics** - Advanced reporting tools

## Migration Notes

No data migration required - we're using existing database schema. The implementation is purely additive.

## Example Usage

### Creating a Question
```
User: "Ask how to implement authentication in Next.js"
Tool: maix_manage_post({
  "action": "create",
  "type": "QUESTION",
  "content": "How do I implement authentication in Next.js 14 with NextAuth?"
})
```

### Answering a Question
```
User: "Answer question abc123 with my solution"
Tool: maix_manage_post({
  "action": "create",
  "type": "ANSWER",
  "parentId": "abc123",
  "content": "You can use NextAuth.js with the app router..."
})
```

### Posting Project Update
```
User: "Post update for project xyz789"
Tool: maix_manage_post({
  "action": "create",
  "type": "PROJECT_UPDATE",
  "projectId": "xyz789",
  "content": "Completed the authentication module!"
})
```

### Searching All Questions
```
User: "Find unanswered questions about React"
Tool: maix_search_posts({
  "query": "React",
  "type": ["QUESTION"],
  "isResolved": false
})
```

### Getting Project Updates
```
User: "Show updates for project xyz789"
Tool: maix_search_posts({
  "projectId": "xyz789",
  "type": ["PROJECT_UPDATE"],
  "limit": 10
})
```

## Design Rationale

### Clean Separation of Concerns
- **Manage tools**: Single-item operations only (create, get, update, delete)
- **Search tools**: All collection operations (list, filter, search)

This separation eliminates confusion about which tool to use and creates a more intuitive API.

### Field Explanations
- **isResolved**: Only applies to QUESTION posts - indicates if the question has been answered satisfactorily
- **parentId**: Creates parent-child relationships (e.g., answers belong to questions)
- **Unified search**: One search tool handles all listing needs, from simple filters to complex queries

## Conclusion

This Stage 2 plan provides comprehensive CRUD and search functionality while maintaining simplicity through:
- Clear separation between single-item and collection operations
- Leveraging existing unified Post model
- Only 4 tools for complete functionality
- Consistent patterns with existing code
- No premature optimization

The implementation focuses on delivering immediate value with a clean, intuitive API that's easy to understand and use.