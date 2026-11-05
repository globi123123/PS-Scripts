<#
.SYNOPSIS
    Compact read-only health check of the local computer.

.DESCRIPTION
    Get-SystemDiagnostics collects the most important facts about a Windows
    computer and prints them as a compact report with one block per section:

      System     computer, user, Windows version, model, serial number, BIOS
      Uptime     uptime, last boot, last restart (who and why), unexpected
                 shutdowns, pending reboot
      Updates    last installed updates, failed updates, last update scan,
                 Windows Update service
      Hardware   CPU, memory, graphics, battery
      Storage    free space per drive, health of the physical disks
      Network    active adapters (IP, gateway, DNS), Wi-Fi, internet, VPN
      Security   antivirus, Defender, firewall, BitLocker, Secure Boot, UAC
      Events     critical events and errors, app crashes, blue screens
      Devices    devices with a problem or without a driver
      Services   automatic services that failed, important core services

    Every check that needs attention is marked WARN or FAIL and listed again
    in the summary at the end.

    READ-ONLY: the script only reads information. It does not change any
    setting, does not write any file and does not start or stop anything.
    It runs as a standard user. In an elevated session the BitLocker details
    and the TPM state are added.

    The script has no dependencies and can also be run without saving it:

        $url = 'https://raw.githubusercontent.com/globi123123/PS-Scripts/main/scripts/system/Get-SystemDiagnostics.ps1'
        & ([scriptblock]::Create((Invoke-RestMethod $url)))

.PARAMETER Section
    Only run these sections: System, Uptime, Updates, Hardware, Storage,
    Network, Security, Events, Devices, Services. Default: all.

.PARAMETER ExcludeSection
    Skip these sections.

.PARAMETER ProblemsOnly
    Only show checks marked WARN or FAIL.

.PARAMETER Days
    Look-back period in days for the event log, unexpected shutdowns and
    failed updates. Default: 7.

.PARAMETER UpdateCount
    Number of recently installed updates to list. Default: 5.

.PARAMETER IncludePendingUpdates
    Also count pending updates. Uses the local update cache and takes a few
    seconds.

.PARAMETER SkipInternetCheck
    Do not test the internet connection.

.PARAMETER UptimeWarningDays
    Uptime in days from which a reboot is recommended. Default: 14.

.PARAMETER DiskWarningPercent
    Used space in percent from which a drive is marked. Default: 90.

.PARAMETER Width
    Width of the report in characters. Default: 76. The report gets
    narrower automatically when the console window is smaller.

.PARAMETER NoColor
    Plain text without colours. The report is then written to the output
    stream, so it can be redirected to a file or piped to Set-Clipboard.

.PARAMETER AsObject
    Return one object per check (Section, Check, Value, Status) instead of
    the printed report. Works with Where-Object, Export-Csv, Out-GridView.

.EXAMPLE
    .\Get-SystemDiagnostics.ps1

    Full report of the local computer.

.EXAMPLE
    .\Get-SystemDiagnostics.ps1 Uptime, Updates

    Only the uptime and update sections.

.EXAMPLE
    .\Get-SystemDiagnostics.ps1 -ProblemsOnly

    Only the checks that need attention.

.EXAMPLE
    .\Get-SystemDiagnostics.ps1 -AsObject | Where-Object Status -ne 'OK' | Format-Table

.EXAMPLE
    .\Get-SystemDiagnostics.ps1 -NoColor | Set-Clipboard

    Copies the plain report to the clipboard, for example for a ticket.

.NOTES
    Name:     Get-SystemDiagnostics
    Category: System
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('System', 'Uptime', 'Updates', 'Hardware', 'Storage', 'Network', 'Security', 'Events', 'Devices', 'Services')]
    [string[]]$Section,

    [ValidateSet('System', 'Uptime', 'Updates', 'Hardware', 'Storage', 'Network', 'Security', 'Events', 'Devices', 'Services')]
    [string[]]$ExcludeSection,

    [switch]$ProblemsOnly,

    [ValidateRange(1, 365)]
    [int]$Days = 7,

    [ValidateRange(1, 50)]
    [int]$UpdateCount = 5,

    [switch]$IncludePendingUpdates,

    [switch]$SkipInternetCheck,

    [ValidateRange(1, 365)]
    [int]$UptimeWarningDays = 14,

    [ValidateRange(50, 99)]
    [int]$DiskWarningPercent = 90,

    [ValidateRange(60, 200)]
    [int]$Width = 76,

    [switch]$NoColor,

    [switch]$AsObject
)

# =============================================================================
#  Checks before anything else
# =============================================================================

if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Get-SystemDiagnostics needs Windows PowerShell 5.1 or PowerShell 7.'
}
if ($PSVersionTable.PSEdition -eq 'Core' -and -not $IsWindows) {
    throw 'Get-SystemDiagnostics only runs on Windows.'
}

$sectionOrder = @('System', 'Uptime', 'Updates', 'Hardware', 'Storage', 'Network', 'Security', 'Events', 'Devices', 'Services')

$sectionTitles = @{
    System   = 'SYSTEM'
    Uptime   = 'UPTIME & REBOOTS'
    Updates  = 'WINDOWS UPDATES'
    Hardware = 'HARDWARE'
    Storage  = 'STORAGE'
    Network  = 'NETWORK'
    Security = 'SECURITY'
    Events   = "EVENT LOG (LAST $Days DAYS)"
    Devices  = 'DEVICES & DRIVERS'
    Services = 'SERVICES'
}

$selectedSections = @($sectionOrder | Where-Object {
        (-not $Section -or $Section -contains $_) -and -not ($ExcludeSection -contains $_)
    })

if ($selectedSections.Count -eq 0) {
    throw 'No section selected. Check -Section and -ExcludeSection.'
}

# =============================================================================
#  Layout
# =============================================================================

# Use a narrower report when the console window is smaller.
if (-not $NoColor -and -not $AsObject) {
    try {
        $consoleWidth = $Host.UI.RawUI.WindowSize.Width
        if ($consoleWidth -gt 60 -and $consoleWidth -le $Width) {
            $Width = $consoleWidth - 1
        }
    }
    catch {
        # No real console (for example ISE or a remote session): keep the width.
    }
}

$NameWidth = 15
$TagWidth = 4
$ValueWidth = $Width - $NameWidth - $TagWidth - 3
$Separator = '-' * $Width

$tagText = @{ OK = 'OK'; Warn = 'WARN'; Fail = 'FAIL'; Info = '' }
$tagColor = @{ OK = 'Green'; Warn = 'Yellow'; Fail = 'Red'; Info = '' }

# =============================================================================
#  Shared data
# =============================================================================

$startTime = Get-Date
$since = $startTime.AddDays(-$Days)
$timer = [System.Diagnostics.Stopwatch]::StartNew()

$os = Get-CimInstance -ClassName 'Win32_OperatingSystem' -ErrorAction SilentlyContinue
$cs = Get-CimInstance -ClassName 'Win32_ComputerSystem' -ErrorAction SilentlyContinue

$isAdmin = $false
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $isAdmin = ([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
catch {
    $isAdmin = $false
}

$osName = 'Windows'
$osRelease = ''
$osBuild = ''
try {
    $winInfo = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop
    if ($os) { $osName = ($os.Caption -replace '^Microsoft\s+', '').Trim() }
    $osRelease = if ($winInfo.DisplayVersion) { $winInfo.DisplayVersion } else { $winInfo.ReleaseId }
    $osBuild = '{0}.{1}' -f $winInfo.CurrentBuild, $winInfo.UBR
}
catch {
    Write-Verbose "Windows version not available: $($_.Exception.Message)"
}

# Collected rows. Add-Row writes into $rows; $state holds the current section.
$rows = New-Object System.Collections.Generic.List[object]
$state = @{ Section = '' }

# =============================================================================
#  Helper functions
# =============================================================================

function Add-Row {
    param(
        [string]$Name,

        $Value,

        [ValidateSet('Info', 'OK', 'Warn', 'Fail')]
        [string]$Status = 'Info',

        # Detail line that belongs to the row above (no label is printed).
        [switch]$More
    )

    $rows.Add([pscustomobject]@{
            Section = $state.Section
            Check   = $Name
            Value   = [string]$Value
            Status  = $Status
            More    = [bool]$More
        })
}

function Invoke-Check {
    # Runs one check. If it fails, the report shows "n/a" instead of an error.
    param(
        [string]$Name,

        [scriptblock]$Check
    )

    $ErrorActionPreference = 'Stop'
    try {
        & $Check
    }
    catch {
        Add-Row -Name $Name -Value ('n/a - ' + $_.Exception.Message)
    }
}

function Limit-Text {
    param(
        [string]$Text,

        [int]$Length
    )

    if ($null -eq $Text) { return '' }
    $Text = $Text -replace '[\r\n\t]+', ' '
    if ($Text.Length -le $Length) { return $Text }
    if ($Length -le 3) { return $Text.Substring(0, $Length) }
    return $Text.Substring(0, $Length - 3) + '...'
}

function Format-Duration {
    param([TimeSpan]$Span)

    if ($Span.TotalDays -ge 1) { return '{0}d {1}h {2}m' -f $Span.Days, $Span.Hours, $Span.Minutes }
    if ($Span.TotalHours -ge 1) { return '{0}h {1}m' -f $Span.Hours, $Span.Minutes }
    return '{0}m' -f $Span.Minutes
}

function Format-Date {
    param($Date)

    if ($Date -is [datetime]) { return $Date.ToString('yyyy-MM-dd HH:mm') }
    return 'unknown'
}

function Format-Day {
    param($Date)

    if ($Date -is [datetime]) { return $Date.ToString('yyyy-MM-dd') }
    return 'unknown'
}

function Format-Ago {
    param([datetime]$Date)

    $daysAgo = [math]::Floor(((Get-Date) - $Date).TotalDays)
    if ($daysAgo -lt 1) { return 'today' }
    if ($daysAgo -lt 2) { return 'yesterday' }
    return "$daysAgo days ago"
}

function Format-Size {
    param([double]$Bytes)

    if ($Bytes -ge 1TB) { return '{0:0.0} TB' -f ($Bytes / 1TB) }
    if ($Bytes -ge 100GB) { return '{0:0} GB' -f ($Bytes / 1GB) }
    if ($Bytes -ge 1GB) { return '{0:0.0} GB' -f ($Bytes / 1GB) }
    return '{0:0} MB' -f ($Bytes / 1MB)
}

function Format-Bar {
    # [######....] for a percentage.
    param(
        [double]$Percent,

        [int]$Length = 10
    )

    $filled = [int][math]::Round($Percent / 100 * $Length)
    $filled = [math]::Max(0, [math]::Min($Length, $filled))
    return '[' + ('#' * $filled) + ('.' * ($Length - $filled)) + ']'
}

function Get-RegistryValue {
    param(
        [string]$Path,

        [string]$Name
    )

    $item = Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction SilentlyContinue
    if ($item) { return $item.$Name }
    return $null
}

# =============================================================================
#  Output
# =============================================================================

function Write-ReportLine {
    # Writes one line made of coloured parts. With -NoColor the line is
    # returned as plain text, so it can be redirected or piped.
    param(
        [string[]]$Text,

        [string[]]$Color = @()
    )

    if ($NoColor) {
        return ($Text -join '')
    }

    for ($i = 0; $i -lt $Text.Count; $i++) {
        $partColor = if ($i -lt $Color.Count) { $Color[$i] } else { '' }
        if ($partColor) {
            Write-Host $Text[$i] -NoNewline -ForegroundColor $partColor
        }
        else {
            Write-Host $Text[$i] -NoNewline
        }
    }
    Write-Host ''
}

function Write-Title {
    # " TITLE                                    right text"
    param(
        [string]$Title,

        [string]$Right = '',

        [string]$RightColor = ''
    )

    $gap = [math]::Max(1, $Width - 1 - $Title.Length - $Right.Length)
    Write-ReportLine -Text @(' ', $Title, (' ' * $gap), $Right) -Color @('', 'Cyan', '', $RightColor)
}

function Write-Row {
    param($Row)

    $label = if ($Row.More) { '' } else { $Row.Check }
    $label = (Limit-Text $label $NameWidth).PadRight($NameWidth)
    $valueColor = if ($Row.More) { 'DarkGray' } else { '' }
    $tag = $tagText[$Row.Status]

    if ($tag) {
        $value = (Limit-Text $Row.Value $ValueWidth).PadRight($ValueWidth)
        Write-ReportLine -Text @(' ', $label, ' ', $value, ' ', $tag.PadLeft($TagWidth)) `
            -Color @('', '', '', $valueColor, '', $tagColor[$Row.Status])
    }
    else {
        # Rows without a status may also use the space of the status column.
        $value = Limit-Text $Row.Value ($ValueWidth + $TagWidth + 1)
        Write-ReportLine -Text @(' ', $label, ' ', $value) -Color @('', '', '', $valueColor)
    }
}

function Get-ProblemText {
    param([object[]]$Items)

    $failures = @($Items | Where-Object { $_.Status -eq 'Fail' }).Count
    $warnings = @($Items | Where-Object { $_.Status -eq 'Warn' }).Count
    $parts = @()
    if ($failures -gt 0) { $parts += "$failures FAIL" }
    if ($warnings -gt 0) { $parts += "$warnings WARN" }
    $color = if ($failures -gt 0) { 'Red' } elseif ($warnings -gt 0) { 'Yellow' } else { '' }
    return @(($parts -join ', '), $color)
}

function Select-VisibleRow {
    # With -ProblemsOnly: keep WARN/FAIL rows and their detail lines.
    param([object[]]$Items)

    if (-not $ProblemsOnly) { return $Items }
    $keep = $false
    foreach ($item in $Items) {
        if (-not $item.More) { $keep = $item.Status -in @('Warn', 'Fail') }
        if ($keep) { $item }
    }
}

# =============================================================================
#  Sections
# =============================================================================

function Invoke-SystemSection {
    Invoke-Check 'Computer' {
        $membership = if ($cs.PartOfDomain) { "domain $($cs.Domain)" } else { "workgroup $($cs.Workgroup)" }
        Add-Row 'Computer' ('{0}  ({1})' -f $env:COMPUTERNAME, $membership)
    }

    Invoke-Check 'User' {
        $session = if ($isAdmin) { 'elevated' } else { 'not elevated' }
        Add-Row 'User' ('{0}\{1}  ({2})' -f $env:USERDOMAIN, $env:USERNAME, $session)
    }

    Invoke-Check 'Windows' {
        Add-Row 'Windows' ('{0} {1}  (build {2}, {3})' -f $osName, $osRelease, $osBuild, $os.OSArchitecture)
    }

    Invoke-Check 'Installed' {
        Add-Row 'Installed' ('{0}  ({1})' -f (Format-Day $os.InstallDate), (Format-Ago $os.InstallDate))
    }

    Invoke-Check 'Model' {
        $model = $cs.Model
        # Lenovo stores the readable model name in Win32_ComputerSystemProduct.
        if ($cs.Manufacturer -match 'LENOVO') {
            $product = Get-CimInstance -ClassName 'Win32_ComputerSystemProduct' -ErrorAction SilentlyContinue
            if ($product -and $product.Version) { $model = $product.Version }
        }
        Add-Row 'Model' ('{0} {1}' -f $cs.Manufacturer, $model)
    }

    Invoke-Check 'Serial' {
        $bios = Get-CimInstance -ClassName 'Win32_BIOS'
        Add-Row 'Serial' $bios.SerialNumber
        Add-Row 'BIOS' ('{0}  ({1})' -f $bios.SMBIOSBIOSVersion, (Format-Day $bios.ReleaseDate))
    }

    Invoke-Check 'PowerShell' {
        Add-Row 'PowerShell' ('{0}  ({1})' -f $PSVersionTable.PSVersion, $PSVersionTable.PSEdition)
    }
}

function Invoke-UptimeSection {
    Invoke-Check 'Uptime' {
        $uptime = (Get-Date) - $os.LastBootUpTime
        if ($uptime.TotalDays -ge $UptimeWarningDays) {
            Add-Row 'Uptime' ('{0}  (more than {1} days, restart recommended)' -f (Format-Duration $uptime), $UptimeWarningDays) -Status 'Warn'
        }
        else {
            Add-Row 'Uptime' (Format-Duration $uptime) -Status 'OK'
        }
    }

    Invoke-Check 'Last boot' {
        $text = Format-Date $os.LastBootUpTime

        # Kernel-Boot event 27: 0 = full boot, 1 = Fast Startup, 2 = resume from hibernation
        $bootEvent = Get-WinEvent -MaxEvents 1 -ErrorAction SilentlyContinue -FilterHashtable @{
            LogName      = 'System'
            ProviderName = 'Microsoft-Windows-Kernel-Boot'
            Id           = 27
        }
        if ($bootEvent) {
            $bootTypes = @{ 0 = 'full boot'; 1 = 'Fast Startup'; 2 = 'resume from hibernation' }
            $bootType = $bootTypes[[int]$bootEvent.Properties[0].Value]
            if ($bootType) { $text += "  ($bootType)" }
        }
        Add-Row 'Last boot' $text
    }

    Invoke-Check 'Fast Startup' {
        $hiberboot = Get-RegistryValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled'
        if ($hiberboot -eq 1) {
            Add-Row 'Fast Startup' 'on - "Shut down" does not reset the uptime, "Restart" does'
        }
        elseif ($null -ne $hiberboot) {
            Add-Row 'Fast Startup' 'off'
        }
    }

    Invoke-Check 'Last restart' {
        # User32 event 1074: a process or user started a restart or shutdown.
        $shutdown = Get-WinEvent -MaxEvents 1 -ErrorAction SilentlyContinue -FilterHashtable @{
            LogName      = 'System'
            ProviderName = 'User32'
            Id           = 1074
        }
        if (-not $shutdown) {
            Add-Row 'Last restart' 'no restart found in the event log'
            return
        }

        # 0 = process, 2 = reason, 4 = type (restart / power off), 6 = user
        $values = @($shutdown.Properties | ForEach-Object { [string]$_.Value })
        $process = ''
        if ($values.Count -gt 0 -and $values[0]) {
            $process = ($values[0] -replace '\s*\(.*\)\s*$', '') -replace '^.*\\', ''
        }
        $type = if ($values.Count -gt 4 -and $values[4]) { $values[4] } else { 'shutdown' }
        $user = if ($values.Count -gt 6) { $values[6] } else { 'unknown' }

        Add-Row 'Last restart' ('{0}  {1} by {2} ({3})' -f (Format-Date $shutdown.TimeCreated), $type, $user, $process)
        if ($values.Count -gt 2 -and $values[2]) {
            Add-Row 'Last restart' ('reason: ' + $values[2]) -More
        }
    }

    Invoke-Check 'Unexpected off' {
        # Kernel-Power 41: the computer restarted without shutting down cleanly
        # (power loss, crash, hold of the power button).
        $unexpected = @(Get-WinEvent -ErrorAction SilentlyContinue -FilterHashtable @{
                LogName      = 'System'
                ProviderName = 'Microsoft-Windows-Kernel-Power'
                Id           = 41
                StartTime    = $since
            })
        if ($unexpected.Count -eq 0) {
            Add-Row 'Unexpected off' "none in the last $Days days" -Status 'OK'
        }
        else {
            Add-Row 'Unexpected off' ('{0} in the last {1} days, last {2}' -f $unexpected.Count, $Days, (Format-Date $unexpected[0].TimeCreated)) -Status 'Warn'
        }
    }

    Invoke-Check 'Pending reboot' {
        $reasons = New-Object System.Collections.Generic.List[string]

        if (Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') {
            $reasons.Add('component servicing')
        }
        if (Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') {
            $reasons.Add('Windows Update')
        }

        $activeName = Get-RegistryValue 'HKLM:\SYSTEM\CurrentControlSet\Control\ComputerName\ActiveComputerName' 'ComputerName'
        $newName = Get-RegistryValue 'HKLM:\SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName' 'ComputerName'
        if ($activeName -and $newName -and $activeName -ne $newName) {
            $reasons.Add('computer rename')
        }

        $renames = Get-RegistryValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' 'PendingFileRenameOperations'
        $fileRename = [bool]($renames | Where-Object { $_ })

        if ($reasons.Count -gt 0) {
            Add-Row 'Pending reboot' ('yes - ' + ($reasons -join ', ')) -Status 'Warn'
        }
        elseif ($fileRename) {
            Add-Row 'Pending reboot' 'only file rename operations (usually harmless)'
        }
        else {
            Add-Row 'Pending reboot' 'no' -Status 'OK'
        }
    }
}

function Invoke-UpdatesSection {
    Invoke-Check 'Update service' {
        $service = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
        if (-not $service) {
            Add-Row 'Update service' 'Windows Update service not found' -Status 'Fail'
            return
        }
        $status = if ([string]$service.StartType -eq 'Disabled') { 'Warn' } else { 'OK' }
        Add-Row 'Update service' ('{0}, start type {1}' -f $service.Status, $service.StartType) -Status $status
    }

    Invoke-Check 'Last installed' {
        $session = New-Object -ComObject 'Microsoft.Update.Session'
        $searcher = $session.CreateUpdateSearcher()
        $total = $searcher.GetTotalHistoryCount()

        $entries = @()
        if ($total -gt 0) {
            $entries = @(foreach ($entry in $searcher.QueryHistory(0, [math]::Min($total, 500))) {
                    # Skip scan records and uninstallations.
                    if ([string]::IsNullOrWhiteSpace($entry.Title) -or $entry.Operation -ne 1) { continue }

                    $kb = ''
                    if ($entry.Title -match 'KB\d{6,8}') { $kb = $Matches[0] }

                    [pscustomobject]@{
                        Date       = $entry.Date.ToLocalTime()
                        Title      = $entry.Title
                        KB         = $kb
                        Result     = [int]$entry.ResultCode
                        HResult    = [int]$entry.HResult
                        # Defender signature updates arrive daily and would hide everything else.
                        Definition = [bool]($entry.Title -match 'Security Intelligence Update|Definition Update|KB2267602')
                    }
                })
        }

        # ResultCode: 2 = succeeded, 3 = succeeded with errors, 4 = failed, 5 = aborted
        $installed = @($entries |
                Where-Object { ($_.Result -in @(2, 3)) -and (-not $_.Definition) } |
                Sort-Object -Property Date -Descending)

        if ($installed.Count -eq 0) {
            Add-Row 'Last installed' 'no installed update found in the history' -Status 'Warn'
        }
        else {
            $last = $installed[0]
            $age = ((Get-Date) - $last.Date).TotalDays
            $status = if ($age -gt 40) { 'Warn' } else { 'OK' }
            Add-Row 'Last installed' ('{0}  ({1})' -f (Format-Day $last.Date), (Format-Ago $last.Date)) -Status $status

            $first = $true
            foreach ($update in @($installed | Select-Object -First $UpdateCount)) {
                $title = $update.Title -replace '\s*\(KB\d+\)', '' -replace '\s+for (x64|x86|ARM64)-based Systems', ''
                $kb = if ($update.KB) { $update.KB } else { '-' }
                Add-Row 'Recent updates' ('{0}  {1,-9}  {2}' -f (Format-Day $update.Date), $kb, $title) -More:(-not $first)
                $first = $false
            }
        }

        $failed = @($entries |
                Where-Object { ($_.Result -in @(4, 5)) -and ($_.Date -ge $since) } |
                Sort-Object -Property Date -Descending)

        if ($failed.Count -eq 0) {
            Add-Row 'Failed updates' "none in the last $Days days" -Status 'OK'
        }
        else {
            Add-Row 'Failed updates' ('{0} in the last {1} days' -f $failed.Count, $Days) -Status 'Warn'
            foreach ($update in @($failed | Select-Object -First 3)) {
                $label = if ($update.KB) { $update.KB } else { Limit-Text $update.Title 30 }
                Add-Row 'Failed updates' ('{0}  {1}  error 0x{2:X8}' -f (Format-Day $update.Date), $label, $update.HResult) -More
            }
        }
    }

    Invoke-Check 'Last scan' {
        $results = (New-Object -ComObject 'Microsoft.Update.AutoUpdate').Results
        $lastSearch = $results.LastSearchSuccessDate
        if ($lastSearch -is [datetime] -and $lastSearch.Year -gt 2000) {
            $lastSearch = $lastSearch.ToLocalTime()
            $status = if (((Get-Date) - $lastSearch).TotalDays -gt 7) { 'Warn' } else { 'OK' }
            Add-Row 'Last scan' ('{0}  ({1})' -f (Format-Date $lastSearch), (Format-Ago $lastSearch)) -Status $status
        }
        else {
            Add-Row 'Last scan' 'unknown'
        }
    }

    if ($IncludePendingUpdates) {
        Invoke-Check 'Pending updates' {
            $searcher = (New-Object -ComObject 'Microsoft.Update.Session').CreateUpdateSearcher()
            $searcher.Online = $false
            $result = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Software'")

            $count = $result.Updates.Count
            $critical = @(foreach ($update in $result.Updates) {
                    if ($update.MsrcSeverity -eq 'Critical') { $update }
                }).Count

            $status = if ($critical -gt 0) { 'Warn' } elseif ($count -gt 0) { 'Info' } else { 'OK' }
            Add-Row 'Pending updates' ('{0} pending, {1} critical  (local cache)' -f $count, $critical) -Status $status
        }
    }
}

function Invoke-HardwareSection {
    Invoke-Check 'CPU' {
        $cpus = @(Get-CimInstance -ClassName 'Win32_Processor')
        $cpuName = $cpus[0].Name -replace '\((R|TM|tm)\)', '' -replace '\s+CPU\b', '' -replace '\s+@.*$', ''
        $cpuName = ($cpuName -replace '\s+', ' ').Trim()
        $cores = ($cpus | Measure-Object -Property NumberOfCores -Sum).Sum
        $threads = ($cpus | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum

        $text = '{0}  {1}C/{2}T' -f $cpuName, $cores, $threads
        if ($null -ne $cpus[0].LoadPercentage) {
            $text += '  load {0}%' -f $cpus[0].LoadPercentage
        }
        Add-Row 'CPU' $text
    }

    Invoke-Check 'Memory' {
        $totalBytes = [double]$os.TotalVisibleMemorySize * 1KB
        $freeBytes = [double]$os.FreePhysicalMemory * 1KB
        $usedBytes = $totalBytes - $freeBytes
        $usedPercent = $usedBytes / $totalBytes * 100

        $status = if ($usedPercent -ge 90) { 'Warn' } else { 'OK' }
        Add-Row 'Memory' ('{0} {1,3:0}%  {2} of {3} used' -f (Format-Bar $usedPercent), $usedPercent, (Format-Size $usedBytes), (Format-Size $totalBytes)) -Status $status
    }

    Invoke-Check 'Graphics' {
        $gpus = @(Get-CimInstance -ClassName 'Win32_VideoController' |
                Where-Object { $_.Name -notmatch 'Remote Display|Virtual' } |
                ForEach-Object { $_.Name })
        if ($gpus.Count -gt 0) {
            # "Microsoft Basic Display Adapter" means the graphics driver is missing.
            $status = if ($gpus -match 'Basic Display') { 'Warn' } else { 'Info' }
            Add-Row 'Graphics' ($gpus -join ', ') -Status $status
        }
    }

    Invoke-Check 'Battery' {
        $batteries = @(Get-CimInstance -ClassName 'Win32_Battery' -ErrorAction SilentlyContinue)
        if ($batteries.Count -eq 0) { return }

        $battery = $batteries[0]
        $power = switch ([int]$battery.BatteryStatus) {
            1 { 'on battery' }
            2 { 'plugged in' }
            3 { 'fully charged' }
            4 { 'low' }
            5 { 'critical' }
            { $_ -in 6..9 } { 'charging' }
            default { '' }
        }
        $text = '{0}%  {1}' -f $battery.EstimatedChargeRemaining, $power

        # Wear level: full charge capacity compared to design capacity.
        try {
            $full = @(Get-CimInstance -Namespace 'root/wmi' -ClassName 'BatteryFullChargedCapacity' -ErrorAction Stop)[0].FullChargedCapacity
            $design = @(Get-CimInstance -Namespace 'root/wmi' -ClassName 'BatteryStaticData' -ErrorAction Stop)[0].DesignedCapacity
            if ($full -gt 0 -and $design -gt 0) {
                $text += '  |  health {0:0}% of design capacity' -f ($full / $design * 100)
            }
        }
        catch {
            Write-Verbose 'Battery capacity not available.'
        }

        $status = if ($battery.EstimatedChargeRemaining -lt 15 -and [int]$battery.BatteryStatus -eq 1) { 'Warn' } else { 'Info' }
        Add-Row 'Battery' $text -Status $status
    }
}

function Invoke-StorageSection {
    Invoke-Check 'Drives' {
        $drives = @(Get-CimInstance -ClassName 'Win32_LogicalDisk' -Filter 'DriveType=3' |
                Where-Object { $_.Size -gt 0 } |
                Sort-Object -Property DeviceID)

        foreach ($drive in $drives) {
            $usedPercent = ($drive.Size - $drive.FreeSpace) / $drive.Size * 100
            $status = if ($usedPercent -ge 97) { 'Fail' } elseif ($usedPercent -ge $DiskWarningPercent) { 'Warn' } else { 'OK' }
            $label = if ($drive.VolumeName) { '  ' + $drive.VolumeName } else { '' }
            Add-Row ('Drive ' + $drive.DeviceID) ('{0} {1,3:0}%  {2} free of {3}{4}' -f (Format-Bar $usedPercent), $usedPercent, (Format-Size $drive.FreeSpace), (Format-Size $drive.Size), $label) -Status $status
        }
    }

    Invoke-Check 'Disks' {
        if (-not (Get-Command -Name 'Get-PhysicalDisk' -ErrorAction SilentlyContinue)) { return }

        $disks = @(Get-PhysicalDisk -ErrorAction Stop | Sort-Object -Property { [int]$_.DeviceId })
        foreach ($disk in $disks) {
            $health = [string]$disk.HealthStatus
            $status = switch ($health) {
                'Healthy' { 'OK' }
                'Warning' { 'Warn' }
                'Unhealthy' { 'Fail' }
                default { 'Info' }
            }
            Add-Row ('Disk ' + $disk.DeviceId) ('{0}  {1}  {2}  {3}' -f $disk.FriendlyName, $disk.MediaType, (Format-Size $disk.Size), $health) -Status $status
        }
    }
}

function Invoke-NetworkSection {
    Invoke-Check 'Adapters' {
        $configs = @(Get-NetIPConfiguration -ErrorAction Stop |
                Where-Object { $_.NetAdapter -and [string]$_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address })

        if ($configs.Count -eq 0) {
            Add-Row 'Network' 'no connected network adapter' -Status 'Fail'
            return
        }

        foreach ($config in $configs) {
            $ip = @($config.IPv4Address)[0]
            $gateway = @($config.IPv4DefaultGateway | ForEach-Object { $_.NextHop })[0]
            $dns = @($config.DNSServer |
                    Where-Object { $_.AddressFamily -eq 2 } |
                    ForEach-Object { $_.ServerAddresses }) -join ', '

            $text = '{0}/{1}' -f $ip.IPAddress, $ip.PrefixLength
            if ($gateway) { $text += "  gw $gateway" }
            if ($config.NetAdapter.LinkSpeed) { $text += '  ' + $config.NetAdapter.LinkSpeed }

            Add-Row $config.InterfaceAlias $text
            if ($dns) { Add-Row $config.InterfaceAlias "DNS $dns" -More }
        }
    }

    Invoke-Check 'Wi-Fi' {
        # netsh writes its messages to stdout; never stop on them.
        $ErrorActionPreference = 'Continue'
        if (-not (Get-Command -Name 'netsh.exe' -ErrorAction SilentlyContinue)) { return }

        $lines = @(& netsh.exe wlan show interfaces 2>$null)
        $ssidLine = $lines | Where-Object { $_ -match '^\s*SSID\s*:' } | Select-Object -First 1
        if (-not $ssidLine) { return }

        $ssid = ($ssidLine -replace '^\s*SSID\s*:\s*', '').Trim()
        $signalLine = $lines | Where-Object { $_ -match '^\s*Signal\s*:\s*\d+\s*%' } | Select-Object -First 1
        $text = $ssid
        if ($signalLine) { $text += '  signal ' + ($signalLine -replace '[^\d]', '') + '%' }
        Add-Row 'Wi-Fi' $text
    }

    if (-not $SkipInternetCheck) {
        Invoke-Check 'Internet' {
            $target = 'www.msftconnecttest.com'
            $watch = [System.Diagnostics.Stopwatch]::StartNew()

            $addresses = @()
            try {
                $addresses = @([System.Net.Dns]::GetHostAddresses($target))
            }
            catch {
                $addresses = @()
            }
            if ($addresses.Count -eq 0) {
                Add-Row 'Internet' 'no connection (DNS lookup failed)' -Status 'Fail'
                return
            }

            $connected = $false
            $client = New-Object System.Net.Sockets.TcpClient
            try {
                $task = $client.ConnectAsync($target, 443)
                $connected = $task.Wait(3000) -and $client.Connected
            }
            catch {
                $connected = $false
            }
            finally {
                $client.Close()
            }

            if ($connected) {
                Add-Row 'Internet' ('connected  (DNS and HTTPS in {0} ms)' -f $watch.ElapsedMilliseconds) -Status 'OK'
            }
            else {
                Add-Row 'Internet' 'DNS works, HTTPS (443) not reachable directly - proxy?' -Status 'Warn'
            }
        }
    }

    Invoke-Check 'VPN' {
        $pattern = 'VPN|WireGuard|Wintun|TAP-Windows|OpenVPN|AnyConnect|GlobalProtect|PANGP|Fortinet|FortiClient|' +
                   'Juniper|Pulse Secure|Ivanti|Zscaler|Check Point|SonicWall|NordLynx|Tailscale'

        $connected = New-Object System.Collections.Generic.List[string]
        Get-NetAdapter -ErrorAction SilentlyContinue |
            Where-Object { [string]$_.Status -eq 'Up' -and ($_.InterfaceDescription -match $pattern -or $_.Name -match $pattern) } |
            ForEach-Object { $connected.Add($_.Name) }

        if (Get-Command -Name 'Get-VpnConnection' -ErrorAction SilentlyContinue) {
            $profiles = @(Get-VpnConnection -ErrorAction SilentlyContinue) +
                        @(Get-VpnConnection -AllUserConnection -ErrorAction SilentlyContinue)
            foreach ($vpn in $profiles) {
                if ($vpn -and [string]$vpn.ConnectionStatus -eq 'Connected') { $connected.Add($vpn.Name) }
            }
        }

        if ($connected.Count -gt 0) {
            Add-Row 'VPN' ('connected: ' + ($connected -join ', '))
        }
        else {
            Add-Row 'VPN' 'not connected'
        }
    }
}

function Invoke-SecuritySection {
    Invoke-Check 'Antivirus' {
        # Windows Security Center (client versions of Windows only).
        $products = @(Get-CimInstance -Namespace 'root/SecurityCenter2' -ClassName 'AntiVirusProduct' -ErrorAction Stop)
        if ($products.Count -eq 0) {
            Add-Row 'Antivirus' 'no antivirus registered' -Status 'Fail'
            return
        }

        # productState: bits 12-15 = 1 when enabled, bits 4-7 = 0 when up to date.
        $anyEnabled = $false
        $outdated = $false
        $parts = foreach ($product in $products) {
            $productState = [int]$product.productState
            $enabled = (($productState -shr 12) -band 0xF) -eq 1
            $current = (($productState -shr 4) -band 0xF) -eq 0
            if ($enabled) { $anyEnabled = $true }
            if ($enabled -and -not $current) { $outdated = $true }

            $flags = @(
                if ($enabled) { 'on' } else { 'off' }
                if ($current) { 'up to date' } else { 'outdated' }
            )
            '{0} ({1})' -f $product.displayName, ($flags -join ', ')
        }

        $status = if (-not $anyEnabled) { 'Fail' } elseif ($outdated) { 'Warn' } else { 'OK' }
        Add-Row 'Antivirus' ($parts -join '; ') -Status $status
    }

    Invoke-Check 'Defender' {
        if (-not (Get-Command -Name 'Get-MpComputerStatus' -ErrorAction SilentlyContinue)) { return }
        $defender = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if (-not $defender) { return }

        if ($defender.AMRunningMode -and [string]$defender.AMRunningMode -ne 'Normal') {
            Add-Row 'Defender' ('{0} (another antivirus is active)' -f $defender.AMRunningMode)
            return
        }

        $signatureAge = [int]$defender.AntivirusSignatureAge
        $realtime = if ($defender.RealTimeProtectionEnabled) { 'on' } else { 'OFF' }
        $quickScan = if ([int64]$defender.QuickScanAge -gt 3650) { 'never' } else { '{0} d ago' -f $defender.QuickScanAge }
        $status = if (-not $defender.RealTimeProtectionEnabled -or $signatureAge -gt 3) { 'Warn' } else { 'OK' }

        Add-Row 'Defender' ('real-time {0}, signatures {1} d old, quick scan {2}' -f $realtime, $signatureAge, $quickScan) -Status $status
    }

    Invoke-Check 'Firewall' {
        $profiles = @(Get-NetFirewallProfile -ErrorAction Stop)
        $off = @($profiles | Where-Object { [string]$_.Enabled -ne 'True' })
        $text = ($profiles | ForEach-Object {
                '{0} {1}' -f $_.Name, $(if ([string]$_.Enabled -eq 'True') { 'on' } else { 'OFF' })
            }) -join ', '
        $status = if ($off.Count -gt 0) { 'Warn' } else { 'OK' }
        Add-Row 'Firewall' $text -Status $status
    }

    Invoke-Check 'BitLocker' {
        $drive = $env:SystemDrive
        $text = $null
        $status = 'Info'

        if ($isAdmin -and (Get-Command -Name 'Get-BitLockerVolume' -ErrorAction SilentlyContinue)) {
            $volume = Get-BitLockerVolume -MountPoint $drive -ErrorAction SilentlyContinue
            if ($volume) {
                $text = '{0} protection {1}, {2}% encrypted' -f $drive, $volume.ProtectionStatus, $volume.EncryptionPercentage
                $status = if ([string]$volume.ProtectionStatus -eq 'On') { 'OK' } else { 'Warn' }
            }
        }

        if (-not $text) {
            # Works without admin rights: the BitLocker state shown in Explorer.
            $shell = New-Object -ComObject 'Shell.Application'
            $value = $shell.NameSpace($drive + '\').Self.ExtendedProperty('System.Volume.BitLockerProtection')
            $states = @{ 1 = 'on'; 2 = 'off'; 3 = 'encrypting'; 4 = 'decrypting'; 5 = 'suspended'; 6 = 'on (locked)'; 8 = 'waiting for activation' }

            if ($null -ne $value -and $states.ContainsKey([int]$value)) {
                $stateName = $states[[int]$value]
                $text = '{0} {1}' -f $drive, $stateName
                $status = if ([int]$value -in @(1, 6)) { 'OK' } elseif ([int]$value -in @(3, 4)) { 'Info' } else { 'Warn' }
            }
            else {
                $text = 'not available on this edition'
            }
        }

        Add-Row 'BitLocker' $text -Status $status
    }

    Invoke-Check 'Secure Boot' {
        $secureBoot = Get-RegistryValue 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State' 'UEFISecureBootEnabled'
        if ($secureBoot -eq 1) {
            Add-Row 'Secure Boot' 'on' -Status 'OK'
        }
        elseif ($null -eq $secureBoot) {
            Add-Row 'Secure Boot' 'not supported (legacy BIOS mode)'
        }
        else {
            Add-Row 'Secure Boot' 'off' -Status 'Warn'
        }
    }

    Invoke-Check 'UAC' {
        $lua = Get-RegistryValue 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'EnableLUA'
        if ($lua -eq 0) {
            Add-Row 'UAC' 'off' -Status 'Warn'
        }
        else {
            Add-Row 'UAC' 'on' -Status 'OK'
        }
    }

    if ($isAdmin) {
        Invoke-Check 'TPM' {
            $tpm = Get-CimInstance -Namespace 'root/cimv2/Security/MicrosoftTpm' -ClassName 'Win32_Tpm' -ErrorAction Stop
            if (-not $tpm) {
                Add-Row 'TPM' 'not found' -Status 'Warn'
                return
            }
            $version = ([string]$tpm.SpecVersion -split ',')[0].Trim()
            if ($tpm.IsEnabled_InitialValue) {
                Add-Row 'TPM' ('version {0}, enabled' -f $version) -Status 'OK'
            }
            else {
                Add-Row 'TPM' ('version {0}, disabled' -f $version) -Status 'Warn'
            }
        }
    }
}

function Invoke-EventsSection {
    foreach ($logName in @('System', 'Application')) {
        Invoke-Check "$logName log" {
            $events = @(Get-WinEvent -MaxEvents 5000 -ErrorAction SilentlyContinue -FilterHashtable @{
                    LogName   = $logName
                    Level     = 1, 2
                    StartTime = $since
                })

            $critical = @($events | Where-Object { $_.Level -eq 1 }).Count
            $errorCount = $events.Count - $critical
            $status = if ($critical -gt 0) { 'Warn' } else { 'OK' }
            Add-Row "$logName log" ('{0} critical, {1} errors' -f $critical, $errorCount) -Status $status

            if ($events.Count -gt 0) {
                $top = $events |
                    Group-Object -Property ProviderName |
                    Sort-Object -Property Count -Descending |
                    Select-Object -First 3 |
                    ForEach-Object { '{0} ({1})' -f ($_.Name -replace '^Microsoft-Windows-', ''), $_.Count }
                Add-Row "$logName log" ('top: ' + ($top -join ', ')) -More
            }
        }
    }

    Invoke-Check 'Blue screens' {
        $bugChecks = @(Get-WinEvent -ErrorAction SilentlyContinue -FilterHashtable @{
                LogName      = 'System'
                ProviderName = 'Microsoft-Windows-WER-SystemErrorReporting'
                Id           = 1001
                StartTime    = $since
            })
        if ($bugChecks.Count -eq 0) {
            Add-Row 'Blue screens' 'none' -Status 'OK'
        }
        else {
            Add-Row 'Blue screens' ('{0}, last {1}' -f $bugChecks.Count, (Format-Date $bugChecks[0].TimeCreated)) -Status 'Fail'
        }
    }

    Invoke-Check 'App crashes' {
        $crashes = @(Get-WinEvent -MaxEvents 500 -ErrorAction SilentlyContinue -FilterHashtable @{
                LogName      = 'Application'
                ProviderName = 'Application Error'
                Id           = 1000
                StartTime    = $since
            })
        if ($crashes.Count -eq 0) {
            Add-Row 'App crashes' 'none' -Status 'OK'
            return
        }

        $top = $crashes |
            Group-Object -Property { [string]$_.Properties[0].Value } |
            Sort-Object -Property Count -Descending |
            Select-Object -First 3 |
            ForEach-Object { '{0} ({1})' -f $_.Name, $_.Count }
        Add-Row 'App crashes' ('{0}  -  {1}' -f $crashes.Count, ($top -join ', '))
    }
}

function Invoke-DevicesSection {
    Invoke-Check 'Problem devices' {
        # Problem code 22 = disabled on purpose, listed separately below.
        $devices = @(Get-CimInstance -ClassName 'Win32_PnPEntity' -Filter 'ConfigManagerErrorCode <> 0' |
                Where-Object { $_.ConfigManagerErrorCode -ne 22 } |
                Sort-Object -Property Name)

        if ($devices.Count -eq 0) {
            Add-Row 'Problem devices' 'none' -Status 'OK'
            return
        }

        $missing = @($devices | Where-Object { $_.ConfigManagerErrorCode -eq 28 }).Count
        Add-Row 'Problem devices' ('{0} device(s), {1} without driver' -f $devices.Count, $missing) -Status 'Warn'
        foreach ($device in @($devices | Select-Object -First 5)) {
            $deviceName = if ($device.Name) { $device.Name } else { $device.DeviceID }
            Add-Row 'Problem devices' ('code {0,-3} {1}' -f $device.ConfigManagerErrorCode, $deviceName) -More
        }
        if ($devices.Count -gt 5) {
            Add-Row 'Problem devices' ('... and {0} more' -f ($devices.Count - 5)) -More
        }
    }

    Invoke-Check 'Disabled' {
        $disabled = @(Get-CimInstance -ClassName 'Win32_PnPEntity' -Filter 'ConfigManagerErrorCode = 22')
        if ($disabled.Count -gt 0) {
            Add-Row 'Disabled' ('{0} device(s) disabled: {1}' -f $disabled.Count, (($disabled | Select-Object -First 3 | ForEach-Object { $_.Name }) -join ', '))
        }
    }
}

function Invoke-ServicesSection {
    Invoke-Check 'Failed services' {
        # Automatic services that are not running and stopped with an error.
        # Exit code 0 = stopped normally, 1077 = not started since boot (trigger start).
        $failed = @(Get-CimInstance -ClassName 'Win32_Service' -Filter "StartMode='Auto' AND State<>'Running'" |
                Where-Object { $_.ExitCode -ne 0 -and $_.ExitCode -ne 1077 } |
                Sort-Object -Property DisplayName)

        if ($failed.Count -eq 0) {
            Add-Row 'Failed services' 'none' -Status 'OK'
            return
        }

        Add-Row 'Failed services' ('{0} automatic service(s) not running' -f $failed.Count) -Status 'Warn'
        foreach ($service in @($failed | Select-Object -First 5)) {
            Add-Row 'Failed services' ('{0}  (exit code {1})' -f $service.DisplayName, $service.ExitCode) -More
        }
    }

    Invoke-Check 'Core services' {
        $coreServices = [ordered]@{
            EventLog          = 'Event Log'
            Winmgmt           = 'WMI'
            Dnscache          = 'DNS Client'
            mpssvc            = 'Firewall'
            CryptSvc          = 'Cryptographic'
            LanmanWorkstation = 'Workstation'
        }

        $stopped = foreach ($serviceName in $coreServices.Keys) {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service -and [string]$service.Status -ne 'Running') { $coreServices[$serviceName] }
        }
        $stopped = @($stopped)

        if ($stopped.Count -eq 0) {
            Add-Row 'Core services' ('running: ' + (@($coreServices.Values) -join ', ')) -Status 'OK'
        }
        else {
            Add-Row 'Core services' ('stopped: ' + ($stopped -join ', ')) -Status 'Fail'
        }
    }
}

# =============================================================================
#  Run
# =============================================================================

$allRows = New-Object System.Collections.Generic.List[object]

if (-not $AsObject) {
    $elevation = if ($isAdmin) { 'elevated' } else { 'standard user' }
    Write-ReportLine -Text $Separator -Color 'DarkGray'
    Write-Title -Title 'SYSTEM DIAGNOSTICS' -Right ($startTime.ToString('yyyy-MM-dd HH:mm')) -RightColor 'DarkGray'
    Write-ReportLine -Text @(' ', (Limit-Text ('{0} | {1} {2} | PowerShell {3} | {4}' -f $env:COMPUTERNAME, $osName, $osRelease, $PSVersionTable.PSVersion, $elevation) ($Width - 1))) -Color @('', 'DarkGray')
    Write-ReportLine -Text $Separator -Color 'DarkGray'
}

$index = 0
foreach ($sectionName in $selectedSections) {
    $index++
    Write-Progress -Activity 'System diagnostics' -Status $sectionTitles[$sectionName] -PercentComplete (($index - 1) / $selectedSections.Count * 100)

    $state.Section = $sectionName
    $rows.Clear()
    try {
        & "Invoke-$($sectionName)Section"
    }
    catch {
        Add-Row -Name $sectionName -Value ('n/a - ' + $_.Exception.Message)
    }

    $sectionRows = @($rows.ToArray())
    foreach ($row in $sectionRows) { $allRows.Add($row) }
    $visibleRows = @(Select-VisibleRow $sectionRows)

    if ($AsObject) {
        $visibleRows | Select-Object -Property Section, Check, Value, Status
        continue
    }
    if ($visibleRows.Count -eq 0) { continue }

    # One block per section: a line above and a line below.
    $problems = Get-ProblemText $sectionRows
    Write-ReportLine -Text ''
    Write-ReportLine -Text $Separator -Color 'DarkGray'
    Write-Title -Title $sectionTitles[$sectionName] -Right $problems[0] -RightColor $problems[1]
    foreach ($row in $visibleRows) { Write-Row $row }
    Write-ReportLine -Text $Separator -Color 'DarkGray'
}

Write-Progress -Activity 'System diagnostics' -Completed

if ($AsObject) { return }

# =============================================================================
#  Summary
# =============================================================================

$problemRows = @($allRows | Where-Object { -not $_.More -and $_.Status -in @('Warn', 'Fail') })
$problems = Get-ProblemText $problemRows
$seconds = '{0:0.0}' -f $timer.Elapsed.TotalSeconds

Write-ReportLine -Text ''
Write-ReportLine -Text $Separator -Color 'DarkGray'

if ($problemRows.Count -eq 0) {
    Write-Title -Title 'SUMMARY' -Right 'all checks OK' -RightColor 'Green'
}
else {
    Write-Title -Title 'SUMMARY' -Right $problems[0] -RightColor $problems[1]

    # With -ProblemsOnly the sections above already show only the problems.
    if (-not $ProblemsOnly) {
        foreach ($row in $problemRows) {
            $tag = $tagText[$row.Status].PadRight(5)
            $label = (Limit-Text $row.Check $NameWidth).PadRight($NameWidth)
            $value = Limit-Text $row.Value ($Width - 23)
            Write-ReportLine -Text @(' ', $tag, $label, ' ', $value) -Color @('', $tagColor[$row.Status], '', '', '')
        }
    }
}

Write-ReportLine -Text @(' ', ('Done in {0} s. Read-only: nothing was changed.' -f $seconds)) -Color @('', 'DarkGray')
Write-ReportLine -Text $Separator -Color 'DarkGray'
