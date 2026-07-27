import { useMemo, useRef } from 'react';

import useEquationTableKeyboard from '@/hooks/useEquationTableKeyboard';

import { EquationTableProps } from '@/components/equationTable/EquationTable.types';
import Datatable from '@/components/shared/datatable/Datatable';
import { ColumnDef, RowInfo } from '@/components/shared/datatable/Datatable.types';

import { Equation } from '@/models/Equation';

const EquationTable = ({ equations, onEquationSelect }: EquationTableProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeEquationId, setActiveEquationId, handleKeyDown } = useEquationTableKeyboard({
    containerRef,
    equations,
    onSelect: onEquationSelect,
  });

  const columns = useMemo<ColumnDef<Equation>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: true,
        width: '18%',
        cell: (rowInfo: RowInfo<Equation>) => (
          <span data-equation-id={rowInfo.original.id}>{rowInfo.original.name}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: true,
        width: '52%',
      },
      {
        accessorKey: 'expectedVariables',
        header: 'Variables',
        enableSorting: false,
        width: '30%',
        cell: (rowInfo: RowInfo<Equation>) => rowInfo.original.expectedVariables.join(', '),
      },
    ],
    []
  );

  return (
    <section className="equation-table-wrapper" aria-label="Equation library">
      <div className="equation-section-heading">
        <h2>Equation Library</h2>
        <p>
          Search by name, description, or variables. Use arrow keys to navigate, Enter to insert,
          Escape to unfocus.
        </p>
      </div>

      <div
        ref={containerRef}
        className="equation-table-keyboard-region"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-activedescendant={activeEquationId ?? undefined}
      >
        <Datatable<Equation>
          title={{
            titleLabel: 'AI / ML Equations',
            titleLocation: 'searchRow',
          }}
          columns={columns}
          records={equations}
          search={{
            show: true,
            isLocalSearch: true,
            isFullWidth: true,
            placeholder: 'Search by name, description, or variables…',
            searchPosition: 'end',
          }}
          pagination={{
            enablePagination: true,
            rowsDropdown: {
              enableRowsDropdown: true,
              rowsPerPage: 10,
              optionsList: [
                { value: 5, displayValue: '5 rows' },
                { value: 10, displayValue: '10 rows' },
                { value: 20, displayValue: '20 rows' },
                { value: 30, displayValue: '30 rows' },
              ],
            },
          }}
          rowEvents={{
            onClick: {
              clickable: true,
              event: (_event, rowInfo) => {
                setActiveEquationId(rowInfo.original.id);
                onEquationSelect(rowInfo.original);
              },
            },
          }}
          ui={{
            tableWrapperClassName: 'equation-datatable',
            tableClassName: 'equation-datatable-table',
          }}
          noDataToDisplayMessage="No equations match your search."
          columnOrdering={{ enabled: false }}
        />
      </div>
    </section>
  );
};

export default EquationTable;
