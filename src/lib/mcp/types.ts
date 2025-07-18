import type { User } from '@prisma/client';

/**
 * Defines the shape of the context object that is created by the
 * `authenticate` function and passed to all tool handlers.
 */
export type MaixMcpContext = {
  user: User;
};

/**
 * Configuration for MCP tools
 */
export type MaixMcpConfig = {
  name: string;
  version: string;
  description?: string;
};

/**
 * Standard response format for MCP tools
 */
export type MaixMcpResponse = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};