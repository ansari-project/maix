import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validatePersonalAccessToken } from "@/lib/mcp/services/pat.service";
import type { User } from "@prisma/client";
import { handleManagePost, ManagePostSchema } from "@/lib/mcp/tools/managePost";
import { handleSearchPosts, SearchPostsSchema } from "@/lib/mcp/tools/searchPosts";
import { handleManageComment, ManageCommentSchema } from "@/lib/mcp/tools/manageComment";
import { handleSearchComments, SearchCommentsSchema } from "@/lib/mcp/tools/searchComments";
import { manageProjectTool } from "@/lib/mcp/tools/manageProject";
import { handleSearchProjects, SearchProjectsSchema } from "@/lib/mcp/tools/searchProjects";
import { handleManageProduct, manageProductParameters } from "@/lib/mcp/tools/manageProduct";
import { handleSearchProducts, SearchProductsSchema } from "@/lib/mcp/tools/searchProducts";
import { manageOrganizationTool } from "@/lib/mcp/tools/manageOrganization";
import { manageOrganizationMemberTool } from "@/lib/mcp/tools/manageOrganizationMember";
import { handleManageTodo, ManageTodoSchema } from "@/lib/mcp/tools/manageTodo";
import { handleSearchTodos, SearchTodosSchema } from "@/lib/mcp/tools/searchTodos";

// Type definitions for type safety
type MaixAuthInfo = {
  token: string;
  scopes: string[];
  clientId: string;
  extra: {
    user: User;
  };
};

// PAT authentication verification
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<MaixAuthInfo | undefined> => {
  try {
    console.log('MCP: Verifying token', { hasToken: !!bearerToken });
    
    if (!bearerToken) {
      console.log('MCP: No bearer token provided');
      return undefined;
    }

    const user = await validatePersonalAccessToken(bearerToken);
    console.log('MCP: Token validation result', { userId: user?.id, hasUser: !!user });

    if (!user) {
      console.log('MCP: Token validation failed');
      return undefined;
    }

    console.log('MCP: Token verified successfully for user', user.id);
    return {
      token: bearerToken,
      scopes: ["api:access"],
      clientId: user.id,
      extra: { user },
    };
  } catch (error) {
    console.error('MCP: Token verification error:', error);
    return undefined;
  }
};

// Core MCP handler with tools
const mcpHandler = createMcpHandler(
  (server) => {
    console.log('MCP: Setting up MCP handler with tools');
    // Tool: Update user profile
    server.tool(
      "maix_update_profile",
      "Updates the authenticated user's profile information",
      {
        name: z.string().min(1).optional().describe("The user's display name"),
        bio: z.string().optional().describe("A short user biography"),
        linkedinUrl: z.string().url().optional().describe("LinkedIn profile URL"),
        githubUrl: z.string().url().optional().describe("GitHub profile URL"),
        portfolioUrl: z.string().url().optional().describe("Portfolio website URL"),
        availability: z.string().optional().describe("Availability in hours per week"),
        skills: z.array(z.string()).optional().describe("List of skills"),
      },
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: params.name,
              bio: params.bio,
              linkedinUrl: params.linkedinUrl,
              githubUrl: params.githubUrl,
              portfolioUrl: params.portfolioUrl,
              availability: params.availability,
              // Skills are stored as string array in the database
              skills: params.skills || undefined,
            },
          });

          return {
            content: [{ type: "text", text: "Profile updated successfully!" }],
          };
        } catch (error) {
          console.error("Failed to update profile:", error);
          return {
            content: [{ type: "text", text: "An error occurred while updating the profile." }],
          };
        }
      }
    );

    // Tool: Manage projects (CRUD operations)
    server.tool(
      manageProjectTool.name,
      manageProjectTool.description,
      manageProjectTool.parametersShape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;

          switch (params.action) {
            case "create": {
              if (!params.name || !params.goal || !params.description) {
                return {
                  content: [{ type: "text", text: "Name, goal, and description are required for creating a project." }],
                };
              }

              const project = await prisma.project.create({
                data: {
                  name: params.name,
                  goal: params.goal,
                  description: params.description,
                  helpType: params.helpType || "ADVICE",
                  contactEmail: params.contactEmail || user.email,
                  targetCompletionDate: params.targetCompletionDate ? new Date(params.targetCompletionDate) : undefined,
                  isActive: params.isActive ?? true,
                  productId: params.productId,
                  ownerId: user.id,
                },
              });

              return {
                content: [{ type: "text", text: `Project "${project.name}" created successfully! ID: ${project.id}` }],
              };
            }

            case "list": {
              const projects = await prisma.project.findMany({
                where: { ownerId: user.id },
                select: {
                  id: true,
                  name: true,
                  goal: true,
                  description: true,
                  helpType: true,
                  contactEmail: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
              });

              const projectList = projects.map(p => 
                `• ${p.name} (${p.id}) - ${p.helpType} - ${p.goal}`
              ).join("\n");

              return {
                content: [{ 
                  type: "text", 
                  text: projects.length > 0 
                    ? `Your projects:\n${projectList}` 
                    : "You don't have any projects yet." 
                }],
              };
            }

            case "get": {
              if (!params.projectId) {
                return {
                  content: [{ type: "text", text: "Project ID is required." }],
                };
              }

              const project = await prisma.project.findFirst({
                where: { 
                  id: params.projectId,
                  ownerId: user.id, // Users can only access their own projects
                },
              });

              if (!project) {
                return {
                  content: [{ type: "text", text: "Project not found or you don't have access to it." }],
                };
              }

              return {
                content: [{ 
                  type: "text", 
                  text: `Project: ${project.name}\nGoal: ${project.goal}\nDescription: ${project.description}\nHelp Type: ${project.helpType}\nContact: ${project.contactEmail}\nActive: ${project.isActive ? 'Yes' : 'No'}\nTarget Completion: ${project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : 'Not set'}` 
                }],
              };
            }

            case "update": {
              if (!params.projectId) {
                return {
                  content: [{ type: "text", text: "Project ID is required for updates." }],
                };
              }

              const updateData: any = {};
              if (params.name) updateData.name = params.name;
              if (params.goal) updateData.goal = params.goal;
              if (params.description) updateData.description = params.description;
              if (params.helpType) updateData.helpType = params.helpType;
              if (params.contactEmail) updateData.contactEmail = params.contactEmail;
              if (params.targetCompletionDate !== undefined) updateData.targetCompletionDate = params.targetCompletionDate ? new Date(params.targetCompletionDate) : null;
              if (params.isActive !== undefined) updateData.isActive = params.isActive;
              if (params.productId !== undefined) updateData.productId = params.productId;

              const project = await prisma.project.updateMany({
                where: { 
                  id: params.projectId,
                  ownerId: user.id, // Users can only update their own projects
                },
                data: updateData,
              });

              if (project.count === 0) {
                return {
                  content: [{ type: "text", text: "Project not found or you don't have access to it." }],
                };
              }

              return {
                content: [{ type: "text", text: "Project updated successfully!" }],
              };
            }

            case "delete": {
              if (!params.projectId) {
                return {
                  content: [{ type: "text", text: "Project ID is required for deletion." }],
                };
              }

              const project = await prisma.project.deleteMany({
                where: { 
                  id: params.projectId,
                  ownerId: user.id, // Users can only delete their own projects
                },
              });

              if (project.count === 0) {
                return {
                  content: [{ type: "text", text: "Project not found or you don't have access to it." }],
                };
              }

              return {
                content: [{ type: "text", text: "Project deleted successfully!" }],
              };
            }

            default:
              return {
                content: [{ type: "text", text: "Invalid action. Use: create, update, get, list, or delete." }],
              };
          }
        } catch (error) {
          console.error("Failed to manage project:", error);
          return {
            content: [{ type: "text", text: "An error occurred while managing the project." }],
          };
        }
      }
    );

    // Tool: Manage posts (CRUD operations for all post types)
    server.tool(
      "maix_manage_post",
      "Create, read, update, or delete posts (questions, answers, updates, discussions)",
      ManagePostSchema.shape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await handleManagePost(params, context);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to manage post:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing the post." }],
          };
        }
      }
    );

    // Tool: Search posts
    server.tool(
      "maix_search_posts",
      "Search and list posts with filters (questions, answers, updates, discussions)",
      SearchPostsSchema.shape,
      async (params, extra) => {
        try {
          const result = await handleSearchPosts(params);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to search posts:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while searching posts." }],
          };
        }
      }
    );

    // Tool: Manage comments
    server.tool(
      "maix_manage_comment",
      "Create, read, update, or delete comments on posts",
      ManageCommentSchema.shape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await handleManageComment(params, context);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to manage comment:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing the comment." }],
          };
        }
      }
    );

    // Tool: Search comments
    server.tool(
      "maix_search_comments",
      "Search and list comments with filters",
      SearchCommentsSchema.shape,
      async (params, extra) => {
        try {
          const result = await handleSearchComments(params);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to search comments:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while searching comments." }],
          };
        }
      }
    );

    // Tool: Search projects
    server.tool(
      "maix_search_projects", 
      "Search and list projects with filters",
      SearchProjectsSchema.shape,
      async (params, extra) => {
        try {
          const result = await handleSearchProjects(params);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to search projects:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while searching projects." }],
          };
        }
      }
    );

    // Tool: Manage products
    server.tool(
      "maix_manage_product",
      "Create, read, update, or delete products", 
      manageProductParameters.shape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await handleManageProduct(params, context);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to manage product:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing the product." }],
          };
        }
      }
    );

    // Tool: Search products
    server.tool(
      "maix_search_products",
      "Search and list products with filters",
      SearchProductsSchema.shape, 
      async (params, extra) => {
        try {
          const result = await handleSearchProducts(params);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to search products:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while searching products." }],
          };
        }
      }
    );

    // Tool: Manage organizations
    server.tool(
      manageOrganizationTool.name,
      manageOrganizationTool.description,
      manageOrganizationTool.parametersShape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await manageOrganizationTool.handler(params, context);
          
          if (result.success) {
            let message = result.message || 'Operation completed successfully';
            if (result.data && typeof result.data === 'object') {
              message += '\n\n' + JSON.stringify(result.data, null, 2);
            }
            return {
              content: [{ type: "text", text: message }],
            };
          } else {
            return {
              content: [{ type: "text", text: result.error || 'Organization operation failed' }],
            };
          }
        } catch (error) {
          console.error("Failed to manage organization:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing the organization." }],
          };
        }
      }
    );

    // Tool: Manage organization members
    server.tool(
      manageOrganizationMemberTool.name,
      manageOrganizationMemberTool.description,
      manageOrganizationMemberTool.parametersShape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await manageOrganizationMemberTool.handler(params, context);
          
          if (result.success) {
            let message = result.message || 'Operation completed successfully';
            if (result.data && typeof result.data === 'object') {
              message += '\n\n' + JSON.stringify(result.data, null, 2);
            }
            return {
              content: [{ type: "text", text: message }],
            };
          } else {
            return {
              content: [{ type: "text", text: result.error || 'Organization member operation failed' }],
            };
          }
        } catch (error) {
          console.error("Failed to manage organization member:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing organization members." }],
          };
        }
      }
    );

    // Tool: Manage todos
    server.tool(
      "maix_manage_todo",
      "Create, read, update, or delete todos for projects",
      ManageTodoSchema.shape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await handleManageTodo(params, context);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to manage todo:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while managing the todo." }],
          };
        }
      }
    );

    // Tool: Search todos
    server.tool(
      "maix_search_todos",
      "Search and list todos with filters across projects",
      SearchTodosSchema.shape,
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;
          const context = { user };
          const result = await handleSearchTodos(params, context);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          console.error("Failed to search todos:", error);
          return {
            content: [{ type: "text", text: error instanceof Error ? error.message : "An error occurred while searching todos." }],
          };
        }
      }
    );
  },
  {
    // Optional server options
  },
  {
    // Keep it simple - no Redis for now
    maxDuration: 60,
    basePath: "/api",
    verboseLogs: true,
  }
);

// Wrap with authentication and export
const authenticatedHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true, // Enforce authentication for all tools
});

// Add error handling wrapper
const wrappedHandler = async (req: Request) => {
  try {
    console.log('MCP: Incoming request', { 
      method: req.method, 
      url: req.url, 
      headers: Object.fromEntries(req.headers.entries()),
      contentType: req.headers.get('content-type')
    });
    
    // Log request body for debugging
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const body = await req.text();
        console.log('MCP: Request body:', body);
        
        // Parse the JSON to check if it's an initialize request
        let jsonBody;
        try {
          jsonBody = JSON.parse(body);
        } catch {
          jsonBody = null;
        }
        
        // For initialize requests, temporarily allow without authentication
        if (jsonBody && jsonBody.method === 'initialize') {
          console.log('MCP: Initialize request detected, allowing without auth');
          // Create a new request with the body since we consumed it
          const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: body
          });
          const result = await mcpHandler(newReq);
          console.log('MCP: Initialize request completed successfully', { 
            status: result.status, 
            headers: Object.fromEntries(result.headers.entries()) 
          });
          return result;
        }
        
        // For all other requests, use authentication
        const newReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: body
        });
        const result = await authenticatedHandler(newReq);
        console.log('MCP: Request completed successfully');
        return result;
      } catch (bodyError) {
        console.log('MCP: Could not read request body:', bodyError);
      }
    }
    
    const result = await authenticatedHandler(req);
    console.log('MCP: Request completed successfully');
    return result;
  } catch (error) {
    console.error('MCP: Request failed:', error);
    
    // Return proper error response
    return new Response(
      JSON.stringify({ 
        error: 'MCP server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export { 
  wrappedHandler as GET, 
  wrappedHandler as POST,
  wrappedHandler as PUT,
  wrappedHandler as PATCH,
  wrappedHandler as DELETE,
  wrappedHandler as OPTIONS
};