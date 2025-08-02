# MCP Organization Support Design

## Overview

Add Model Context Protocol (MCP) support for organization management and dual ownership in projects/products.

## Goals

1. Enable AI assistants to manage organizations via MCP
2. Support dual ownership model in project/product creation
3. Maintain backward compatibility with existing MCP tools
4. Follow existing MCP patterns and conventions

## Design

### 1. Organization Management Tool

Create `manageOrganization` tool with actions:
- `create` - Create new organization
- `get` - Get organization details 
- `update` - Update organization info (name only, slug is immutable)
- `delete` - Delete organization (with safeguards)
- `list` - List user's organizations

### 2. Organization Member Management Tool

Create `manageOrganizationMember` tool with actions:
- `list` - List organization members
- `invite` - Invite user to organization (OWNER only)
- `remove` - Remove member (OWNER only)
- `leave` - Leave organization

### 3. Update Existing Tools

Update `manageProject` and `manageProduct` tools to support:
- `organizationId` field in create/update actions
- Validation to ensure user is member of specified organization
- Maintain backward compatibility (organizationId is optional)

### 4. Search Tools Updates

Update search tools to include organization info:
- Add organization details to project/product search results
- Add filter by organizationId option

## Implementation Details

### Tool Schemas

```typescript
// manageOrganization
{
  action: 'create' | 'update' | 'delete' | 'get' | 'list',
  organizationId?: string, // Required for update, delete, get
  name?: string,          // Required for create, optional for update
  slug?: string,          // Required for create only (immutable)
}

// manageOrganizationMember
{
  action: 'list' | 'invite' | 'remove' | 'leave',
  organizationId: string,  // Always required
  userId?: string,         // Required for invite/remove
}

// Updated manageProject/manageProduct
{
  // ... existing fields ...
  organizationId?: string, // Optional - if provided, creates under org
}
```

### Authorization

- Use existing MCP authentication context
- Verify organization membership for all operations
- Enforce role-based permissions (OWNER vs MEMBER)
- Return appropriate error messages for unauthorized actions

### Error Handling

- Invalid organization ID: "Organization not found"
- Not a member: "You are not a member of this organization"
- Insufficient permissions: "Only organization owners can perform this action"
- Last owner leaving: "Cannot leave as the last owner"

## Testing Strategy

1. Unit tests for each new tool
2. Integration tests for dual ownership scenarios
3. Test backward compatibility of existing tools
4. Test authorization boundaries

## Success Criteria

1. AI assistants can create and manage organizations
2. Projects/products can be created under organizations via MCP
3. Proper authorization is enforced
4. Existing MCP functionality continues to work
5. Clear error messages guide AI behavior