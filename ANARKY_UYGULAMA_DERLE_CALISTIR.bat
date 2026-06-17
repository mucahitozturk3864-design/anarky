@echo off
setlocal
cd /d "%~dp0"

echo =========================================
echo   ANARKY DAW - C Uygulama Derle/Calistir
echo =========================================
echo.

where gcc >nul 2>nul
if errorlevel 1 (
    echo HATA: gcc bulunamadi.
    echo MSYS2 / MinGW gcc kurulu olmali ya da PATH icinde olmali.
    pause
    exit /b 1
)

echo C uygulamasi derleniyor...
gcc -Wall -Wextra -O2 app_core\anarky_app.c -o ANARKY_DAW_APP.exe -lws2_32 -mwindows
if errorlevel 1 (
    echo.
    echo Derleme basarisiz oldu.
    pause
    exit /b 1
)

echo.
echo Uygulama baslatiliyor...
echo.
start "" "%~dp0ANARKY_DAW_APP.exe"

endlocal
