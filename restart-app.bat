@echo off
echo Stopping Node.js processes...
taskkill /F /IM node.exe

echo Starting Backend...
start cmd /k "cd backend && npm start"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! application restarted.
