import { IconInterface } from '@/assets/icons/types';

const DoubleChevronRightIcon = ({ className, onClick }: IconInterface) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    className={className}
    onClick={onClick}
  >
    <path d="m13.707 17.707 5-5a.999.999 0 0 0 0-1.414l-5-5a.999.999 0 1 0-1.414 1.414L16.586 12l-4.293 4.293a.999.999 0 1 0 1.414 1.414zm-7 0 5-5a.999.999 0 0 0 0-1.414l-5-5a.999.999 0 1 0-1.414 1.414L9.586 12l-4.293 4.293a.999.999 0 1 0 1.414 1.414z" />
  </svg>
);

export default DoubleChevronRightIcon;
