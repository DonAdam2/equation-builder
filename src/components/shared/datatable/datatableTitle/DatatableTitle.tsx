import cx from 'classnames';

import Button from '@/components/shared/button/Button';
import { DatatableTitleInterface } from '@/components/shared/datatable/datatableTitle/DatatableTitle.types';

const DatatableTitle = ({
  title,
  titlePosition = 'start',
  buttons,
  buttonsPosition = 'end',
  titleStyles,
  isRemovePadding,
  isInSearchRow,
  columnVisibilityToggle,
}: DatatableTitleInterface) => {
  const isTitlePositionEnd = title && titlePosition === 'end',
    isButtonsPositionStart = buttons?.length && buttonsPosition === 'start';

  return (
    <>
      {(title || buttons || columnVisibilityToggle) && (
        <div
          className={cx('datatable-title-wrapper', {
            'remove-padding': isRemovePadding,
            'is-in-search-row': isInSearchRow,
          })}
          style={{
            flexDirection: isTitlePositionEnd
              ? 'row-reverse'
              : isButtonsPositionStart
                ? 'row-reverse'
                : 'row',
          }}
        >
          {title && (
            <>
              <h2 className="table-title" style={titleStyles}>
                {title}
              </h2>
              <div style={{ flex: '1' }} />
            </>
          )}
          {(buttons?.length || columnVisibilityToggle) && (
            <div
              className={`datatable-title-buttons-wrapper ${!title ? 'no-title' : ''}`}
              style={{
                justifyContent:
                  isTitlePositionEnd || isButtonsPositionStart ? 'flex-start' : 'flex-end',
              }}
            >
              {buttons?.map((el, i) => (
                <Button key={i} {...el} />
              ))}
              {columnVisibilityToggle && <div>{columnVisibilityToggle}</div>}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DatatableTitle;
