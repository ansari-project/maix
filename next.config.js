const { withAxiom } = require('next-axiom');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  serverExternalPackages: ['pino', 'pino-pretty', '@axiomhq/pino', 'thread-stream'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Add externals for Pino transport to work properly in production
    if (isServer) {
      config.externals.push({
        'pino': 'pino',
        'pino-pretty': 'pino-pretty',
        '@axiomhq/pino': '@axiomhq/pino',
        'thread-stream': 'commonjs thread-stream',
        'pino-worker': 'pino-worker',
        'pino-file': 'pino-file'
      });
    }
    
    return config;
  },
};

// Wrap with Axiom for automatic instrumentation
module.exports = withAxiom(nextConfig);