@echo off
echo Restarting SDOF Knowledge Base Service with OpenAI Configuration...

echo.
echo Killing any existing Node.js processes on port 3001...
netstat -ano | findstr :3001 > nul
if %errorlevel% == 0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :3001') do (
        echo Killing process %%i
        taskkill /PID %%i /F 2>nul
    )
)

echo.
echo Installing dependencies (if needed)...
cd /d "%~dp0"
npm install

echo.
echo Building TypeScript...
npm run build

echo.
echo Waiting 3 seconds for cleanup...
timeout /t 3 /nobreak > nul

echo.
echo Starting both HTTP API and MCP servers...
set HTTP_PORT=3001
set EMBEDDING_SERVICE=openai
npm run start

pause