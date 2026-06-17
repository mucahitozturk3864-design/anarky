@echo off
cd /d "%~dp0"

if not exist ANARKY_DAW_APP.exe (
    call ANARKY_UYGULAMA_DERLE_CALISTIR.bat
    exit /b %errorlevel%
)

ANARKY_DAW_APP.exe
