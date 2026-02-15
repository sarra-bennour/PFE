@echo off
echo ===================================
echo   Démarrage Commerce Tunisie
echo ===================================
echo.

REM Vérifier si PostgreSQL est en cours d'exécution
echo Vérification de PostgreSQL...
sc query postgresql-x64-16 | find "RUNNING" > nul
if %errorlevel% equ 0 (
    echo PostgreSQL est deja demarre
) else (
    echo Demarrage de PostgreSQL...
    net start postgresql-x64-16
    timeout /t 5 /nobreak
)

REM Vérifier si Redis est en cours d'exécution
echo Vérification de Redis...
tasklist | findstr redis-server.exe > nul
if %errorlevel% equ 0 (
    echo Redis est deja demarre
) else (
    echo Demarrage de Redis...
    start "" /B "C:\Program Files\Redis\redis-server.exe"
    timeout /t 3 /nobreak
)

REM Attendre que les services soient prêts
echo Attente que les services soient prets...
timeout /t 5 /nobreak

REM Tester la connexion PostgreSQL
echo Test connexion PostgreSQL...
"C:\Program Files\PostgreSQL\16\bin\pg_isready.exe" -h localhost -p 5432
if %errorlevel% neq 0 (
    echo ERREUR: PostgreSQL ne repond pas
    pause
    exit /b 1
)

REM Tester la connexion Redis
echo Test connexion Redis...
echo ping | "C:\Program Files\Redis\redis-cli.exe" | find "PONG" > nul
if %errorlevel% neq 0 (
    echo ERREUR: Redis ne repond pas
    pause
    exit /b 1
)

echo.
echo ✅ Tous les services sont prets!
echo.

REM Démarrer l'application Spring Boot
echo ===================================
echo   Demarrage de l'application Spring Boot
echo ===================================
echo.

REM Naviguer vers le dossier backend si nécessaire
cd /d %~dp0

REM Démarrer Maven
call mvnw spring-boot:run

REM Si l'application s'arrête, arrêter aussi les services
echo.
echo ===================================
echo   Arret des services
echo ===================================
echo Arret de Redis...
taskkill /F /IM redis-server.exe 2>nul
echo Arret de PostgreSQL...
net stop postgresql-x64-16
echo.
echo Tous les services sont arretes.
pause