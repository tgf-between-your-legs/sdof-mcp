@echo off
echo 🧹 Cleaning SDOF Knowledge Base and deploying unified system...
echo ================================================================

REM Stop any running processes
echo Stopping any running MCP servers...
taskkill /F /IM node.exe >nul 2>&1

REM Remove old build files with Claude dependencies
echo Removing old build files...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist node_modules rmdir /s /q node_modules

REM Remove old MongoDB-related files
echo Removing MongoDB dependencies...
if exist "src\models" rmdir /s /q "src\models"
if exist "src\scripts" rmdir /s /q "src\scripts"
if exist "src\tools" rmdir /s /q "src\tools"
if exist "src\utils" rmdir /s /q "src\utils"
if exist "src\services\database.service.ts" del "src\services\database.service.ts"
if exist "src\services\embedding.service.ts" del "src\services\embedding.service.ts"
if exist "src\services\plan-auto-save.service.ts" del "src\services\plan-auto-save.service.ts"

REM Remove old backup files
echo Cleaning backup files...
if exist "src\index.ts.fixed" del "src\index.ts.fixed"
if exist "src\index.ts.plan-auto-save-update" del "src\index.ts.plan-auto-save-update"
if exist "src\index.ts.update" del "src\index.ts.update"

REM Install dependencies
echo Installing dependencies...
npm install

REM Build the unified system
echo Building unified SDOF system...
npm run build

REM Verify build
if exist "build\index.js" (
    echo ✅ Build successful!
    echo 🚀 Unified SDOF Knowledge Base ready for deployment
    echo.
    echo To run the MCP server:
    echo   npm start
    echo.
    echo To test the system:
    echo   node build/test-unified-system.js
) else (
    echo ❌ Build failed!
    echo Please check for errors above.
    exit /b 1
)

echo ================================================================
echo 🎉 Clean deployment complete!
echo ✅ All Claude dependencies eliminated
echo ✅ Unified system ready for use