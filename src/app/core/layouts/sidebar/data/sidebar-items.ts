import { SidebarSection } from '../models/sidebar-item.model';

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'Main',
    items: [{ label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }],
  },
  {
    label: 'Management',
    items: [
      { label: 'Match Management', icon: 'trophy', route: '/match-management' },
      { label: 'Sport Management', icon: 'sports', route: '/sports' },
      { label: 'Publishing', icon: 'send', route: '/publishing' },
      { label: 'Finance', icon: 'wallet', route: '/finance' },
      { label: 'System', icon: 'settings', route: '/system' },
    ],
  },
];
