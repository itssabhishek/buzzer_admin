export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}
