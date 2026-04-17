@echo off
:: Wait for WAMP/MySQL to be ready
timeout /t 15 /nobreak

cd /d C:\path\to\qdex-v2
call pm2 start ecosystem.config.js