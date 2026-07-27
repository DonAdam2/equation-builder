import { IconInterface } from '@/assets/icons/types';

const DeleteIcon = ({ className = '' }: IconInterface) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6.66663 7.33333V11.3333M9.33329 7.33333V11.3333M2.66663 4.66667H13.3333M12.6666 4.66667L12.0886 12.7613C12.0647 13.0977 11.9142 13.4125 11.6674 13.6424C11.4206 13.8722 11.0959 14 10.7586 14H5.24129C4.90405 14 4.57934 13.8722 4.33255 13.6424C4.08576 13.4125 3.93524 13.0977 3.91129 12.7613L3.33329 4.66667H12.6666ZM9.99996 4.66667V2.66667C9.99996 2.48986 9.92972 2.32029 9.8047 2.19526C9.67967 2.07024 9.5101 2 9.33329 2H6.66663C6.48981 2 6.32025 2.07024 6.19522 2.19526C6.0702 2.32029 5.99996 2.48986 5.99996 2.66667V4.66667H9.99996Z"
      stroke="#64748B"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default DeleteIcon;
