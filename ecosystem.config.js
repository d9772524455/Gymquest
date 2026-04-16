module.exports = {
  apps: [{
    name: "gymquest",
    script: "server/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    max_memory_restart: "256M",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "/var/log/gymquest/error.log",
    out_file: "/var/log/gymquest/out.log",
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }],
};
