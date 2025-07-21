/**
 * Utility functions for filtering sensitive data from public API responses
 */

interface PublicUser {
  id: string
  name: string | null
}

interface PublicProject {
  id: string
  name: string
  description: string
  goal: string
  helpType: string
  contactEmail: string
  targetCompletionDate: Date | null
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  owner: PublicUser
  productId?: string | null
  _count?: {
    applications: number
  }
}

interface PublicProduct {
  id: string
  name: string
  description: string
  url: string | null
  createdAt: Date
  updatedAt: Date
  owner: PublicUser
  _count?: {
    projects: number
  }
}

interface PublicPost {
  id: string
  type: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: PublicUser
  isResolved?: boolean
  _count?: {
    comments: number
    children?: number
  }
  bestAnswerId?: string | null
  parentId?: string | null
}

/**
 * Filter user data to remove sensitive information
 */
export function filterPublicUser(user: any): PublicUser {
  return {
    id: user.id,
    name: user.name || 'Anonymous'
  }
}

/**
 * Filter project data for public access
 */
export function filterPublicProject(project: any): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    goal: project.goal,
    helpType: project.helpType,
    contactEmail: project.contactEmail,
    targetCompletionDate: project.targetCompletionDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    isActive: project.isActive,
    owner: filterPublicUser(project.owner),
    productId: project.productId,
    _count: project._count
  }
}

/**
 * Filter product data for public access
 */
export function filterPublicProduct(product: any): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    url: product.url,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    owner: filterPublicUser(product.owner),
    _count: product._count
  }
}

/**
 * Filter post data (questions/answers) for public access
 */
export function filterPublicPost(post: any): PublicPost {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: filterPublicUser(post.author),
    isResolved: post.isResolved,
    _count: post._count,
    bestAnswerId: post.bestAnswerId,
    parentId: post.parentId
  }
}

/**
 * Filter an array of items using the appropriate filter function
 */
export function filterPublicData<T>(
  items: any[],
  type: 'project' | 'product' | 'post'
): T[] {
  const filterMap = {
    project: filterPublicProject,
    product: filterPublicProduct,
    post: filterPublicPost
  }
  
  const filterFn = filterMap[type]
  return items.map(item => filterFn(item) as T)
}