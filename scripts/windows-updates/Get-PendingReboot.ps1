#Requires -Version 5.1
<#
.SYNOPSIS
    Checks whether the local computer is waiting for a reboot.

.DESCRIPTION
    Windows does not store "a reboot is pending" in one single place.
    Get-PendingReboot checks the well-known locations and reports which of
    them signal a pending reboot:

      - Component Based Servicing (CBS)
      - Windows Update
      - Pending file rename operations
      - Pending computer rename
      - Pending domain join
      - Configuration Manager client (only if installed)

    The script only reads the registry and WMI.

.PARAMETER Quiet
    Return only $true or $false. Useful in if statements and other scripts.

.EXAMPLE
    .\Get-PendingReboot.ps1

    Shows all checks and the overall result.

.EXAMPLE
    if (.\Get-PendingReboot.ps1 -Quiet) { Write-Warning 'Reboot pending' }

.NOTES
    Name:     Get-PendingReboot
    Category: Windows Updates
    Type:     Read-Only

    PendingFileRenameOperations is also used by some installers for
    harmless clean-up tasks, so this check alone can be a false positive.
#>
[CmdletBinding()]
param(
    [switch]$Quiet
)

function Test-RegistryValue {
    param(
        [string]$Path,
        [string]$Name
    )

    try {
        $value = (Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction Stop).$Name
        return [bool]($value | Where-Object { $_ })
    }
    catch {
        return $false
    }
}

function Get-RegistryValue {
    param(
        [string]$Path,
        [string]$Name
    )

    try {
        return (Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction Stop).$Name
    }
    catch {
        return $null
    }
}

$cbsKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing'
$wuKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update'
$sessionManager = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
$netlogon = 'HKLM:\SYSTEM\CurrentControlSet\Services\Netlogon'

# --- Component Based Servicing ------------------------------------------------
$componentBasedServicing = (Test-Path -LiteralPath "$cbsKey\RebootPending") -or
    (Test-Path -LiteralPath "$cbsKey\RebootInProgress") -or
    (Test-Path -LiteralPath "$cbsKey\PackagesPending")

# --- Windows Update -----------------------------------------------------------
$windowsUpdate = (Test-Path -LiteralPath "$wuKey\RebootRequired") -or
    (Test-Path -LiteralPath "$wuKey\PostRebootReporting")

# --- Pending file rename operations -------------------------------------------
$fileRename = (Test-RegistryValue -Path $sessionManager -Name 'PendingFileRenameOperations') -or
    (Test-RegistryValue -Path $sessionManager -Name 'PendingFileRenameOperations2')

# --- Pending computer rename --------------------------------------------------
$activeName = Get-RegistryValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\ComputerName\ActiveComputerName' -Name 'ComputerName'
$newName = Get-RegistryValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName' -Name 'ComputerName'
$computerRename = [bool]($activeName -and $newName -and ($activeName -ne $newName))

# --- Pending domain join ------------------------------------------------------
$domainJoin = (Test-RegistryValue -Path $netlogon -Name 'JoinDomain') -or
    (Test-RegistryValue -Path $netlogon -Name 'AvoidSpnSet')

# --- Configuration Manager client (optional) ----------------------------------
$configMgr = $null
try {
    $ccm = Invoke-CimMethod -Namespace 'root\ccm\ClientSDK' -ClassName 'CCM_ClientUtilities' `
        -MethodName 'DetermineIfRebootPending' -ErrorAction Stop
    $configMgr = [bool]($ccm.RebootPending -or $ccm.IsHardRebootPending)
}
catch {
    Write-Verbose 'Configuration Manager client not found. Check skipped.'
}

# --- Result -------------------------------------------------------------------
$checks = [ordered]@{
    ComponentBasedServicing = $componentBasedServicing
    WindowsUpdate           = $windowsUpdate
    PendingFileRename       = $fileRename
    PendingComputerRename   = $computerRename
    PendingDomainJoin       = $domainJoin
    ConfigMgrClient         = $configMgr
}

$reasons = @($checks.Keys | Where-Object { $checks[$_] -eq $true })
$rebootPending = $reasons.Count -gt 0

if ($Quiet) {
    return $rebootPending
}

$output = [ordered]@{
    ComputerName  = $env:COMPUTERNAME
    RebootPending = $rebootPending
    Reasons       = $reasons -join ', '
}
foreach ($key in $checks.Keys) {
    $output[$key] = $checks[$key]
}

[pscustomobject]$output
