#Requires -Version 5.1
<#
.SYNOPSIS
    Exports the driver inventory to a CSV, JSON or HTML file.

.DESCRIPTION
    Export-DriverInventory reads all installed device drivers and writes
    them to a file. The file name contains the computer name and a time
    stamp, for example:

        DriverInventory_PC-042_20261028-141500.csv

    SYSTEM CHANGES
    This script writes to the file system:
      - it creates the target folder if it does not exist
      - it creates a new export file in that folder
      - with -Force it overwrites an existing file with the same name

    Use -WhatIf to see what would happen without writing anything.

.PARAMETER Format
    File format: Csv, Json or Html. Default: Csv.

.PARAMETER Path
    Target folder. Default: "DriverInventory" in the Documents folder of
    the current user.

.PARAMETER FileName
    Custom file name. By default a name with computer name and time stamp
    is generated.

.PARAMETER ExcludeMicrosoft
    Leave out drivers that are provided by Microsoft.

.PARAMETER Force
    Overwrite the file if it already exists.

.PARAMETER PassThru
    Return the created file as a FileInfo object.

.EXAMPLE
    .\Export-DriverInventory.ps1

    Creates a CSV file in Documents\DriverInventory.

.EXAMPLE
    .\Export-DriverInventory.ps1 -Format Html -Path 'C:\Reports' -PassThru

.EXAMPLE
    .\Export-DriverInventory.ps1 -Format Json -WhatIf

    Shows what would be written, without creating any file.

.NOTES
    Name:     Export-DriverInventory
    Category: Drivers
    Type:     System-Changes
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('Csv', 'Json', 'Html')]
    [string]$Format = 'Csv',

    [string]$Path = (Join-Path -Path ([Environment]::GetFolderPath('MyDocuments')) -ChildPath 'DriverInventory'),

    [string]$FileName,

    [switch]$ExcludeMicrosoft,

    [switch]$Force,

    [switch]$PassThru
)

$ErrorActionPreference = 'Stop'

# --- Collect the inventory ----------------------------------------------------
Write-Verbose 'Reading Win32_PnPSignedDriver...'
$inventory = @(Get-CimInstance -ClassName 'Win32_PnPSignedDriver' |
    Where-Object { $_.DeviceName -and $_.DriverVersion } |
    Where-Object { -not $ExcludeMicrosoft -or $_.DriverProviderName -notmatch '^Microsoft' } |
    Sort-Object -Property DeviceClass, DeviceName |
    ForEach-Object {
        [pscustomobject]@{
            DeviceName    = $_.DeviceName
            DeviceClass   = $_.DeviceClass
            Provider      = $_.DriverProviderName
            DriverVersion = $_.DriverVersion
            DriverDate    = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { $null }
            InfName       = $_.InfName
            IsSigned      = $_.IsSigned
            DeviceId      = $_.DeviceID
        }
    })

# --- Target file --------------------------------------------------------------
if (-not $FileName) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $FileName = 'DriverInventory_{0}_{1}.{2}' -f $env:COMPUTERNAME, $stamp, $Format.ToLower()
}

$target = Join-Path -Path $Path -ChildPath $FileName

if ((Test-Path -LiteralPath $target) -and -not $Force) {
    throw "The file '$target' already exists. Use -Force to overwrite it."
}

# --- Write --------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Path)) {
    if ($PSCmdlet.ShouldProcess($Path, 'Create folder')) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}

if ($PSCmdlet.ShouldProcess($target, "Export $($inventory.Count) drivers as $Format")) {
    switch ($Format) {
        'Csv' {
            $inventory | Export-Csv -LiteralPath $target -NoTypeInformation -Encoding UTF8 -Force
        }
        'Json' {
            ConvertTo-Json -InputObject $inventory -Depth 3 |
                Set-Content -LiteralPath $target -Encoding UTF8 -Force
        }
        'Html' {
            $title = "Driver inventory - $env:COMPUTERNAME"
            $style = @'
<style>
  body  { font-family: Segoe UI, sans-serif; margin: 24px; color: #222; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 4px 8px; font-size: 13px; text-align: left; }
  th    { background: #f3f3f3; }
</style>
'@
            $intro = "<h1>$title</h1><p>Created $(Get-Date -Format 'yyyy-MM-dd HH:mm'), $($inventory.Count) drivers</p>"

            # ConvertTo-Html ignores -Title when -Head is used, so the title goes into the head.
            $inventory |
                ConvertTo-Html -Head "<title>$title</title>$style" -PreContent $intro |
                Set-Content -LiteralPath $target -Encoding UTF8 -Force
        }
    }

    Write-Verbose "Inventory written to $target"

    if ($PassThru) {
        Get-Item -LiteralPath $target
    }
}
