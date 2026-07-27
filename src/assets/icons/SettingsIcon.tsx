import { IconInterface } from '@/assets/icons/types';

const SettingsIcon = ({ className }: IconInterface) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="10" x2="21" y1="6" y2="6" />
    <line x1="3" x2="6" y1="6" y2="6" />
    <line x1="18" x2="21" y1="18" y2="18" />
    <line x1="3" x2="14" y1="18" y2="18" />
    <circle cx="8" cy="6" r="2" />
    <circle cx="16" cy="18" r="2" />
  </svg>
);

export default SettingsIcon;
