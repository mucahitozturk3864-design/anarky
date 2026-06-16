@echo off
echo =====================================
echo   ANARKY DAW - Server Baslatiliyor
echo =====================================
echo.
echo Server baslatiliyor: http://localhost:8080
echo Tarayici aciliyor...
echo.
echo Durdurmak icin bu pencereyi kapat.
echo.
start "" "http://localhost:8080"
python -m http.server 8080
