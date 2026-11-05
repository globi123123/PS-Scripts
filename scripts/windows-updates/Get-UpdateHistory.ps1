#Requires -Version 5.1
<#
.SYNOPSIS
    Lists the Windows Update installation history.

.DESCRIPTION
    Get-UpdateHistory reads the update history from the Windows Update Agent
    (the same list that is shown under Settings > Windows Update > Update
    history) and returns one object per entry.

    Each entry contains the date, the KB number, the title, the operation
    (installation or uninstallation), the result and the HRESULT code. The
    HRESULT is useful to look up the reason of a failed installation.

    The script only reads information.

.PARAMETER Days
    Number of days to look back. Default: 90.

.PARAMETER Result
    Filter by result: All, Succeeded or Failed. "Failed" also includes
    aborted installations. Default: All.

.PARAMETER Title
    Only return entries whose title contains this text, for example a KB
    number or "Defender".

.EXAMPLE
    .\Get-UpdateHistory.ps1

    Shows all updates of the last 90 days.

.EXAMPLE
    .\Get-UpdateHistory.ps1 -Days 30 -Result Failed

    Shows failed updates of the last 30 days including the HRESULT code.

.EXAMPLE
    .\Get-UpdateHistory.ps1 -Title 'KB5043' | Format-Table Date, KB, Result

.NOTES
    Name:     Get-UpdateHistory
    Category: Windows Updates
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 3650)]
    [int]$Days = 90,

    [ValidateSet('All', 'Succeeded', 'Failed')]
    [string]$Result = 'All',

    [string]$Title
)

$ErrorActionPreference = 'Stop'

$resultNames = @{
    0 = 'NotStarted'
    1 = 'InProgress'
    2 = 'Succeeded'
    3 = 'SucceededWithErrors'
    4 = 'Failed'
    5 = 'Aborted'
}

$operationNames = @{
    1 = 'Installation'
    2 = 'Uninstallation'
    3 = 'Other'
}

$session = New-Object -ComObject 'Microsoft.Update.Session'
$searcher = $session.CreateUpdateSearcher()
$total = $searcher.GetTotalHistoryCount()

if ($total -eq 0) {
    Write-Verbose 'The Windows Update history is empty.'
    return
}

$since = (Get-Date).AddDays(-$Days)

$history = @(foreach ($entry in $searcher.QueryHistory(0, $total)) {
    # Entries without a title are internal scan records.
    if ([string]::IsNullOrWhiteSpace($entry.Title)) { continue }

    # The history stores dates in UTC.
    $date = $entry.Date.ToLocalTime()
    if ($date -lt $since) { continue }

    $kb = $null
    if ($entry.Title -match 'KB\d{6,7}') { $kb = $Matches[0] }

    $code = [int]$entry.ResultCode
    $resultName = $resultNames[$code]
    if (-not $resultName) { $resultName = "Unknown ($code)" }

    [pscustomobject]@{
        Date      = $date
        KB        = $kb
        Title     = $entry.Title
        Operation = $operationNames[[int]$entry.Operation]
        Result    = $resultName
        HResult   = '0x{0:X8}' -f $entry.HResult
    }
})

switch ($Result) {
    'Succeeded' { $history = @($history | Where-Object { $_.Result -like 'Succeeded*' }) }
    'Failed'    { $history = @($history | Where-Object { $_.Result -in 'Failed', 'Aborted' }) }
}

if ($Title) {
    $history = @($history | Where-Object { $_.Title -like "*$Title*" })
}

$history | Sort-Object -Property Date -Descending
