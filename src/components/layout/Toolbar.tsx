interface ToolbarProps {
  onExportDocx: () => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  questionCount: number;
  errorCount: number;
  title: string;
  onTitleChange: (title: string) => void;
}

export function Toolbar({
  onExportDocx,
  onNewProject,
  onSaveProject,
  onOpenProject,
  questionCount,
  errorCount,
  title,
  onTitleChange,
}: ToolbarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-gray-800">QDesign</span>
        <input
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Tytuł badania..."
          className="text-sm text-gray-600 border border-gray-200 rounded px-2 py-0.5 w-64 focus:outline-none focus:border-blue-400 bg-gray-50"
        />
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
        <button type="button" onClick={onOpenProject} className="btn-secondary text-xs">
          Otwórz projekt
        </button>
        <button type="button" onClick={onSaveProject} className="btn-secondary text-xs">
          Zapisz projekt
        </button>
        <button type="button" onClick={onNewProject} className="btn-secondary text-xs">
          Nowy projekt
        </button>
        <button
          type="button"
          onClick={onExportDocx}
          disabled={questionCount === 0}
          className="btn-primary text-xs"
        >
          Eksportuj DOCX
        </button>
      </div>
    </header>
  );
}
