@echo off
setlocal enabledelayedexpansion
echo Setting up RunJumpSki development environment...

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js v16 or higher.
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
    set NODE_MAJOR=!NODE_MAJOR:~1!
)
if !NODE_MAJOR! LSS 16 (
    echo Node.js version 16 or higher is required. Current version: !NODE_MAJOR!
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm install

REM Create additional required directories if they don't exist
if not exist tests\__mocks__ mkdir tests\__mocks__
if not exist public\maps mkdir public\maps
if not exist public\models mkdir public\models
if not exist public\textures mkdir public\textures
if not exist public\sounds mkdir public\sounds
if not exist public\shaders mkdir public\shaders

REM Setup Git hooks
echo Setting up Git hooks...
npx husky install || (
    echo Installing Husky...
    npm install husky --save-dev
    npx husky install
    npx husky add .husky/pre-commit "npx lint-staged"
    echo module.exports = { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] } > .lintstagedrc.js
)

REM Run initial lint
echo Running initial TypeScript check...
npx tsc --noEmit

REM Success message
echo.
echo RunJumpSki development environment setup complete!
echo.
echo Available commands:
echo - npm run dev      : Start development server
echo - npm run build    : Build for production
echo - npm run test     : Run tests
echo - npm run lint     : Run ESLint
echo - npm run format   : Format code with Prettier
echo - npm run deploy   : Deploy to Cloudflare
echo.
echo Happy coding!

endlocal