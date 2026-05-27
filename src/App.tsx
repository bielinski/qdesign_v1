import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSurveyEngine } from './hooks/useSurveyEngine';
import { useQuestionForm } from './hooks/useQuestionForm';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { Toolbar } from './components/layout/Toolbar';
import { QuestionEditor } from './components/editor/QuestionEditor';
import { LivePreview } from './components/preview/LivePreview';
import { saveProjectFile, openProjectFile } from './lib/projectIO';
let nextBlockId = 1;

function generateBlockId(): string {
  const id = nextBlockId;
  nextBlockId++;
  return String.fromCharCode(64 + (id <= 26 ? id : ((id - 1) % 26) + 1));
}

function blockCharIndex(blockId: string): number {
  let index = 0;
  for (let i = 0; i < blockId.length; i++) {
    index = index * 26 + (blockId.charCodeAt(i) - 64);
  }
  return index;
}

export default function App() {
  const {
    title,
    setSurveyTitle,
    questions,
    errors,
    blocks,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    moveQuestion,
    exportDocx,
    saveProject,
    loadProject,
    updateBlockMeta,
    reorderBlock,
  } = useSurveyEngine();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLivePreview] = useState(true);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(
    () => localStorage.getItem('qdesign-current-path'),
  );

  useEffect(() => {
    if (currentFilePath) {
      localStorage.setItem('qdesign-current-path', currentFilePath);
    } else {
      localStorage.removeItem('qdesign-current-path');
    }
  }, [currentFilePath]);

  const selectedQuestion = useMemo(
    () => questions.find(q => q.id === selectedId) ?? null,
    [questions, selectedId],
  );

  const form = useQuestionForm(selectedQuestion);

  const handleSelect = useCallback((id: string) => {
    if (form.hasChanges) {
      const confirm = window.confirm('Masz niezapisane zmiany. Odrzucić je?');
      if (!confirm) return;
    }
    setSelectedId(id);
  }, [form.hasChanges]);

  const handleAddBlock = useCallback(() => {
    const blockId = generateBlockId();
    const newId = addQuestion({
      blockId,
      text: '',
      type: 'open',
      required: false,
    });
    setSelectedId(newId);
  }, [addQuestion]);

  const handleAddQuestion = useCallback((blockId: string) => {
    const newId = addQuestion({
      blockId,
      text: '',
      type: 'open',
      required: false,
    });
    setSelectedId(newId);
  }, [addQuestion]);

  const handleDeleteQuestion = useCallback((id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
    }
    deleteQuestion(id);
  }, [selectedId, deleteQuestion]);

  const handleSave = useCallback(() => {
    if (!selectedId) return;
    const { text, type, required, blockId, next, scaleConfig, options, nonSubstantiveOption, optionRouting } = form.draft;
    if (!text.trim()) {
      alert('Treść pytania nie może być pusta.');
      return;
    }
    updateQuestion(selectedId, { text, type, required, blockId, next, scaleConfig, options, nonSubstantiveOption, optionRouting });
  }, [selectedId, form.draft, updateQuestion]);

  const handleCancel = useCallback(() => {
    form.setDraft({
      text: selectedQuestion?.text ?? '',
      type: selectedQuestion?.type ?? 'open',
      required: selectedQuestion?.required ?? false,
      blockId: selectedQuestion?.blockId ?? 'A',
      next: selectedQuestion?.next,
      scaleConfig: selectedQuestion?.scaleConfig
        ? { ...selectedQuestion.scaleConfig }
        : undefined,
      nonSubstantiveOption: selectedQuestion?.nonSubstantiveOption,
      optionRouting: selectedQuestion?.optionRouting
        ? { ...selectedQuestion.optionRouting }
        : undefined,
    });
  }, [selectedQuestion, form]);

  const handleExportDocx = useCallback(async () => {
    try {
      const buffer = await exportDocx();
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          filters: [{ name: 'Dokument DOCX', extensions: ['docx'] }],
          defaultPath: 'questionnaire.docx',
        });
        if (!filePath) return;
        await writeFile(filePath, buffer);
      } else {
        const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'questionnaire.docx';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Błąd eksportu: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [exportDocx]);

  const handleNewProject = useCallback(() => {
    if (questions.length > 0 && !window.confirm('Utworzyć nowy projekt? Niezapisane dane zostaną utracone.')) return;
    window.location.reload();
  }, [questions]);

  const handleSaveProject = useCallback(async () => {
    try {
      const data = saveProject();
      const path = await saveProjectFile(data, currentFilePath ?? undefined);
      if (path) setCurrentFilePath(path);
    } catch (err) {
      alert('Błąd zapisu: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [saveProject, currentFilePath]);

  const handleSaveAsProject = useCallback(async () => {
    try {
      const data = saveProject();
      const path = await saveProjectFile(data);
      if (path) setCurrentFilePath(path);
    } catch (err) {
      alert('Błąd zapisu: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [saveProject]);

  const handleOpenProject = useCallback(async () => {
    try {
      const result = await openProjectFile();
      if (!result) return;
      loadProject(result.data);
      const maxBlock = result.data.questions.reduce(
        (max: number, q: { blockId: string }) => Math.max(max, blockCharIndex(q.blockId)),
        0,
      );
      nextBlockId = maxBlock + 1;
      setCurrentFilePath(result.filePath);
      setSelectedId(null);
    } catch (err) {
      alert('Błąd odczytu: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [loadProject]);

  const handleMoveQuestion = useCallback((id: string, targetBlockId: string, targetIndex: number) => {
    moveQuestion(id, targetBlockId, targetIndex);
  }, [moveQuestion]);

  const handleReorderBlock = useCallback((sourceIndex: number, targetIndex: number) => {
    reorderBlock(sourceIndex, targetIndex);
  }, [reorderBlock]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        title={title}
        onTitleChange={setSurveyTitle}
        onExportDocx={handleExportDocx}
        onNewProject={handleNewProject}
        onSaveProject={handleSaveProject}
        onSaveAsProject={handleSaveAsProject}
        onOpenProject={handleOpenProject}
        questionCount={questions.length}
        errorCount={errors.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          questions={questions}
          blocks={blocks}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAddBlock={handleAddBlock}
          onAddQuestion={handleAddQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onMoveQuestion={handleMoveQuestion}
          onUpdateBlockMeta={updateBlockMeta}
          onReorderBlock={handleReorderBlock}
        />

        <MainContent>
          <div className="flex-1 flex min-h-0">
            <QuestionEditor
              question={selectedQuestion}
              draft={form.draft}
              fieldErrors={form.fieldErrors}
              allQuestions={questions}
              isValid={form.isValid}
              hasChanges={form.hasChanges}
              onUpdateField={form.updateField}
              onUpdateScaleConfig={form.updateScaleConfig}
              onSave={handleSave}
              onCancel={handleCancel}
            />

            {showLivePreview && (
              <>
                <div className="w-px bg-gray-200 shrink-0" />
                <LivePreview questions={questions} blocks={blocks} title={title} />
              </>
            )}
          </div>
        </MainContent>
      </div>
    </div>
  );
}
