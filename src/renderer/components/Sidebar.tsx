import React from 'react';
import { useAppStore, SidebarPanel } from '../store/appStore';
import { FolderIcon, SearchIcon, SettingsIcon, InfoIcon } from '../icons';

interface SidebarButtonProps {
  panel: SidebarPanel;
  icon: React.ReactNode;
  title: string;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ panel, icon, title }) => {
  const { sidebarPanel, setSidebarPanel } = useAppStore();

  return (
    <button
      className={`sidebar-btn ${sidebarPanel === panel ? 'active' : ''}`}
      onClick={() => setSidebarPanel(panel)}
      title={title}
    >
      {icon}
    </button>
  );
};

const Sidebar: React.FC = () => {
  return (
    <nav className="sidebar">
      <SidebarButton
        panel="files"
        icon={<FolderIcon size={20} />}
        title="File Explorer"
      />
      <SidebarButton
        panel="search"
        icon={<SearchIcon size={20} />}
        title="Search"
      />

      <div className="sidebar-spacer" />

      <SidebarButton
        panel="settings"
        icon={<SettingsIcon size={20} />}
        title="Settings"
      />
      <SidebarButton
        panel="about"
        icon={<InfoIcon size={20} />}
        title="About"
      />
    </nav>
  );
};

export default Sidebar;
