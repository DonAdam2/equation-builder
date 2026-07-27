import { EquationPillsProps } from '@/components/equationPills/EquationPills.types';

const EquationPills = ({ equations, onPillClick }: EquationPillsProps) => {
  return (
    <section className="equation-pills-wrapper" aria-label="Recent equations">
      <div className="equation-section-heading">
        <h2>Recent Equations</h2>
        <p>Click a pill to insert it at the current cursor position.</p>
      </div>

      {equations.length === 0 ? (
        <p className="equation-pills-empty">
          No recent equations yet. Select one from the library below.
        </p>
      ) : (
        <ul className="equation-pills-list">
          {equations.map((equation) => (
            <li key={equation.id}>
              <button
                type="button"
                className="equation-pill"
                onClick={() => onPillClick(equation)}
                title={equation.template}
              >
                {equation.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EquationPills;
