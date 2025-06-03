@echo off
echo SDOF Knowledge Base Embedding Service Fix Script
echo ================================================

echo.
echo Step 1: Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Step 2: Clearing system environment variable...
set EMBEDDING_SERVICE=

echo.
echo Step 3: Setting explicit environment variables...
set EMBEDDING_SERVICE=openai
set FORCE_EMBEDDING_SERVICE=openai
set DEBUG_EMBEDDING_SERVICE=true

echo.
echo Step 4: Rebuilding service...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 5: Starting service with OpenAI configuration...
echo Service will start with explicit OpenAI embedding configuration
echo Press Ctrl+C to stop the service
echo.

node build/index.js

pause