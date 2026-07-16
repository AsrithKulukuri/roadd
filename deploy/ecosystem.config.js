module.exports = {
  apps: [
    {
      name: 'road-web',
      script: 'server.js', // Next.js standalone server
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enables clustering
      autorestart: true, // Auto-restart if app crashes
      watch: false, // Do not watch in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Add Supabase and other env variables here
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      }
    }
  ]
};
