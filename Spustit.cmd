@echo off
setlocal
cd /d "%~dp0"

rem Bez diakritiky zamerne: cmd.exe cte davkovy soubor v kodove strance konzole,
rem ktera se lisi podle nastaveni systemu, a diakritika by se rozsypala.

set "APP=release\win-unpacked\Pravidla hokeje.exe"

rem V nekterych prostredich je nastavena promenna, kvuli ktere se Electron spusti
rem jako holy Node a okno se vubec neotevre.
set "ELECTRON_RUN_AS_NODE="

if exist "%APP%" goto spustit

echo Aplikace jeste neni sestavena, pripravuji ji. Chvili to potrva.
echo.

if exist "node_modules\" goto sestavit
echo [1/2] Instaluji zavislosti...
call npm install
if errorlevel 1 goto chyba
goto sestavit2

:sestavit
echo [1/2] Zavislosti jsou nainstalovane.

:sestavit2
echo [2/2] Sestavuji aplikaci...
call npm run build:dir
if errorlevel 1 goto chyba

if not exist "%APP%" (
    echo.
    echo Sestaveni probehlo, ale soubor "%APP%" nevznikl.
    goto chyba
)

echo.
echo Hotovo. Priste se aplikace spusti rovnou.
echo.

:spustit
start "" "%APP%"
exit /b 0

:chyba
echo.
echo Neco se nepovedlo - vypis chyby je vyse.
echo.
pause
exit /b 1
