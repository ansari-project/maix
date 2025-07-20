import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validatePersonalAccessToken } from "@/lib/mcp/services/pat.service";
import type { User } from "@prisma/client";
import { handleManagePost, ManagePostSchema } from "@/lib/mcp/tools/managePost";
import { handleSearchPosts, SearchPostsSchema } from "@/lib/mcp/tools/searchPosts";
import { handleManageComment, ManageCommentSchema } from "@/lib/mcp/tools/manageComment";
import { handleSearchComments, SearchCommentsSchema } from "@/lib/mcp/tools/searchComments";

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
      "maix_manage_project",
      "Create, read, update, or delete projects",
      {
        action: z.enum(["create", "update", "get", "list", "delete"]).describe("The action to perform"),
        projectId: z.string().optional().describe("Project ID (required for update, get, delete)"),
        title: z.string().optional().describe("Project title"),
        description: z.string().optional().describe("Project description"),
        projectType: z.enum(["RESEARCH", "STARTUP", "NON_PROFIT", "OPEN_SOURCE", "CORPORATE"]).optional(),
        helpType: z.enum(["ADVICE", "PROTOTYPE", "MVP", "FULL_PRODUCT"]).optional(),
        maxVolunteers: z.number().int().min(1).optional().describe("Maximum number of volunteers"),
        contactEmail: z.string().email().optional().describe("Contact email for the project"),
        requiredSkills: z.array(z.string()).optional().describe("Required skills for volunteers"),
        budgetRange: z.string().optional().describe("Budget range for the project"),
      },
      async (params, extra) => {
        try {
          const user = (extra.authInfo as MaixAuthInfo).extra.user;

          switch (params.action) {
            case "create": {
              if (!params.title || !params.description) {
                return {
                  content: [{ type: "text", text: "Title and description are required for creating a project." }],
                };
              }

              const project = await prisma.project.create({
                data: {
                  title: params.title,
                  description: params.description,
                  projectType: params.projectType || "OPEN_SOURCE",
                  helpType: params.helpType || "ADVICE",
                  maxVolunteers: params.maxVolunteers || 5,
                  contactEmail: params.contactEmail || user.email,
                  requiredSkills: params.requiredSkills ? JSON.stringify(params.requiredSkills) : "[]",
                  budgetRange: params.budgetRange,
                  ownerId: user.id,
                  timeline: {},
                },
              });

              return {
                content: [{ type: "text", text: `Project "${project.title}" created successfully! ID: ${project.id}` }],
              };
            }

            case "list": {
              const projects = await prisma.project.findMany({
                where: { ownerId: user.id },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  projectType: true,
                  helpType: true,
                  maxVolunteers: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
              });

              const projectList = projects.map(p => 
                `• ${p.title} (${p.id}) - ${p.projectType} - ${p.helpType}`
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

              const skills = JSON.parse((project.requiredSkills as string) || "[]");
              
              return {
                content: [{ 
                  type: "text", 
                  text: `Project: ${project.title}\nDescription: ${project.description}\nType: ${project.projectType}\nHelp Type: ${project.helpType}\nMax Volunteers: ${project.maxVolunteers}\nRequired Skills: ${skills.join(", ")}` 
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
              if (params.title) updateData.title = params.title;
              if (params.description) updateData.description = params.description;
              if (params.projectType) updateData.projectType = params.projectType;
              if (params.helpType) updateData.helpType = params.helpType;
              if (params.maxVolunteers) updateData.maxVolunteers = params.maxVolunteers;
              if (params.contactEmail) updateData.contactEmail = params.contactEmail;
              if (params.requiredSkills) updateData.requiredSkills = JSON.stringify(params.requiredSkills);
              if (params.budgetRange !== undefined) updateData.budgetRange = params.budgetRange;

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