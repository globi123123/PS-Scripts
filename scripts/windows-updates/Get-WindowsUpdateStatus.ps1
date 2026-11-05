#Requires -Version 5.1
<#
.SYNOPSIS
    Shows the current Windows Update status of the local computer.

.DESCRIPTION
    Get-WindowsUpdateStatus collects the most important Windows Update
    information in a single object:

      - state and start type of the Windows Update service (wuauserv)
      - date of the last successful search and installation
      - number of pending updates, split by severity and type
      - whether Windows Update is waiting for a reboot

    The script only reads information. It does not download, install or
    hide any update.

.PARAMETER UseCache
    Search the local update cache instead of contacting Windows Update or
    WSUS. This is much faster, but the result is only as current as the
    last scan.

.PARAMETER IncludeUpdates
    Adds an "Updates" property with the list of pending updates
    (title, KB number, severity, type, size).

.EXAMPLE
    .\Get-WindowsUpdateStatus.ps1

    Shows the update status of the local computer.

.EXAMPLE
    .\Get-WindowsUpdateStatus.ps1 -UseCache -IncludeUpdates |
        Select-Object -ExpandProperty Updates

    Lists all pending updates from the local cache.

.NOTES
    Name:     Get-WindowsUpdateStatus
    Category: Windows Updates
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [switch]$UseCache,

    [switch]$IncludeUpdates
)

$ErrorActionPreference = 'Stop'

function ConvertTo-LocalDate {
    param($Value)

    # The Windows Update API reports dates in UTC and returns an empty or
    # very old date when an operation has never completed.
    if ($Value -is [datetime] -and $Value.Year -gt 1970) {
        return $Value.ToLocalTime()
    }
    return $null
}

# --- Windows Update service ---------------------------------------------------
$service = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue

# --- Last successful search and installation ----------------------------------
$lastSearch = $null
$lastInstall = $null
try {
    $autoUpdate = New-Object -ComObject 'Microsoft.Update.AutoUpdate'
    $lastSearch = ConvertTo-LocalDate $autoUpdate.Results.LastSearchSuccessDate
    $lastInstall = ConvertTo-LocalDate $autoUpdate.Results.LastInstallationSuccessDate
}
catch {
    Write-Verbose "Could not read the automatic update results: $($_.Exception.Message)"
}

# --- Reboot state -------------------------------------------------------------
$rebootRequired = $false
try {
    $systemInfo = New-Object -ComObject 'Microsoft.Update.SystemInfo'
    $rebootRequired = [bool]$systemInfo.RebootRequired
}
catch {
    Write-Verbose "Could not read the reboot state: $($_.Exception.Message)"
}

# --- Pending updates ----------------------------------------------------------
$pending = @()
$searchError = $null
try {
    $session = New-Object -ComObject 'Microsoft.Update.Session'
    $searcher = $session.CreateUpdateSearcher()
    $searcher.Online = -not $UseCache

    Write-Verbose 'Searching for pending updates. This can take a moment...'
    $result = $searcher.Search('IsInstalled=0 and IsHidden=0')

    $pending = @(foreach ($update in $result.Updates) {
        $kbNumbers = @($update.KBArticleIDs | ForEach-Object { "KB$_" })

        [pscustomobject]@{
            Title        = $update.Title
            KB           = $kbNumbers -join ', '
            Severity     = if ($update.MsrcSeverity) { $update.MsrcSeverity } else { 'Unspecified' }
            Type         = if ($update.Type -eq 2) { 'Driver' } else { 'Software' }
            SizeMB       = [math]::Round($update.MaxDownloadSize / 1MB, 1)
            IsDownloaded = [bool]$update.IsDownloaded
            MayReboot    = $update.InstallationBehavior.RebootBehavior -ne 0
        }
    })
}
catch {
    $searchError = $_.Exception.Message
    Write-Warning "The update search failed: $searchError"
}

# --- Result -------------------------------------------------------------------
$status = [pscustomobject]@{
    ComputerName            = $env:COMPUTERNAME
    ServiceStatus           = if ($service) { [string]$service.Status } else { 'NotFound' }
    ServiceStartType        = if ($service) { [string]$service.StartType } else { $null }
    LastSearchSuccess       = $lastSearch
    LastInstallationSuccess = $lastInstall
    PendingUpdates          = $pending.Count
    PendingCritical         = @($pending | Where-Object { $_.Severity -eq 'Critical' }).Count
    PendingImportant        = @($pending | Where-Object { $_.Severity -eq 'Important' }).Count
    PendingDrivers          = @($pending | Where-Object { $_.Type -eq 'Driver' }).Count
    RebootRequired          = $rebootRequired
    SearchSource            = if ($UseCache) { 'Local cache' } else { 'Online' }
    SearchError             = $searchError
}

if ($IncludeUpdates) {
    $status | Add-Member -NotePropertyName 'Updates' -NotePropertyValue $pending
}

$status
