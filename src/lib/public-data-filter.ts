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
  status: string
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

interface PublicOrganization {
  id: string
  name: string
  slug: string
  mission: string | null
  description: string | null
  createdAt: Date
  _count?: {
    members: number
    projects: number
    products: number
  }
}

/**
 * Filter user data to remove sensitive information
 */
export function filterPublicUser(user: any): PublicUser {
  if (!user) {
    return {
      id: 'unknown',
      name: 'Anonymous'
    }
  }
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
    status: project.status,
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
 * Filter organization data for public access
 */
export function filterPublicOrganization(organization: any): PublicOrganization {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    mission: organization.mission,
    description: organization.description,
    createdAt: organization.createdAt,
    _count: organization._count
  }
}

/**
 * Filter an array of items using the appropriate filter function
 */
export function filterPublicData<T>(
  items: any[],
  type: 'project' | 'product' | 'post' | 'organization'
): T[] {
  const filterMap = {
    project: filterPublicProject,
    product: filterPublicProduct,
    post: filterPublicPost,
    organization: filterPublicOrganization
  }
  
  const filterFn = filterMap[type]
  return items.map(item => filterFn(item) as T)
}