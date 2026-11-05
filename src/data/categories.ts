import type { Category } from './types';

/** Order here is the order in the sidebar and on the overview page. */
export const categories: Category[] = [
  {
    id: 'windows-updates',
    name: 'Windows Updates',
    description: 'Check the update status, review the installation history and find pending reboots.',
  },
  {
    id: 'drivers',
    name: 'Drivers',
    description: 'Inventory installed drivers, find devices without a driver and export reports.',
  },
  {
    id: 'vpn',
    name: 'VPN',
    description: 'Inspect VPN connections and adapters and verify that traffic really uses the tunnel.',
  },
  {
    id: 'system',
    name: 'System',
    description: 'Uptime, boot history and other basic information about the state of a computer.',
  },
];
