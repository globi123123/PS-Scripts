#Requires -Version 5.1
<#
.SYNOPSIS
    Lists the VPN network adapters and their IP configuration.

.DESCRIPTION
    Get-VPNAdapters finds network adapters that belong to a VPN client
    (WireGuard, OpenVPN/TAP, Cisco AnyConnect, GlobalProtect, FortiClient,
    Zscaler and others) and returns their state, IP addresses, DNS servers,
    MTU and driver information.

    Use -Pattern to add the adapter name of a VPN client that is not
    detected automatically. With -IncludeHidden the hidden "WAN Miniport"
    adapters used by the built-in Windows VPN are listed as well.

    The script only reads information.

.PARAMETER Pattern
    Additional regular expression that is matched against the adapter
    name and description, for example 'Contoso|MyVPN'.

.PARAMETER IncludeHidden
    Also include hidden adapters such as "WAN Miniport (IKEv2)".

.PARAMETER UpOnly
    Only return adapters whose status is "Up".

.EXAMPLE
    .\Get-VPNAdapters.ps1

.EXAMPLE
    .\Get-VPNAdapters.ps1 -Pattern 'Contoso' -UpOnly | Format-List

.NOTES
    Name:     Get-VPNAdapters
    Category: VPN
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [string]$Pattern,

    [switch]$IncludeHidden,

    [switch]$UpOnly
)

$vpnPattern = 'VPN|WireGuard|Wintun|TAP-Windows|OpenVPN|AnyConnect|GlobalProtect|PANGP|' +
              'Fortinet|FortiClient|Juniper|Pulse Secure|Ivanti|Zscaler|Check Point|SonicWall|' +
              'NordLynx|Tailscale'

if ($Pattern) { $vpnPattern = "$vpnPattern|$Pattern" }
if ($IncludeHidden) { $vpnPattern = "$vpnPattern|WAN Miniport" }

$adapters = @(Get-NetAdapter -IncludeHidden:$IncludeHidden -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceDescription -match $vpnPattern -or $_.Name -match $vpnPattern })

if ($UpOnly) {
    $adapters = @($adapters | Where-Object { [string]$_.Status -eq 'Up' })
}

if ($adapters.Count -eq 0) {
    Write-Information 'No VPN adapters found.' -InformationAction Continue
    return
}

foreach ($adapter in ($adapters | Sort-Object -Property Name)) {
    $ip = @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -ErrorAction SilentlyContinue)
    $dns = Get-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue

    [pscustomobject]@{
        Name           = $adapter.Name
        Description    = $adapter.InterfaceDescription
        Status         = [string]$adapter.Status
        InterfaceIndex = $adapter.ifIndex
        IPv4Address    = @($ip | Where-Object { $_.AddressFamily -eq 'IPv4' } | ForEach-Object { $_.IPAddress }) -join ', '
        IPv6Address    = @($ip | Where-Object { $_.AddressFamily -eq 'IPv6' } | ForEach-Object { $_.IPAddress }) -join ', '
        DnsServers     = @($dns | ForEach-Object { $_.ServerAddresses }) -join ', '
        MacAddress     = $adapter.MacAddress
        LinkSpeed      = $adapter.LinkSpeed
        MtuSize        = $adapter.MtuSize
        DriverProvider = $adapter.DriverProvider
        DriverVersion  = $adapter.DriverVersion
    }
}
