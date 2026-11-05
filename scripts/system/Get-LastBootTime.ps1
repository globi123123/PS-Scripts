#Requires -Version 5.1
<#
.SYNOPSIS
    Shows the last boot time, the boot type and the boot history.

.DESCRIPTION
    Get-LastBootTime answers two questions:

      - When did the computer start the last time, and was it a real
        (full) boot or a Fast Startup / resume from hibernation?
      - What happened before? With -Timeline the script lists startups,
        shutdowns, restarts and unexpected shutdowns of the last days
        from the System event log.

    This helps to explain why the uptime is higher than expected
    (Fast Startup) or to find unexpected reboots and who started a restart.

    The script only reads information.

.PARAMETER Timeline
    Return the startup and shutdown events instead of the summary.

.PARAMETER Days
    Number of days for the timeline. Default: 30.

.EXAMPLE
    .\Get-LastBootTime.ps1

.EXAMPLE
    .\Get-LastBootTime.ps1 -Timeline -Days 7 | Format-Table -AutoSize

.NOTES
    Name:     Get-LastBootTime
    Category: System
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [switch]$Timeline,

    [ValidateRange(1, 365)]
    [int]$Days = 30
)

if ($Timeline) {
    $eventNames = @{
        'Microsoft-Windows-Kernel-General|12' = 'Startup'
        'Microsoft-Windows-Kernel-General|13' = 'Shutdown'
        'User32|1074'                         = 'Shutdown initiated'
        'Microsoft-Windows-Kernel-Power|41'   = 'Unexpected shutdown'
    }

    $filter = @{
        LogName   = 'System'
        Id        = 12, 13, 41, 1074
        StartTime = (Get-Date).AddDays(-$Days)
    }

    $events = @(Get-WinEvent -FilterHashtable $filter -ErrorAction SilentlyContinue)

    foreach ($entry in $events) {
        $kind = $eventNames["$($entry.ProviderName)|$($entry.Id)"]
        if (-not $kind) { continue }

        $details = $null
        if ($entry.Id -eq 1074 -and $entry.Properties.Count -ge 7) {
            # 0 = process, 2 = reason, 4 = shutdown type, 6 = user
            $details = '{0} by {1} ({2}): {3}' -f $entry.Properties[4].Value,
                $entry.Properties[6].Value,
                (Split-Path -Path ($entry.Properties[0].Value -replace '\s*\(.*\)$') -Leaf),
                $entry.Properties[2].Value
        }

        [pscustomobject]@{
            Time    = $entry.TimeCreated
            Event   = $kind
            EventId = $entry.Id
            Details = $details
        }
    }
    return
}

# --- Summary --------------------------------------------------------------------
$os = Get-CimInstance -ClassName 'Win32_OperatingSystem'

# Kernel-Boot event 27 logs the boot type of every start:
# 0x0 = full boot, 0x1 = Fast Startup (hybrid boot), 0x2 = resume from hibernation
$bootTypes = @{
    0 = 'Full boot'
    1 = 'Fast Startup'
    2 = 'Resume from hibernation'
}

$bootType = $null
try {
    $bootEvent = Get-WinEvent -MaxEvents 1 -ErrorAction Stop -FilterHashtable @{
        LogName      = 'System'
        ProviderName = 'Microsoft-Windows-Kernel-Boot'
        Id           = 27
    }
    $bootType = $bootTypes[[int]$bootEvent.Properties[0].Value]
}
catch {
    Write-Verbose "Boot type not available: $($_.Exception.Message)"
}

$fastStartup = $null
try {
    $power = Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' `
        -Name 'HiberbootEnabled' -ErrorAction Stop
    $fastStartup = $power.HiberbootEnabled -eq 1
}
catch {
    Write-Verbose 'Fast Startup setting not found.'
}

[pscustomobject]@{
    ComputerName       = $env:COMPUTERNAME
    LastBootUpTime     = $os.LastBootUpTime
    BootType           = $bootType
    FastStartupEnabled = $fastStartup
}
