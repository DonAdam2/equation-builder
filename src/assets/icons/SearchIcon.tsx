import { IconInterface } from '@/assets/icons/types';

const SearchIcon = ({ className = '' }: IconInterface) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 19L13 13M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z"
      stroke="#64748B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient
        id="paint0_linear_1799_490"
        x1="1"
        y1="10"
        x2="19"
        y2="10"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="var(--theme-primary-light)" />
        <stop offset="1" stopColor="var(--theme-primary-dark)" />
      </linearGradient>
    </defs>
  </svg>
);

export default SearchIcon;
