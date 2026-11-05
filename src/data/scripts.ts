import type { ScriptDefinition } from './types';

/**
 * Metadata of every script in the library.
 *
 * To add a script:
 *   1. Put the .ps1 file into /scripts/<category>/<Name>.ps1
 *   2. Add an entry below. `name` must match the file name (without .ps1).
 *
 * The source code is loaded automatically from the .ps1 file.
 */
export const scriptDefinitions: ScriptDefinition[] = [
  // ---------------------------------------------------------------------------
  // Windows Updates
  // ---------------------------------------------------------------------------
  {
    name: 'Get-WindowsUpdateStatus',
    category: 'windows-updates',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Shows the Windows Update service state, pending updates and the last successful search and installation.',
    description: [
      'Collects the most important Windows Update information in one object: the state of the Windows Update service, the date of the last successful search and installation, the number of pending updates split by severity and type, and whether Windows Update is waiting for a reboot.',
      'By default the script runs an online search against Windows Update or WSUS, which can take a moment. With -UseCache it only reads the local cache of the last scan and returns almost instantly.',
    ],
    keywords: ['wuauserv', 'pending updates', 'patch', 'patch status', 'wsus', 'severity', 'critical', 'compliance'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: [
        'Runs as a standard user',
        'Uses the Windows Update Agent COM API (Microsoft.Update.Session)',
        'Network access to Windows Update or WSUS, unless -UseCache is used',
      ],
    },
    parameters: [
      { name: 'UseCache', type: 'switch', description: 'Search the local update cache instead of contacting Windows Update or WSUS. Faster, but only as current as the last scan.' },
      { name: 'IncludeUpdates', type: 'switch', description: 'Adds an Updates property with the list of pending updates (title, KB, severity, type, size).' },
    ],
    examples: [
      {
        title: 'Show the update status',
        code: '.\\Get-WindowsUpdateStatus.ps1',
      },
      {
        title: 'List pending updates from the cache',
        description: 'Fast check without contacting the update server.',
        code: ".\\Get-WindowsUpdateStatus.ps1 -UseCache -IncludeUpdates |\n    Select-Object -ExpandProperty Updates |\n    Format-Table Title, KB, Severity, SizeMB",
      },
      {
        title: 'Warn when critical updates are missing',
        code: "$status = .\\Get-WindowsUpdateStatus.ps1\nif ($status.PendingCritical -gt 0) {\n    Write-Warning \"$($status.PendingCritical) critical updates are pending\"\n}",
      },
    ],
    added: '2026-09-08',
  },
  {
    name: 'Get-UpdateHistory',
    category: 'windows-updates',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Lists the Windows Update installation history with KB number, result and HRESULT code.',
    description: [
      'Reads the update history from the Windows Update Agent, the same list that Windows shows under Settings > Windows Update > Update history, and returns one object per entry.',
      'Every entry contains the date, the KB number, the title, the operation (installation or uninstallation), the result and the HRESULT code. The HRESULT is the starting point to find out why an installation failed.',
    ],
    keywords: ['history', 'installed updates', 'kb', 'hotfix', 'failed updates', 'hresult', 'error code'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: ['Runs as a standard user', 'Uses the Windows Update Agent COM API (Microsoft.Update.Session)'],
    },
    parameters: [
      { name: 'Days', type: 'int', default: '90', description: 'Number of days to look back (1 to 3650).' },
      { name: 'Result', type: 'string', default: 'All', description: 'Filter by result: All, Succeeded or Failed. Failed also includes aborted installations.' },
      { name: 'Title', type: 'string', description: 'Only return entries whose title contains this text, for example a KB number.' },
    ],
    examples: [
      {
        title: 'Updates of the last 90 days',
        code: '.\\Get-UpdateHistory.ps1 | Format-Table Date, KB, Result, Title -AutoSize',
      },
      {
        title: 'Failed updates of the last 30 days',
        description: 'Includes the HRESULT code for troubleshooting.',
        code: '.\\Get-UpdateHistory.ps1 -Days 30 -Result Failed',
      },
      {
        title: 'Search for a specific KB',
        code: ".\\Get-UpdateHistory.ps1 -Days 365 -Title 'KB5043'",
      },
    ],
    added: '2026-09-15',
  },
  {
    name: 'Get-WindowsUpdateErrors',
    category: 'windows-updates',
    classification: 'read-only',
    status: 'placeholder',
    summary: 'Lists recent Windows Update errors from the event log with a readable description of the error code.',
    description: [
      'Planned: reads the WindowsUpdateClient operational log, collects failed scans, downloads and installations and translates common HRESULT codes such as 0x8024xxxx and 0x800Fxxxx into readable messages.',
    ],
    keywords: ['event log', 'errors', 'hresult', '0x8024', 'troubleshooting', 'failed'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: ['Read access to the WindowsUpdateClient event log (standard users have it)'],
    },
    parameters: [{ name: 'Days', type: 'int', default: '30', description: 'Number of days to look back (1 to 365).' }],
    examples: [
      {
        title: 'Planned usage',
        code: '.\\Get-WindowsUpdateErrors.ps1 -Days 14',
      },
    ],
    added: '2026-10-22',
  },
  {
    name: 'Get-PendingReboot',
    category: 'windows-updates',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Checks all well-known registry and WMI locations to find out whether a reboot is pending.',
    description: [
      'Windows does not store "a reboot is pending" in one single place. This script checks Component Based Servicing, Windows Update, pending file rename operations, a pending computer rename, a pending domain join and, if installed, the Configuration Manager client.',
      'The result shows the overall state and every single check, so you can see why a reboot is pending. With -Quiet the script only returns $true or $false, which is handy in other scripts.',
    ],
    keywords: ['restart', 'reboot required', 'cbs', 'component based servicing', 'pendingfilerenameoperations', 'sccm', 'configmgr', 'registry'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: [
        'Read access to HKLM (standard users have it)',
        'The Configuration Manager check needs the ConfigMgr client and is skipped otherwise',
      ],
    },
    parameters: [{ name: 'Quiet', type: 'switch', description: 'Return only $true or $false instead of the detailed object.' }],
    examples: [
      {
        title: 'Show all checks',
        code: '.\\Get-PendingReboot.ps1',
      },
      {
        title: 'Use the result in a script',
        code: "if (.\\Get-PendingReboot.ps1 -Quiet) {\n    Write-Warning 'A reboot is pending. Please restart the computer.'\n}",
      },
    ],
    added: '2026-08-25',
  },

  // ---------------------------------------------------------------------------
  // Drivers
  // ---------------------------------------------------------------------------
  {
    name: 'Get-DriverInventory',
    category: 'drivers',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Lists all installed device drivers with provider, version, date, INF file and signature.',
    description: [
      'Returns one object per device driver with the device name, device class, provider, version, date, INF file and signature information. The data comes from the Win32_PnPSignedDriver WMI class.',
      'Filter by device class or provider, or hide the Microsoft inbox drivers to focus on vendor drivers. To save the inventory to a file, use Export-DriverInventory.',
    ],
    keywords: ['inventory', 'pnp', 'win32_pnpsigneddriver', 'driver version', 'inf', 'signed', 'hardware'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['CimCmdlets'],
      permissions: ['Read access to WMI (root\\cimv2)'],
    },
    parameters: [
      { name: 'DeviceClass', type: 'string[]', description: 'Only return drivers of these classes, e.g. NET, DISPLAY, MEDIA, USB.' },
      { name: 'Provider', type: 'string', description: "Only return drivers of this provider. Wildcards are supported, e.g. 'Intel*'." },
      { name: 'ExcludeMicrosoft', type: 'switch', description: 'Hide drivers provided by Microsoft.' },
    ],
    examples: [
      {
        title: 'Overview of all drivers',
        code: '.\\Get-DriverInventory.ps1 | Format-Table DeviceName, Provider, DriverVersion, DriverDate',
      },
      {
        title: 'Third-party network and graphics drivers',
        code: '.\\Get-DriverInventory.ps1 -DeviceClass NET, DISPLAY -ExcludeMicrosoft',
      },
      {
        title: 'All Intel drivers, oldest first',
        code: ".\\Get-DriverInventory.ps1 -Provider 'Intel*' | Sort-Object DriverDate",
      },
    ],
    added: '2026-09-29',
  },
  {
    name: 'Get-MissingDrivers',
    category: 'drivers',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Finds devices without an installed driver and shows their hardware ID.',
    description: [
      'Lists all devices that Windows reports with problem code 28, "The drivers for this device are not installed". These are the devices with a yellow warning sign under "Other devices" in Device Manager.',
      'The hardware ID is included so you can look up the matching driver. With -IncludeAllProblems the script returns every device with a problem code and a short description of the problem.',
    ],
    keywords: ['device manager', 'unknown device', 'problem code', 'code 28', 'yellow', 'hardware id', 'win32_pnpentity'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['CimCmdlets'],
      permissions: ['Read access to WMI (root\\cimv2)'],
    },
    parameters: [
      { name: 'IncludeAllProblems', type: 'switch', description: 'Return all devices with a problem code, not only devices with a missing driver.' },
    ],
    examples: [
      {
        title: 'Devices without a driver',
        code: '.\\Get-MissingDrivers.ps1',
      },
      {
        title: 'All devices with a problem',
        code: '.\\Get-MissingDrivers.ps1 -IncludeAllProblems | Format-Table Name, ErrorCode, Problem -AutoSize',
      },
    ],
    added: '2026-10-06',
  },
  {
    name: 'Get-DriverErrors',
    category: 'drivers',
    classification: 'read-only',
    status: 'placeholder',
    summary: 'Lists driver related errors from the System event log, grouped per device.',
    description: [
      'Planned: reads errors and warnings of Kernel-PnP, DriverFrameworks-UserMode and the Service Control Manager from the System log and groups repeated errors per device with the first and last occurrence.',
    ],
    keywords: ['event log', 'kernel-pnp', 'driver crash', 'service control manager', 'errors'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: ['Read access to the System event log (standard users have it)'],
    },
    parameters: [{ name: 'Days', type: 'int', default: '7', description: 'Number of days to look back (1 to 90).' }],
    examples: [
      {
        title: 'Planned usage',
        code: '.\\Get-DriverErrors.ps1 -Days 3',
      },
    ],
    added: '2026-10-29',
  },
  {
    name: 'Export-DriverInventory',
    category: 'drivers',
    classification: 'system-changes',
    status: 'implemented',
    summary: 'Exports the driver inventory of the computer to a CSV, JSON or HTML file.',
    description: [
      'Reads all installed device drivers and writes them to a file. The file name contains the computer name and a time stamp, so repeated exports never overwrite each other.',
      'The script supports -WhatIf and -Confirm. Run it with -WhatIf first to see which folder and file would be created.',
    ],
    keywords: ['export', 'report', 'csv', 'json', 'html', 'documentation', 'inventory'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['CimCmdlets'],
      permissions: ['Write access to the target folder', 'Read access to WMI (root\\cimv2)'],
    },
    changes: [
      'Creates the target folder if it does not exist',
      'Writes a new CSV, JSON or HTML file into the target folder',
      'Overwrites an existing file with the same name only when -Force is used',
    ],
    parameters: [
      { name: 'Format', type: 'string', default: 'Csv', description: 'File format: Csv, Json or Html.' },
      { name: 'Path', type: 'string', default: 'Documents\\DriverInventory', description: 'Target folder.' },
      { name: 'FileName', type: 'string', description: 'Custom file name. By default a name with computer name and time stamp is generated.' },
      { name: 'ExcludeMicrosoft', type: 'switch', description: 'Leave out drivers provided by Microsoft.' },
      { name: 'Force', type: 'switch', description: 'Overwrite the file if it already exists.' },
      { name: 'PassThru', type: 'switch', description: 'Return the created file as a FileInfo object.' },
    ],
    examples: [
      {
        title: 'Preview without writing anything',
        description: 'Shows the folder and file that would be created.',
        code: '.\\Export-DriverInventory.ps1 -Format Html -WhatIf',
      },
      {
        title: 'CSV export to the default folder',
        code: '.\\Export-DriverInventory.ps1',
      },
      {
        title: 'HTML report to a custom folder and open it',
        code: ".\\Export-DriverInventory.ps1 -Format Html -Path 'C:\\Reports' -PassThru |\n    Invoke-Item",
      },
    ],
    added: '2026-10-13',
  },

  // ---------------------------------------------------------------------------
  // VPN
  // ---------------------------------------------------------------------------
  {
    name: 'Get-VPNStatus',
    category: 'vpn',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Shows the status of built-in Windows VPN profiles and of common third-party VPN clients.',
    description: [
      'Combines the VPN profiles that are built into Windows, for the current user and for all users, with the network adapters of common VPN clients such as WireGuard, OpenVPN, Cisco AnyConnect, GlobalProtect, FortiClient and Zscaler.',
      'For every connection the script returns the source, the status, the server address, the tunnel type and the IPv4 address that is currently assigned.',
    ],
    keywords: ['vpn', 'connected', 'tunnel', 'wireguard', 'anyconnect', 'globalprotect', 'forticlient', 'openvpn', 'remote access'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['VpnClient', 'NetAdapter', 'NetTCPIP'],
      permissions: ['Runs as a standard user'],
    },
    parameters: [{ name: 'ConnectedOnly', type: 'switch', description: 'Only return connections that are currently connected.' }],
    examples: [
      {
        title: 'All VPN connections',
        code: '.\\Get-VPNStatus.ps1 | Format-Table Name, Source, Status, IPv4Address',
      },
      {
        title: 'Is any VPN connected?',
        code: "if (.\\Get-VPNStatus.ps1 -ConnectedOnly) {\n    'VPN is connected'\n}",
      },
    ],
    added: '2026-10-20',
  },
  {
    name: 'Get-VPNAdapters',
    category: 'vpn',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Lists VPN network adapters with IP addresses, DNS servers, MTU and driver details.',
    description: [
      'Finds network adapters that belong to a VPN client and returns their state, IPv4 and IPv6 addresses, DNS servers, MTU, link speed and driver information.',
      'Clients that are not detected automatically can be added with -Pattern. With -IncludeHidden the hidden WAN Miniport adapters of the built-in Windows VPN are listed as well.',
    ],
    keywords: ['adapter', 'network adapter', 'tap', 'wintun', 'wan miniport', 'mtu', 'dns', 'ip address'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['NetAdapter', 'NetTCPIP', 'DnsClient'],
      permissions: ['Runs as a standard user'],
    },
    parameters: [
      { name: 'Pattern', type: 'string', description: "Additional regular expression matched against adapter name and description, e.g. 'Contoso|MyVPN'." },
      { name: 'IncludeHidden', type: 'switch', description: 'Also include hidden adapters such as WAN Miniport (IKEv2).' },
      { name: 'UpOnly', type: 'switch', description: 'Only return adapters with status Up.' },
    ],
    examples: [
      {
        title: 'All detected VPN adapters',
        code: '.\\Get-VPNAdapters.ps1 | Format-Table Name, Status, IPv4Address, DnsServers',
      },
      {
        title: 'Custom VPN client, connected adapters only',
        code: ".\\Get-VPNAdapters.ps1 -Pattern 'Contoso' -UpOnly | Format-List",
      },
    ],
    added: '2026-10-27',
  },
  {
    name: 'Get-VPNRoutes',
    category: 'vpn',
    classification: 'read-only',
    status: 'placeholder',
    summary: 'Lists the routes that use a VPN interface and detects split or full tunnel.',
    description: [
      'Planned: detects VPN interfaces, lists all routes that point to them and reports whether the VPN is a full tunnel (default route through the VPN) or a split tunnel.',
    ],
    keywords: ['routes', 'routing table', 'split tunnel', 'full tunnel', 'default route', 'get-netroute'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['NetAdapter', 'NetTCPIP', 'VpnClient'],
      permissions: ['Runs as a standard user'],
    },
    parameters: [{ name: 'AddressFamily', type: 'string', default: 'IPv4', description: 'IPv4, IPv6 or All.' }],
    examples: [
      {
        title: 'Planned usage',
        code: '.\\Get-VPNRoutes.ps1 -AddressFamily All',
      },
    ],
    added: '2026-11-01',
  },
  {
    name: 'Test-VPNConnection',
    category: 'vpn',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Tests DNS, reachability and routing of internal targets to verify that traffic uses the VPN.',
    description: [
      'Checks one or more targets that should only be reachable through the VPN, for example a file server or an intranet site. For every target the script resolves the name, tests the connection with ping or a TCP port and checks which network interface Windows would use.',
      'This makes it easy to tell apart "the VPN is down", "DNS does not work through the VPN" and "the traffic does not use the VPN at all".',
    ],
    keywords: ['ping', 'connectivity', 'reachability', 'dns', 'route', 'tcp', 'port', 'troubleshooting'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['NetAdapter', 'NetTCPIP', 'VpnClient'],
      permissions: ['Runs as a standard user', 'Sends ICMP echo requests or TCP connection attempts to the targets'],
    },
    parameters: [
      { name: 'Target', type: 'string[]', required: true, description: 'One or more host names or IP addresses.' },
      { name: 'Port', type: 'int', description: 'Test this TCP port instead of using ping, e.g. 443 or 445.' },
      { name: 'TimeoutMs', type: 'int', default: '2000', description: 'Timeout per test in milliseconds.' },
    ],
    examples: [
      {
        title: 'Ping an internal server',
        code: '.\\Test-VPNConnection.ps1 -Target fileserver01.corp.local',
      },
      {
        title: 'Test HTTPS on several targets',
        description: 'Use a TCP port when ICMP is blocked by a firewall.',
        code: '.\\Test-VPNConnection.ps1 -Target intranet.corp.local, 10.10.0.5 -Port 443 |\n    Format-Table Target, Reachable, LatencyMs, Interface, ViaVpn',
      },
    ],
    added: '2026-11-03',
  },

  // ---------------------------------------------------------------------------
  // System
  // ---------------------------------------------------------------------------
  {
    name: 'Get-SystemUptime',
    category: 'system',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Shows the uptime since the last boot and flags computers that should be restarted.',
    description: [
      'Reads the last boot time from Win32_OperatingSystem and calculates the uptime. With -WarningDays you define after how many days a reboot is recommended. Remote computers are queried through CIM (WinRM) and can be passed through the pipeline.',
      'With Fast Startup enabled, "Shut down" does not reset the uptime, only "Restart" does. Use Get-LastBootTime to see the boot type.',
    ],
    keywords: ['uptime', 'boot', 'running since', 'restart', 'win32_operatingsystem', 'remote'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      modules: ['CimCmdlets'],
      permissions: ['Local: runs as a standard user', 'Remote: WinRM enabled on the target and administrator rights on it'],
    },
    parameters: [
      { name: 'ComputerName', type: 'string[]', default: '$env:COMPUTERNAME', description: 'One or more computers. Accepts pipeline input.' },
      { name: 'WarningDays', type: 'int', default: '14', description: 'Uptime in days from which Status shows RebootRecommended.' },
    ],
    examples: [
      {
        title: 'Uptime of the local computer',
        code: '.\\Get-SystemUptime.ps1',
      },
      {
        title: 'Find servers that need a restart',
        code: "'SRV01', 'SRV02', 'SRV03' |\n    .\\Get-SystemUptime.ps1 -WarningDays 30 |\n    Where-Object Status -ne 'OK'",
      },
    ],
    added: '2026-08-04',
  },
  {
    name: 'Get-LastBootTime',
    category: 'system',
    classification: 'read-only',
    status: 'implemented',
    summary: 'Shows the last boot time, the boot type (full boot or Fast Startup) and a boot timeline.',
    description: [
      'Returns the last boot time together with the boot type, so you can see whether the computer really restarted or only resumed with Fast Startup.',
      'With -Timeline the script lists startups, shutdowns, initiated restarts (including user and reason) and unexpected shutdowns of the last days from the System event log.',
    ],
    keywords: ['boot time', 'fast startup', 'hiberboot', 'event 1074', 'event 41', 'unexpected shutdown', 'timeline', 'restart history'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: ['Read access to the System event log (standard users have it)'],
    },
    parameters: [
      { name: 'Timeline', type: 'switch', description: 'Return the startup and shutdown events instead of the summary.' },
      { name: 'Days', type: 'int', default: '30', description: 'Number of days for the timeline (1 to 365).' },
    ],
    examples: [
      {
        title: 'Last boot and boot type',
        code: '.\\Get-LastBootTime.ps1',
      },
      {
        title: 'Boot timeline of the last week',
        code: '.\\Get-LastBootTime.ps1 -Timeline -Days 7 | Format-Table -AutoSize',
      },
    ],
    added: '2026-08-11',
  },
  {
    name: 'Get-RebootStatus',
    category: 'system',
    classification: 'read-only',
    status: 'placeholder',
    summary: 'Combines uptime, pending reboot reasons and the last shutdown into one recommendation.',
    description: [
      'Planned: combines the last boot time, the pending reboot checks and the last shutdown or restart (event 1074) into one object per computer with a clear recommendation: OK, RebootRecommended or RebootRequired.',
    ],
    keywords: ['reboot', 'restart', 'pending', 'uptime', 'report', 'recommendation'],
    powershell: ['5.1', '7.x'],
    requirements: {
      os: 'Windows 10, Windows 11, Windows Server 2016 or later',
      admin: false,
      permissions: ['Read access to HKLM and the System event log'],
    },
    parameters: [
      { name: 'ComputerName', type: 'string[]', default: '$env:COMPUTERNAME', description: 'One or more computers.' },
    ],
    examples: [
      {
        title: 'Planned usage',
        code: '.\\Get-RebootStatus.ps1 -ComputerName SRV01, SRV02',
      },
    ],
    added: '2026-11-02',
  },
];
