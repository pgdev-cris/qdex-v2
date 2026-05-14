module.exports = {
    apps: [
        {
            name: 'qdex-backend',
            script: 'dist/index.js',
            cwd: './backend',

            // Instances & mode
            instances: 1,
            exec_mode: 'fork',

            // Env – production values; sensitive vars should come from a .env file
            env_production: {
                NODE_ENV: 'production',
            },

            // Restart policy
            autorestart: true,
            watch: false,
            max_restarts: 10,
            restart_delay: 3000,       // ms between restarts
            min_uptime: '10s',         // must stay up 10 s to count as a stable start

            // Logging (paths relative to cwd)
            out_file: '../logs/backend-out.log',
            error_file: '../logs/backend-err.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',

            // Windows compatibility — use message-based graceful shutdown
            // PM2 sends process.send('shutdown') before killing
            shutdown_with_message: true,
            kill_timeout: 15000,        // 15s: enough for POS calls (10s timeout) to finish
        },
    ],
};
