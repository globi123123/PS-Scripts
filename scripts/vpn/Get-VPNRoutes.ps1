#Requires -Version 5.1
<#
.SYNOPSIS
    Lists the routes that point to a VPN interface.

.DESCRIPTION
    PLACEHOLDER - this script has not been implemented yet.

    Planned behaviour:
      - Detect VPN interfaces (same detection as Get-VPNAdapters)
      - List all IPv4 and IPv6 routes that use one of these interfaces
      - Detect whether the VPN is a full tunnel (default route through
        the VPN) or a split tunnel (only some networks)

.PARAMETER AddressFamily
    IPv4, IPv6 or All. Default: IPv4.

.NOTES
    Name:     Get-VPNRoutes
    Category: VPN
    Type:     Read-Only
    Status:   Placeholder
#>
[CmdletBinding()]
param(
    [ValidateSet('IPv4', 'IPv6', 'All')]
    [string]$AddressFamily = 'IPv4'
)

# TODO: Find VPN interfaces with Get-NetAdapter and Get-VpnConnection.
# TODO: Read routes with Get-NetRoute -InterfaceIndex.
# TODO: Report "Full tunnel" when 0.0.0.0/0 uses a VPN interface.

throw 'Get-VPNRoutes is a placeholder and has not been implemented yet.'
