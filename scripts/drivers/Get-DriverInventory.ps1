#Requires -Version 5.1
<#
.SYNOPSIS
    Lists the installed device drivers of the local computer.

.DESCRIPTION
    Get-DriverInventory returns one object per device driver with the
    device name, device class, provider, version, date, INF file and
    signature information.

    The data comes from the Win32_PnPSignedDriver WMI class. Devices
    without a driver version (for example some software devices) are
    skipped.

    The script only reads information. Use Export-DriverInventory to save
    the inventory to a file.

.PARAMETER DeviceClass
    Only return drivers of these device classes, for example NET, DISPLAY,
    MEDIA, USB or SYSTEM.

.PARAMETER Provider
    Only return drivers of this provider. Wildcards are supported,
    for example 'Intel*'.

.PARAMETER ExcludeMicrosoft
    Hide drivers that are provided by Microsoft (inbox drivers).

.EXAMPLE
    .\Get-DriverInventory.ps1 | Format-Table DeviceName, Provider, DriverVersion

.EXAMPLE
    .\Get-DriverInventory.ps1 -DeviceClass NET, DISPLAY -ExcludeMicrosoft

    Shows third-party network and graphics drivers.

.NOTES
    Name:     Get-DriverInventory
    Category: Drivers
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [string[]]$DeviceClass,

    [string]$Provider,

    [switch]$ExcludeMicrosoft
)

$ErrorActionPreference = 'Stop'

Write-Verbose 'Reading Win32_PnPSignedDriver...'
$drivers = Get-CimInstance -ClassName 'Win32_PnPSignedDriver' |
    Where-Object { $_.DeviceName -and $_.DriverVersion }

if ($DeviceClass) {
    $drivers = $drivers | Where-Object { $DeviceClass -contains $_.DeviceClass }
}

if ($Provider) {
    $drivers = $drivers | Where-Object { $_.DriverProviderName -like $Provider }
}

if ($ExcludeMicrosoft) {
    $drivers = $drivers | Where-Object { $_.DriverProviderName -notmatch '^Microsoft' }
}

$drivers |
    Sort-Object -Property DeviceClass, DeviceName |
    ForEach-Object {
        [pscustomobject]@{
            DeviceName    = $_.DeviceName
            DeviceClass   = $_.DeviceClass
            Manufacturer  = $_.Manufacturer
            Provider      = $_.DriverProviderName
            DriverVersion = $_.DriverVersion
            DriverDate    = $_.DriverDate
            InfName       = $_.InfName
            IsSigned      = $_.IsSigned
            Signer        = $_.Signer
            DeviceId      = $_.DeviceID
        }
    }
