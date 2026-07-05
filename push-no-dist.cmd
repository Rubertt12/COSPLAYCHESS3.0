@echo off
setlocal
cd /d "%~dp0"

git add .
git rm -r --cached --ignore-unmatch dist >nul 2>&1
git commit -m "Update project" >nul 2>&1
if errorlevel 1 (
  echo Nothing to commit or commit failed.
) else (
  echo Commit created successfully.
)

git push origin HEAD

exit /b %errorlevel%
