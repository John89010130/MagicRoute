@echo off
title MagicRoute - Inicializador Completo
echo ==================================================
echo   Iniciando Servicos do MagicRoute...
echo ==================================================

:: 1. Iniciar o Back-end (API)
echo [1/3] Iniciando API Back-end (Porta 3001)...
start cmd /k "cd magicroute-api && npm run dev"

:: 2. Iniciar o Front-end (Web)
echo [2/3] Iniciando Aplicacao Web (Porta 5173)...
start cmd /k "cd magicroute-web && npm run dev"

:: 3. Iniciar o Tunel da Cloudflare
echo [3/3] Iniciando Tunel da Cloudflare para a API (Porta 3001)...
start "Cloudflare Tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --url http://localhost:3001 magicroute-api"

echo ==================================================
echo   Todos os servicos foram iniciados!
echo   Acompanhe os logs e o link do tunel nas novas telas.
echo ==================================================
pause
