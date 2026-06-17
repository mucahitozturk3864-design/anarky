@echo off
cd /d "%~dp0"

if not exist ANARKY_DAW_APP.exe (
    echo ANARKY_DAW_APP.exe bulunamadi.
    echo Once ANARKY_UYGULAMA_DERLE_CALISTIR.bat dosyasini calistir.
    pause
    exit /b 1
)

echo ANARKY DAW C uygulamasi aciliyor...
echo Uygulama ayri masaustu penceresi olarak acilacak.
echo.
start "" "%~dp0ANARKY_DAW_APP.exe"
