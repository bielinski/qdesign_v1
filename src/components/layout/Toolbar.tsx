interface ToolbarProps {
  onExportDocx: () => void;
  onNewProject: () => void;
  questionCount: number;
  errorCount: number;
}

export function Toolbar({ onExportDocx, onNewProject, questionCount, errorCount }: ToolbarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-gray-800">QDesign</h1>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-500">
          Pytania: <strong>{questionCount}</strong>
        </span>
        {errorCount > 0 && (
          <span className="text-xs text-red-600">
            Błędy: <strong>{errorCount}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onNewProject} className="btn-secondary text-xs">
          Nowy projekt
        </button>
        <button
          type="button"
          onClick={onExportDocx}
          disabled={questionCount === 0 || errorCount > 0}
          className="btn-primary text-xs"
        >
          Eksportuj DOCX
        </button>
      </div>
    </header>
  );
}
