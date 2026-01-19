// PM2 Ecosystem Configuration for DRIVERHIRE Backend
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'driverhire-backend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1, // Use 'max' for cluster mode on multi-core VPS
      exec_mode: 'fork', // Change to 'cluster' for multi-instance
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
