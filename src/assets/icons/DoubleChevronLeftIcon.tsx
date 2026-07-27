import { IconInterface } from '@/assets/icons/types';

const DoubleChevronLeftIcon = ({ className, onClick }: IconInterface) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    className={className}
    onClick={onClick}
  >
    <path d="M11.707 16.293 7.414 12l4.293-4.293a.999.999 0 1 0-1.414-1.414l-5 5a.999.999 0 0 0 0 1.414l5 5a.999.999 0 1 0 1.414-1.414zm7 0L14.414 12l4.293-4.293a.999.999 0 1 0-1.414-1.414l-5 5a.999.999 0 0 0 0 1.414l5 5a.999.999 0 1 0 1.414-1.414z" />
  </svg>
);

export default DoubleChevronLeftIcon;
