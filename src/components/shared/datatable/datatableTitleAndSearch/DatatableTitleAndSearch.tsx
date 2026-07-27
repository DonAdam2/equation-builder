import DatatableSearch from '@/components/shared/datatable/datatableSearch/DatatableSearch';
import DatatableTitle from '@/components/shared/datatable/datatableTitle/DatatableTitle';
import { DatatableTitleAndSearchInterface } from '@/components/shared/datatable/datatableTitleAndSearch/DatatableTitleAndSearch.types';

const DatatableTitleAndSearch = ({
  title,
  titlePosition,
  buttons,
  buttonsPosition,
  columnVisibilityToggle,
  titleStyles,
  search,
}: DatatableTitleAndSearchInterface) => {
  const isSearchPositionStart = search && search.searchPosition === 'start';

  return (
    <>
      {(title || buttons || search || columnVisibilityToggle) && (
        <div
          className="datatable-search-title-wrapper"
          style={{
            flexDirection: isSearchPositionStart ? 'row-reverse' : 'row',
          }}
        >
          {(title || buttons || columnVisibilityToggle) && (
            <DatatableTitle
              title={title}
              titleStyles={titleStyles}
              titlePosition={titlePosition}
              buttons={buttons}
              buttonsPosition={buttonsPosition}
              isRemovePadding
              isInSearchRow
              columnVisibilityToggle={columnVisibilityToggle}
            />
          )}
          <div style={{ flex: title || buttons ? '1 1 10%' : '1' }} />
          {search?.show && <DatatableSearch {...search} />}
        </div>
      )}
    </>
  );
};

export default DatatableTitleAndSearch;
