#Requires -Version 5.1
<#
.SYNOPSIS
  Instala una seleccion profesional de plugins y skills para Claude Code
  orientada a desarrollo full stack.

.DESCRIPTION
  - Verifica Node.js, npm, Git y Claude Code.
  - Crea un respaldo de la configuracion de Claude.
  - Registra los marketplaces oficiales y el comunitario.
  - Instala los plugins/skills seleccionados delegando la validacion de nombres
    al propio CLI de Claude (cada instalacion es tolerante a fallos, de modo que
    un plugin inexistente o ya instalado no detiene el proceso).
  - Puede ejecutarse varias veces de forma idempotente.

  Nota de diseno: versiones anteriores descargaban los marketplace.json por HTTP
  para validar nombres antes de instalar. Se elimino ese paso porque
  raw.githubusercontent.com sirve el JSON como 'text/plain' (Invoke-RestMethod no
  lo parsea) y porque ConvertFrom-Json de PowerShell 5.1 es case-insensitive y
  falla con el catalogo oficial (claves que solo difieren en mayusculas, p. ej.
  el bloque 'renames'). 'claude plugin install' ya valida el nombre por si mismo.

.EXAMPLE
  .\import.claude.ps1

.EXAMPLE
  .\import.claude.ps1 -Scope project

.EXAMPLE
  .\import.claude.ps1 -Minimal -SkipCommunity
#>

[CmdletBinding()]
param(
    [ValidateSet('user', 'project', 'local')]
    [string]$Scope = 'user',

    [switch]$Minimal,
    [switch]$SkipCommunity,
    [switch]$SkipIntegrations,
    [switch]$SkipLspDependencies
)

# Nivel 1.0: protege contra variables no inicializadas (errores de tipeo) sin
# lanzar excepciones al leer propiedades ausentes de objetos externos.
Set-StrictMode -Version 1.0
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -le 5) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

$script:Installed = [System.Collections.Generic.List[string]]::new()
$script:Skipped   = [System.Collections.Generic.List[string]]::new()
$script:Failed    = [System.Collections.Generic.List[string]]::new()

# Nombres canonicos de los marketplaces (los declara cada marketplace.json).
$MarketOfficial  = 'claude-plugins-official'
$MarketSkills    = 'anthropic-agent-skills'
$MarketFullStack = 'fullstack-dev-skills'

# Fuentes GitHub de cada marketplace.
$SourceOfficial  = 'anthropics/claude-plugins-official'
$SourceSkills    = 'anthropics/skills'
$SourceFullStack = 'jeffallan/claude-skills'

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)
    Write-Host ''
    Write-Host ('=' * 72) -ForegroundColor DarkCyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host ('=' * 72) -ForegroundColor DarkCyan
}

function Test-Command {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$Description,
        [switch]$AllowFailure
    )

    Write-Host "`n>> $Description" -ForegroundColor Yellow

    # PowerShell 5.1 envuelve cada linea de stderr de un ejecutable nativo en un
    # ErrorRecord. Con $ErrorActionPreference = 'Stop' (definido globalmente) eso
    # se convierte en una excepcion de terminacion que aborta todo el script en
    # cuanto 'claude' escribe cualquier aviso en stderr. Bajamos la preferencia a
    # 'Continue' de forma local y convertimos cada objeto a texto plano para que
    # el stderr nunca detenga la ejecucion; el exito se decide por $LASTEXITCODE.
    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() })
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousEap
    }
    if ($null -eq $exitCode) { $exitCode = 0 }

    foreach ($line in $output) {
        Write-Host $line
    }

    if ($exitCode -eq 0) {
        return [pscustomobject]@{
            Success  = $true
            ExitCode = 0
            Output   = ($output -join "`n")
        }
    }

    $text = $output -join "`n"
    $alreadyConfigured = $text -match '(?i)already (installed|added|exists|configured|enabled)'

    if ($alreadyConfigured) {
        Write-Host 'Ya estaba configurado; se continua.' -ForegroundColor DarkYellow
        return [pscustomobject]@{
            Success  = $true
            ExitCode = $exitCode
            Output   = $text
        }
    }

    if ($AllowFailure) {
        Write-Warning "$Description fallo con codigo $exitCode. Se continuara."
        return [pscustomobject]@{
            Success  = $false
            ExitCode = $exitCode
            Output   = $text
        }
    }

    throw "$Description fallo con codigo $exitCode.`n$text"
}

function Ensure-Marketplace {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$MarketplaceName
    )

    $addResult = Invoke-NativeCommand `
        -Executable 'claude' `
        -Arguments @('plugin', 'marketplace', 'add', $Source, '--scope', $Scope) `
        -Description "Registrar marketplace $MarketplaceName" `
        -AllowFailure

    $updateResult = Invoke-NativeCommand `
        -Executable 'claude' `
        -Arguments @('plugin', 'marketplace', 'update', $MarketplaceName) `
        -Description "Actualizar marketplace $MarketplaceName" `
        -AllowFailure

    if (-not $addResult.Success -and -not $updateResult.Success) {
        throw "No fue posible registrar ni actualizar el marketplace '$MarketplaceName'."
    }
}

function Install-ClaudePlugin {
    param(
        [Parameter(Mandatory)][string]$PluginName,
        [Parameter(Mandatory)][string]$MarketplaceName
    )

    $identifier = "$PluginName@$MarketplaceName"

    # La instalacion siempre es tolerante a fallos: si el nombre no existe en el
    # marketplace, el CLI lo reporta y lo contamos como fallo sin abortar el resto.
    $result = Invoke-NativeCommand `
        -Executable 'claude' `
        -Arguments @('plugin', 'install', $identifier, '--scope', $Scope) `
        -Description "Instalar $identifier" `
        -AllowFailure

    if ($result.Success) {
        $script:Installed.Add($identifier)
    }
    else {
        $script:Failed.Add($identifier)
    }
}

function Backup-ClaudeSettings {
    $claudeHome = Join-Path $HOME '.claude'
    if (-not (Test-Path $claudeHome)) {
        return
    }

    $backupRoot = Join-Path $claudeHome 'backups'
    $backupPath = Join-Path $backupRoot (Get-Date -Format 'yyyyMMdd-HHmmss')
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

    $filesToBackup = @(
        (Join-Path $claudeHome 'settings.json'),
        (Join-Path $claudeHome 'settings.local.json')
    )

    foreach ($file in $filesToBackup) {
        if (Test-Path $file) {
            Copy-Item $file -Destination $backupPath -Force
        }
    }

    Write-Host "Respaldo creado en: $backupPath" -ForegroundColor Green
}

Write-Section 'INSTALADOR PROFESIONAL DE CLAUDE CODE PARA FULL STACK'

Write-Host "Ambito de instalacion: $Scope" -ForegroundColor Cyan
Write-Host "Modo minimo: $Minimal" -ForegroundColor Cyan
Write-Host "Omitir paquete comunitario: $SkipCommunity" -ForegroundColor Cyan

Write-Section '1. VERIFICACION DEL ENTORNO'

$requiredCommands = @('node', 'npm', 'git')
foreach ($command in $requiredCommands) {
    if (-not (Test-Command $command)) {
        throw "Falta el comando '$command'. Instalalo y vuelve a ejecutar el script."
    }
}

if (-not (Test-Command 'claude')) {
    Write-Host 'Claude Code no esta instalado. Instalando la version mas reciente...' -ForegroundColor Yellow
    $installClaude = Invoke-NativeCommand `
        -Executable 'npm' `
        -Arguments @('install', '--global', '@anthropic-ai/claude-code@latest') `
        -Description 'Instalar Claude Code'

    if (-not $installClaude.Success -or -not (Test-Command 'claude')) {
        throw "Claude Code se instalo, pero el comando 'claude' no aparece en PATH. Cierra y abre PowerShell y vuelve a ejecutar el script."
    }
}

Write-Host "Node.js:     $(& node --version)" -ForegroundColor Green
Write-Host "npm:         $(& npm --version)" -ForegroundColor Green
Write-Host "Git:         $(& git --version)" -ForegroundColor Green
Write-Host "Claude Code: $(& claude --version)" -ForegroundColor Green

Backup-ClaudeSettings

Invoke-NativeCommand `
    -Executable 'claude' `
    -Arguments @('doctor') `
    -Description 'Ejecutar diagnostico de Claude Code' `
    -AllowFailure | Out-Null

Write-Section '2. REGISTRO DE MARKETPLACES'

Ensure-Marketplace -Source $SourceOfficial -MarketplaceName $MarketOfficial
Ensure-Marketplace -Source $SourceSkills   -MarketplaceName $MarketSkills

if (-not $SkipCommunity) {
    Ensure-Marketplace -Source $SourceFullStack -MarketplaceName $MarketFullStack
}

Write-Section '3. DEPENDENCIAS DE INTELIGENCIA DE CODIGO'

if (-not $SkipLspDependencies) {
    $lspInstall = Invoke-NativeCommand `
        -Executable 'npm' `
        -Arguments @('install', '--global', 'typescript@latest', 'typescript-language-server@latest', 'pyright@latest') `
        -Description 'Instalar TypeScript Language Server y Pyright' `
        -AllowFailure

    if (-not $lspInstall.Success) {
        Write-Warning 'Los plugins LSP se instalaran, pero pueden permanecer inactivos hasta instalar sus binarios.'
    }
}
else {
    Write-Host 'Dependencias LSP omitidas por parametro.' -ForegroundColor DarkYellow
}

Write-Section '4. PLUGINS OFICIALES ESENCIALES'

$coreOfficialPlugins = @(
    'claude-code-setup',
    'claude-md-management',
    'feature-dev',
    'code-review',
    'code-simplifier',
    'frontend-design',
    'security-guidance',
    'skill-creator',
    'commit-commands',
    'typescript-lsp',
    'pyright-lsp'
)

foreach ($plugin in $coreOfficialPlugins) {
    Install-ClaudePlugin -PluginName $plugin -MarketplaceName $MarketOfficial
}

if (-not $Minimal -and -not $SkipIntegrations) {
    Write-Section '5. INTEGRACIONES RECOMENDADAS'

    $integrationPlugins = @(
        'context7',
        'playwright',
        'github'
    )

    foreach ($plugin in $integrationPlugins) {
        Install-ClaudePlugin -PluginName $plugin -MarketplaceName $MarketOfficial
    }
}
else {
    Write-Host 'Integraciones externas omitidas.' -ForegroundColor DarkYellow
}

Write-Section '6. SKILLS OFICIALES DE ANTHROPIC'

$anthropicSkillPlugins = if ($Minimal) {
    @('claude-api')
}
else {
    @('document-skills', 'example-skills', 'claude-api')
}

foreach ($plugin in $anthropicSkillPlugins) {
    Install-ClaudePlugin -PluginName $plugin -MarketplaceName $MarketSkills
}

if (-not $SkipCommunity) {
    Write-Section '7. PAQUETE FULL STACK COMUNITARIO'

    $fullStackPlugins = @(
        'fullstack-dev-skills'
    )

    foreach ($plugin in $fullStackPlugins) {
        Install-ClaudePlugin -PluginName $plugin -MarketplaceName $MarketFullStack
    }
}

Write-Section '8. VERIFICACION FINAL'

Invoke-NativeCommand `
    -Executable 'claude' `
    -Arguments @('plugin', 'marketplace', 'list') `
    -Description 'Mostrar marketplaces registrados' `
    -AllowFailure | Out-Null

Invoke-NativeCommand `
    -Executable 'claude' `
    -Arguments @('plugin', 'list') `
    -Description 'Mostrar plugins instalados' `
    -AllowFailure | Out-Null

Write-Section 'RESULTADO'

Write-Host "Instalados o ya presentes: $($script:Installed.Count)" -ForegroundColor Green
foreach ($item in $script:Installed) {
    Write-Host "  [OK] $item" -ForegroundColor Green
}

if ($script:Skipped.Count -gt 0) {
    Write-Host "`nOmitidos: $($script:Skipped.Count)" -ForegroundColor Yellow
    foreach ($item in $script:Skipped) {
        Write-Host "  [OMITIDO] $item" -ForegroundColor Yellow
    }
}

if ($script:Failed.Count -gt 0) {
    Write-Host "`nFallos: $($script:Failed.Count)" -ForegroundColor Red
    foreach ($item in $script:Failed) {
        Write-Host "  [FALLO] $item" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'Instalacion terminada.' -ForegroundColor Cyan
Write-Host 'Abre Claude Code con: claude' -ForegroundColor Cyan
Write-Host 'Dentro de Claude ejecuta: /plugin  (para revisar y activar)' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Notas:' -ForegroundColor Yellow
Write-Host '- GitHub puede solicitar autenticacion durante el primer uso.'
Write-Host '- Playwright puede descargar navegadores durante su primera ejecucion.'
Write-Host '- Los plugins de terceros tienen acceso al entorno de Claude Code; revisa sus permisos antes de usarlos en repositorios sensibles.'
