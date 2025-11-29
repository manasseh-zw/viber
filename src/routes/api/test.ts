import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/test')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          message: 'API route is working!',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || '3000',
        })
      },
    },
  },
})
