#Requires -Version 5.1
<#
.SYNOPSIS
    Lists driver related errors from the System event log.

.DESCRIPTION
    PLACEHOLDER - this script has not been implemented yet.

    Planned behaviour:
      - Read errors and warnings of the last days from the System log
      - Include the providers Kernel-PnP, DriverFrameworks-UserMode
        and Service Control Manager (driver services that failed to start)
      - Group repeated errors per device and show the first and last
        occurrence

.PARAMETER Days
    Number of days to look back. Default: 7.

.NOTES
    Name:     Get-DriverErrors
    Category: Drivers
    Type:     Read-Only
    Status:   Placeholder
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 90)]
    [int]$Days = 7
)

# TODO: Query the System log with Get-WinEvent -FilterHashtable.
# TODO: Filter driver related providers and event IDs.
# TODO: Group the events per device and return a summary.

throw 'Get-DriverErrors is a placeholder and has not been implemented yet.'
