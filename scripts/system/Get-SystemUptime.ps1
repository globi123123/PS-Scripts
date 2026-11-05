#Requires -Version 5.1
<#
.SYNOPSIS
    Shows how long a computer has been running since the last boot.

.DESCRIPTION
    Get-SystemUptime reads the last boot time from Win32_OperatingSystem
    and calculates the uptime. With -WarningDays you define after how many
    days a reboot is recommended; the Status property then shows
    "RebootRecommended" instead of "OK".

    Remote computers are queried through CIM (WinRM).

    Note: With Fast Startup enabled, "Shut down" does not reset the uptime.
    Only "Restart" does. Use Get-LastBootTime to see the boot type.

    The script only reads information.

.PARAMETER ComputerName
    One or more computers. Default: the local computer.

.PARAMETER WarningDays
    Uptime in days from which a reboot is recommended. Default: 14.

.EXAMPLE
    .\Get-SystemUptime.ps1

.EXAMPLE
    .\Get-SystemUptime.ps1 -ComputerName SRV01, SRV02 -WarningDays 30

.EXAMPLE
    'PC-001', 'PC-002' | .\Get-SystemUptime.ps1 | Where-Object Status -ne 'OK'

.NOTES
    Name:     Get-SystemUptime
    Category: System
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromPipeline)]
    [string[]]$ComputerName = $env:COMPUTERNAME,

    [ValidateRange(1, 365)]
    [int]$WarningDays = 14
)

process {
    foreach ($computer in $ComputerName) {
        $query = @{
            ClassName   = 'Win32_OperatingSystem'
            ErrorAction = 'Stop'
        }

        $isLocal = $computer -in @($env:COMPUTERNAME, 'localhost', '.', '127.0.0.1')
        if (-not $isLocal) {
            $query.ComputerName = $computer
        }

        try {
            $os = Get-CimInstance @query
        }
        catch {
            Write-Error -Message "Could not query '$computer': $($_.Exception.Message)"
            continue
        }

        # Both values come from the target computer, so time zones match.
        $uptime = $os.LocalDateTime - $os.LastBootUpTime

        [pscustomobject]@{
            ComputerName   = $os.CSName
            LastBootUpTime = $os.LastBootUpTime
            Uptime         = $uptime
            UptimeText     = '{0}d {1}h {2}m' -f $uptime.Days, $uptime.Hours, $uptime.Minutes
            TotalDays      = [math]::Round($uptime.TotalDays, 2)
            Status         = if ($uptime.TotalDays -ge $WarningDays) { 'RebootRecommended' } else { 'OK' }
        }
    }
}
