@echo off
chcp 65001 > nul
echo ==============================================
echo   Démarrage Bases de Données Commerce
echo ==============================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ATTENTION: Ce script nécessite des droits administrateur
    echo Veuillez exécuter en tant qu'administrateur!
    echo.
    echo Comment faire :
    echo 1. Clic droit sur ce fichier
    echo 2. "Exécuter en tant qu'administrateur"
    echo 3. Cliquer "Oui"
    pause
    exit /b 1
)

REM --- POSTGRESQL ---
echo [1/2] Vérification PostgreSQL...
sc query postgresql-x64-16 | find "RUNNING" > nul
if %errorlevel% equ 0 (
    echo    ✅ PostgreSQL est déjà démarré
    set POSTGRES_STARTED=false
) else (
    echo    ⏳ Démarrage de PostgreSQL...
    net start postgresql-x64-16
    if %errorlevel% equ 0 (
        echo    ✅ PostgreSQL démarré avec succès
        set POSTGRES_STARTED=true
    ) else (
        echo    ❌ ERREUR: Impossible de démarrer PostgreSQL
        echo    Essayez manuellement : services.msc
        pause
        exit /b 1
    )
    timeout /t 3 /nobreak >nul
)

REM --- REDIS ---
echo [2/2] Vérification Redis...
tasklist | findstr redis-server.exe > nul
if %errorlevel% equ 0 (
    echo    ✅ Redis est déjà démarré
    set REDIS_STARTED=false
) else (
    echo    ⏳ Démarrage de Redis...
    if exist "C:\Program Files\Redis\redis-server.exe" (
        start "" /B "C:\Program Files\Redis\redis-server.exe"
        timeout /t 2 /nobreak >nul
        echo    ✅ Redis démarré avec succès
        set REDIS_STARTED=true
    ) else (
        echo    ⚠ Redis non trouvé à l'emplacement par défaut
        echo    Démarrage avec chemin alternatif...
        where redis-server.exe >nul 2>&1
        if %errorlevel% equ 0 (
            redis-server.exe --service-start
            echo    ✅ Redis démarré
            set REDIS_STARTED=true
        ) else (
            echo    ❌ ERREUR: Redis non trouvé
            echo    Installez Redis ou ajustez le chemin
        )
    )
)

REM --- TESTS DE CONNEXION ---
echo.
echo ==============================================
echo   Tests de Connexion
echo ==============================================

echo Test PostgreSQL...
"C:\Program Files\PostgreSQL\16\bin\pg_isready.exe" -h localhost -p 5432
if %errorlevel% equ 0 (
    echo    ✅ PostgreSQL répond sur localhost:5432
) else (
    echo    ⚠ PostgreSQL installé mais ne répond pas
)

echo Test Redis...
echo ping | "C:\Program Files\Redis\redis-cli.exe" | find "PONG" > nul
if %errorlevel% equ 0 (
    echo    ✅ Redis répond sur localhost:6379
) else (
    echo ping | redis-cli | find "PONG" > nul
    if %errorlevel% equ 0 (
        echo    ✅ Redis répond (via chemin PATH)
    ) else (
        echo    ⚠ Redis installé mais ne répond pas
    )
)

REM --- INFORMATIONS DE CONNEXION ---
echo.
echo ==============================================
echo   Informations de Connexion
echo ==============================================
echo PostgreSQL:
echo   Hôte: localhost
echo   Port: 5432
echo   Base: commerce_db
echo   Utilisateur: postgres
echo   Mot de passe: password
echo.
echo Redis:
echo   Hôte: localhost
echo   Port: 6379
echo.
echo ==============================================
echo   ✅ Bases de données prêtes!
echo ==============================================
echo.
echo Pour arrêter les bases de données:
echo 1. Exécutez 'stop-databases.bat'
echo 2. Ou ouvrez services.msc
echo.
echo Pour démarrer l'application Spring Boot:
echo 1. Ouvrez IntelliJ
echo 2. Lancez CommerceApplication.java
echo.
echo Cette fenêtre peut être fermée.
echo Les bases de données continuent de tourner en arrière-plan.
pause