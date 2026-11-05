#Requires -Version 5.1
<#
.SYNOPSIS
    Finds devices without an installed driver.

.DESCRIPTION
    Get-MissingDrivers lists all devices that Windows reports with
    problem code 28 ("The drivers for this device are not installed").
    These are the devices that appear with a yellow warning sign under
    "Other devices" in Device Manager.

    With -IncludeAllProblems the script returns every device with a
    problem code, together with a short description of the problem.

    The hardware ID is included so that the matching driver can be found
    on the vendor website or in a driver catalog.

    The script only reads information.

.PARAMETER IncludeAllProblems
    Return all devices with a problem code, not only devices with a
    missing driver.

.EXAMPLE
    .\Get-MissingDrivers.ps1

    Lists devices without a driver.

.EXAMPLE
    .\Get-MissingDrivers.ps1 -IncludeAllProblems | Format-Table Name, ErrorCode, Problem

.NOTES
    Name:     Get-MissingDrivers
    Category: Drivers
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [switch]$IncludeAllProblems
)

$ErrorActionPreference = 'Stop'

# Device Manager problem codes (CM_PROB_*).
$problemCodes = @{
    1  = 'Device is not configured correctly'
    3  = 'Driver is corrupted or the system is low on memory'
    10 = 'Device cannot start'
    12 = 'Not enough free resources'
    14 = 'Restart required'
    18 = 'Drivers must be reinstalled'
    19 = 'Registry configuration is incomplete or damaged'
    21 = 'Device is being removed'
    22 = 'Device is disabled'
    24 = 'Device is not present or not working properly'
    28 = 'Drivers are not installed'
    29 = 'Device is disabled by the firmware'
    31 = 'Windows cannot load the required drivers'
    32 = 'Driver service is disabled'
    37 = 'Driver returned a failure'
    39 = 'Driver is corrupted or missing'
    43 = 'Device reported a problem and was stopped'
    45 = 'Device is not connected'
    48 = 'Driver is blocked from starting'
    52 = 'Driver signature could not be verified'
}

$devices = @(Get-CimInstance -ClassName 'Win32_PnPEntity' -Filter 'ConfigManagerErrorCode <> 0')

if (-not $IncludeAllProblems) {
    $devices = @($devices | Where-Object { $_.ConfigManagerErrorCode -eq 28 })
}

if ($devices.Count -eq 0) {
    Write-Information 'No devices with missing drivers found.' -InformationAction Continue
    return
}

$devices |
    Sort-Object -Property Name |
    ForEach-Object {
        $code = [int]$_.ConfigManagerErrorCode
        $problem = $problemCodes[$code]
        if (-not $problem) { $problem = 'Unknown problem' }

        [pscustomobject]@{
            Name        = if ($_.Name) { $_.Name } else { '(Unknown device)' }
            DeviceClass = $_.PNPClass
            ErrorCode   = $code
            Problem     = $problem
            HardwareId  = @($_.HardwareID)[0]
            DeviceId    = $_.DeviceID
        }
    }
