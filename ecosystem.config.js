module.exports = {
  apps: [
    // Backend API
    {
      name: 'hrms-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      // Exponential backoff so a slow MySQL start can't exhaust restarts
      // and leave the app permanently errored after a reboot
      exp_backoff_restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '10s',
      max_memory_restart: '500M'
    },
    // Frontend (Production Build)
    {
      name: 'hrms-frontend',
      cwd: './frontend',
      script: 'serve-prod.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        PORT: 8000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      exp_backoff_restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '10s',
      max_memory_restart: '300M'
    },
    // Cloudflare Tunnel for hr.protecther.in
    {
      name: 'hrms-tunnel',
      script: 'cloudflared',
      args: 'tunnel --config C:\\Users\\PC-09\\.cloudflared\\config.yml run protecther-tunnel',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      error_file: './logs/tunnel-error.log',
      out_file: './logs/tunnel-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      exp_backoff_restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '10s'
    }
  ]
};
