# Minimal Product Implementation Plan

## Overview
Implement a minimal product system that allows users to create products and associate projects with them. This focuses on the core functionality: product description, URL, and project relationships.

## Core Requirements
1. **Product Entity**: Store product description and URL
2. **Project Association**: Link projects to products (owner-controlled)
3. **Product View**: Show all projects related to a product
4. **Project Selection**: Associate projects with products during creation/editing

## Security Model
**Project-Product Association Rule**: Users can only associate projects with products they own.

## Phase 1: Database Schema

### Product Model
```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String
  url         String?  // Product website/demo URL
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  owner    User      @relation(fields: [ownerId], references: [id])
  projects Project[]

  @@map("products")
}
```

### Project Model Update
```prisma
// Add to existing Project model
model Project {
  // ... existing fields
  productId String? // Optional - projects can be standalone
  
  // Relations
  product Product? @relation(fields: [productId], references: [id])
  // ... existing relations
}
```

## Phase 2: API Implementation

### Product API Routes
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/[id]` - Get product details with related projects
- `PUT /api/products/[id]` - Update product (owner-only)
- `DELETE /api/products/[id]` - Delete product (owner-only)

### Project API Update
- Update project creation/edit to accept `productId`
- Validate productId belongs to authenticated user
- Add product information to project responses

## Phase 3: UI Implementation

### 1. Products Page (`/products`)
- List all products
- Product name, description, URL
- "Create Product" button
- Link to product detail page

### 2. Product Detail Page (`/products/[id]`)
- Product information (name, description, URL)
- "Visit Product" button (if URL exists)
- List of related projects
- Edit/Delete buttons (for owner)

### 3. Product Creation Form (`/products/new`)
- Product name (required)
- Description (required)
- Product URL (optional)

### 4. Project Form Updates
- Optional "Product" dropdown selector
- Only shows products owned by current user
- Clear indication when project is standalone vs product-related

### 5. Navigation Updates
- Add "Products" to sidebar navigation

## Implementation Steps

### Step 1: Database Schema
1. Add Product model to Prisma schema
2. Add productId to Project model
3. Run migration: `npx prisma migrate dev`
4. Update TypeScript types

### Step 2: API Layer
1. Create `/api/products` route (list/create)
2. Create `/api/products/[id]` route (get/update/delete)
3. Update project APIs to handle productId
4. Add validation with Zod schemas

### Step 3: Core Pages
1. Create `/products` page with product listing
2. Create `/products/[id]` page with product details
3. Create `/products/new` page with creation form
4. Update project forms to include product selection

### Step 4: Navigation & Integration
1. Add Products to sidebar navigation
2. Update project displays to show product context

## Success Criteria
- ✅ Users can create products with name, description, and URL
- ✅ Users can view all products in a clean listing
- ✅ Users can view a product detail page showing all related projects
- ✅ Users can associate projects with products during creation/editing
- ✅ Product-project relationships are clearly visible throughout the UI
- ✅ System handles both standalone projects and product-related projects

## Technical Considerations

### Data Integrity
- Products can be deleted only if no projects are associated
- Proper foreign key constraints

### Security
- Product owners can edit/delete their products
- Proper authorization checks
- Input validation and sanitization

### UI/UX
- Clear visual distinction between standalone and product-related projects
- Intuitive product selection flow
- Responsive design for product grids

## Estimated Complexity
- **Database**: 1-2 hours (schema + migration)
- **API Layer**: 3-4 hours (CRUD + validation)
- **UI Components**: 4-6 hours (pages + forms)
- **Integration**: 2-3 hours (navigation + updates)

**Total**: 10-15 hours of development time