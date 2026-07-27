import { EquationBuilderLayoutProps } from '@/components/equationBuilderLayout/EquationBuilderLayout.types';

const EquationBuilderLayout = ({
  editor,
  preview,
  toolbar,
  pills,
  table,
}: EquationBuilderLayoutProps) => {
  return (
    <div className="equation-builder-layout-wrapper">
      <header className="equation-builder-header">
        <p className="equation-builder-eyebrow">University of Bath · Mathematics for AI</p>
        <h1>AI Formula Builder</h1>
        <p className="equation-builder-subtitle">
          Build mathematical expressions quickly, then copy them into Word or export a PDF.
        </p>
      </header>

      <section className="equation-builder-panel equation-builder-editor-panel">{editor}</section>
      <section className="equation-builder-panel equation-builder-preview-panel">{preview}</section>
      <section className="equation-builder-panel equation-builder-toolbar-panel">{toolbar}</section>
      <section className="equation-builder-panel equation-builder-pills-panel">{pills}</section>
      <section className="equation-builder-panel equation-builder-table-panel">{table}</section>
    </div>
  );
};

export default EquationBuilderLayout;
