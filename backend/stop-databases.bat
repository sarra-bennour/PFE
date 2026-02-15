@echo off
chcp 65001 > nul
echo ==============================================
echo   Arrêt Bases de Données Commerce
echo ==============================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ATTENTION: Ce script nécessite des droits administrateur
    echo Veuillez exécuter en tant qu'administrateur!
    pause
    exit /b 1
)

REM --- ARRÊTER REDIS ---
echo [1/2] Arrêt de Redis...
tasklist | findstr redis-server.exe > nul
if %errorlevel% equ 0 (
    echo    ⏳ Arrêt de Redis...
    taskkill /F /IM redis-server.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ Redis arrêté
    ) else (
        echo    ⚠ Impossible d'arrêter Redis (peut-être un service?)
        sc stop Redis >nul 2>&1
    )
) else (
    echo    ℹ Redis n'est pas en cours d'exécution
)

REM --- ARRÊTER POSTGRESQL ---
echo [2/2] Arrêt de PostgreSQL...
sc query postgresql-x64-16 | find "RUNNING" > nul
if %errorlevel% equ 0 (
    echo    ⏳ Arrêt de PostgreSQL...
    net stop postgresql-x64-16
    if %errorlevel% equ 0 (
        echo    ✅ PostgreSQL arrêté
    ) else (
        echo    ❌ ERREUR: Impossible d'arrêter PostgreSQL
        echo    Essayez manuellement : services.msc
    )
) else (
    echo    ℹ PostgreSQL n'est pas en cours d'exécution
)

echo.
echo ==============================================
echo   ✅ Toutes les bases de données sont arrêtées
echo ==============================================
echo.
echo Pour redémarrer, exécutez 'start-databases.bat'
pause