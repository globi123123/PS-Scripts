#Requires -Version 5.1
<#
.SYNOPSIS
    Shows the status of all VPN connections on the local computer.

.DESCRIPTION
    Get-VPNStatus combines two sources:

      1. VPN profiles that are built into Windows (Settings > Network &
         Internet > VPN), for the current user and for all users.
      2. Network adapters of common VPN clients such as WireGuard,
         OpenVPN, Cisco AnyConnect, GlobalProtect, FortiClient or Zscaler.

    For every connection the script returns the name, the source, the
    status, the server address, the tunnel type and the IPv4 address
    that is currently assigned.

    The script only reads information. It does not connect or disconnect
    anything.

.PARAMETER ConnectedOnly
    Only return connections that are currently connected.

.EXAMPLE
    .\Get-VPNStatus.ps1

.EXAMPLE
    .\Get-VPNStatus.ps1 -ConnectedOnly | Select-Object Name, IPv4Address

.NOTES
    Name:     Get-VPNStatus
    Category: VPN
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [switch]$ConnectedOnly
)

# Interface names and descriptions used by common VPN clients.
$vpnPattern = 'VPN|WireGuard|Wintun|TAP-Windows|OpenVPN|AnyConnect|GlobalProtect|PANGP|' +
              'Fortinet|FortiClient|Juniper|Pulse Secure|Ivanti|Zscaler|Check Point|SonicWall|' +
              'NordLynx|Tailscale'

function Get-InterfaceIPv4 {
    param([string]$Alias, [int]$Index)

    $query = @{ AddressFamily = 'IPv4'; ErrorAction = 'SilentlyContinue' }
    if ($Index) { $query.InterfaceIndex = $Index } else { $query.InterfaceAlias = $Alias }

    $addresses = @(Get-NetIPAddress @query | Select-Object -ExpandProperty IPAddress)
    if ($addresses.Count -gt 0) { return $addresses -join ', ' }
    return $null
}

$connections = New-Object System.Collections.Generic.List[object]

# --- 1. Built-in Windows VPN profiles ------------------------------------------
if (Get-Command -Name 'Get-VpnConnection' -ErrorAction SilentlyContinue) {
    $profiles = @(
        Get-VpnConnection -ErrorAction SilentlyContinue |
            Select-Object *, @{ Name = 'Scope'; Expression = { 'Current user' } }
        Get-VpnConnection -AllUserConnection -ErrorAction SilentlyContinue |
            Select-Object *, @{ Name = 'Scope'; Expression = { 'All users' } }
    )

    foreach ($vpn in $profiles) {
        $connected = [string]$vpn.ConnectionStatus -eq 'Connected'

        $connections.Add([pscustomobject]@{
            Name          = $vpn.Name
            Source        = "Windows VPN ($($vpn.Scope))"
            Status        = [string]$vpn.ConnectionStatus
            ServerAddress = $vpn.ServerAddress
            TunnelType    = [string]$vpn.TunnelType
            SplitTunnel   = [bool]$vpn.SplitTunneling
            IPv4Address   = if ($connected) { Get-InterfaceIPv4 -Alias $vpn.Name } else { $null }
        })
    }
}

# --- 2. Adapters of third-party VPN clients ------------------------------------
$adapters = @(Get-NetAdapter -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceDescription -match $vpnPattern -or $_.Name -match $vpnPattern })

foreach ($adapter in $adapters) {
    $isUp = [string]$adapter.Status -eq 'Up'

    $connections.Add([pscustomobject]@{
        Name          = $adapter.Name
        Source        = 'VPN client adapter'
        Status        = if ($isUp) { 'Connected' } else { [string]$adapter.Status }
        ServerAddress = $null
        TunnelType    = $adapter.InterfaceDescription
        SplitTunnel   = $null
        IPv4Address   = if ($isUp) { Get-InterfaceIPv4 -Index $adapter.ifIndex } else { $null }
    })
}

# --- Result -------------------------------------------------------------------
$result = $connections
if ($ConnectedOnly) {
    $result = @($connections | Where-Object { $_.Status -eq 'Connected' })
}

if (@($result).Count -eq 0) {
    Write-Information 'No matching VPN connections found.' -InformationAction Continue
    return
}

$result
