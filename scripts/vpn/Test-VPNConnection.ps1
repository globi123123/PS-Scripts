#Requires -Version 5.1
<#
.SYNOPSIS
    Tests whether internal targets are reachable through the VPN.

.DESCRIPTION
    Test-VPNConnection checks one or more targets (host names or IP
    addresses) that should only be reachable through the VPN, for example
    a file server or an intranet site. For every target it:

      1. resolves the name with DNS
      2. tests the connection with ICMP (ping) or a TCP port
      3. checks which network interface Windows would use for the target
         and whether that interface belongs to a VPN

    This makes it easy to tell apart "VPN is down", "DNS does not work
    through the VPN" and "the traffic does not use the VPN at all".

    The script only reads information and sends test packets.

.PARAMETER Target
    One or more host names or IP addresses.

.PARAMETER Port
    Test this TCP port instead of using ping. Use this when ICMP is
    blocked by a firewall, for example 443 or 445.

.PARAMETER TimeoutMs
    Timeout per test in milliseconds. Default: 2000.

.EXAMPLE
    .\Test-VPNConnection.ps1 -Target fileserver01.corp.local

.EXAMPLE
    .\Test-VPNConnection.ps1 -Target intranet.corp.local, 10.10.0.5 -Port 443

.NOTES
    Name:     Test-VPNConnection
    Category: VPN
    Type:     Read-Only
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [string[]]$Target,

    [ValidateRange(1, 65535)]
    [int]$Port,

    [ValidateRange(100, 30000)]
    [int]$TimeoutMs = 2000
)

$vpnPattern = 'VPN|WireGuard|Wintun|TAP-Windows|OpenVPN|AnyConnect|GlobalProtect|PANGP|' +
              'Fortinet|FortiClient|Juniper|Pulse Secure|Ivanti|Zscaler|Check Point|SonicWall|' +
              'NordLynx|Tailscale'

# --- Find all interfaces that belong to a VPN ---------------------------------
$vpnInterfaces = @{}

Get-NetAdapter -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceDescription -match $vpnPattern -or $_.Name -match $vpnPattern } |
    ForEach-Object { $vpnInterfaces[[int]$_.ifIndex] = $_.Name }

if (Get-Command -Name 'Get-VpnConnection' -ErrorAction SilentlyContinue) {
    $profiles = @(Get-VpnConnection -ErrorAction SilentlyContinue) +
                @(Get-VpnConnection -AllUserConnection -ErrorAction SilentlyContinue)

    foreach ($vpn in $profiles) {
        # A connected Windows VPN profile has an interface with the same name.
        Get-NetIPInterface -InterfaceAlias $vpn.Name -ErrorAction SilentlyContinue |
            ForEach-Object { $vpnInterfaces[[int]$_.ifIndex] = $vpn.Name }
    }
}

if ($vpnInterfaces.Count -eq 0) {
    Write-Warning 'No active VPN interface found. Targets will probably not be reachable.'
}

# --- Test every target --------------------------------------------------------
foreach ($name in $Target) {
    $address = $null
    $dnsResolved = $false
    $reachable = $false
    $latency = $null
    $interfaceIndex = $null
    $interfaceAlias = $null

    # 1. DNS
    $parsed = $null
    if ([System.Net.IPAddress]::TryParse($name, [ref]$parsed)) {
        $address = $parsed.IPAddressToString
    }
    else {
        try {
            $address = [System.Net.Dns]::GetHostAddresses($name) |
                Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
                Select-Object -First 1 -ExpandProperty IPAddressToString
            $dnsResolved = [bool]$address
        }
        catch {
            Write-Verbose "DNS lookup for '$name' failed: $($_.Exception.Message)"
        }
    }

    if ($address) {
        # 2. Route: which interface would Windows use?
        $route = Find-NetRoute -RemoteIPAddress $address -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($route) {
            $interfaceIndex = [int]$route.InterfaceIndex
            $interfaceAlias = $route.InterfaceAlias
        }

        # 3. Reachability
        if ($Port) {
            $client = New-Object System.Net.Sockets.TcpClient
            try {
                $timer = [System.Diagnostics.Stopwatch]::StartNew()
                $task = $client.ConnectAsync($address, $Port)
                if ($task.Wait($TimeoutMs) -and $client.Connected) {
                    $reachable = $true
                    $latency = $timer.ElapsedMilliseconds
                }
            }
            catch {
                Write-Verbose "TCP test to ${address}:$Port failed: $($_.Exception.Message)"
            }
            finally {
                $client.Close()
            }
        }
        else {
            $ping = New-Object System.Net.NetworkInformation.Ping
            try {
                $reply = $ping.Send($address, $TimeoutMs)
                if ($reply.Status -eq 'Success') {
                    $reachable = $true
                    $latency = $reply.RoundtripTime
                }
            }
            catch {
                Write-Verbose "Ping to $address failed: $($_.Exception.Message)"
            }
            finally {
                $ping.Dispose()
            }
        }
    }

    [pscustomobject]@{
        Target      = $name
        Address     = $address
        DnsResolved = if ($name -eq $address) { $null } else { $dnsResolved }
        Test        = if ($Port) { "TCP $Port" } else { 'ICMP' }
        Reachable   = $reachable
        LatencyMs   = $latency
        Interface   = $interfaceAlias
        ViaVpn      = [bool]($interfaceIndex -and $vpnInterfaces.ContainsKey($interfaceIndex))
    }
}
