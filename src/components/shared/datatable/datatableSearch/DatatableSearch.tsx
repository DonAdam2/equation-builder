import { ChangeEvent, useMemo, useState } from 'react';

import debounce from 'lodash/debounce';

import { DatatableSearchInterface } from '@/components/shared/datatable/datatableSearch/DatatableSearch.types';

import SearchIcon from '@/assets/icons/SearchIcon';

const DatatableSearch = ({
  onSearch,
  isSearchDisabled,
  isLocalSearch,
  isFullWidth,
  placeholder = 'Search...',
  searchDataTest,
  isMarginInlineStart,
  isMarginInlineEnd,
}: DatatableSearchInterface) => {
  const [query, setQuery] = useState('');

  const debounceLoadData = useMemo(
    () => (onSearch ? debounce(onSearch, 500) : () => {}),
    [onSearch]
  );

  const changeHandler = ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
    setQuery(value);
    if (onSearch && isLocalSearch) {
      onSearch(value);
    }
    if (onSearch && !isLocalSearch) {
      debounceLoadData(value);
    }
  };

  return (
    <div
      className={`datatable-search-wrapper ${isSearchDisabled ? 'datatable-search-wrapper-disabled' : ''}`}
      style={{
        width: isFullWidth ? '100%' : undefined,
        marginInlineStart: isMarginInlineStart ? 16 : 0,
        marginInlineEnd: isMarginInlineEnd ? 16 : 0,
      }}
    >
      <SearchIcon className="search-icon" />
      <input
        type="text"
        value={query}
        onChange={changeHandler}
        className="search-input"
        placeholder={placeholder}
        disabled={isSearchDisabled}
        data-test={searchDataTest}
      />
    </div>
  );
};

export default DatatableSearch;
