import { useState, useCallback, useMemo } from 'react';
import { useSurveyEngine } from './hooks/useSurveyEngine';
import { useQuestionForm } from './hooks/useQuestionForm';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { Toolbar } from './components/layout/Toolbar';
import { QuestionEditor } from './components/editor/QuestionEditor';
import { LivePreview } from './components/preview/LivePreview';
let nextBlockId = 1;

function generateBlockId(): string {
  const id = nextBlockId;
  nextBlockId++;
  return String.fromCharCode(64 + (id <= 26 ? id : ((id - 1) % 26) + 1));
}

export default function App() {
  const {
    questions,
    errors,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    moveQuestion,
    exportDocx,
  } = useSurveyEngine();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLivePreview] = useState(true);

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
    const { text, type, required, blockId, next, scaleConfig, options, nonSubstantiveOption } = form.draft;
    if (!text.trim()) {
      alert('Treść pytania nie może być pusta.');
      return;
    }
    updateQuestion(selectedId, { text, type, required, blockId, next, scaleConfig, options, nonSubstantiveOption });
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
    });
  }, [selectedQuestion, form]);

  const handleExportDocx = useCallback(async () => {
    try {
      const buffer = await exportDocx();
      const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questionnaire.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [exportDocx]);

  const handleNewProject = useCallback(() => {
    if (questions.length > 0 && !window.confirm('Utworzyć nowy projekt? Niezapisane dane zostaną utracone.')) return;
    window.location.reload();
  }, [questions]);

  const handleMoveQuestion = useCallback((id: string, targetBlockId: string, targetIndex: number) => {
    moveQuestion(id, targetBlockId, targetIndex);
  }, [moveQuestion]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onExportDocx={handleExportDocx}
        onNewProject={handleNewProject}
        questionCount={questions.length}
        errorCount={errors.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          questions={questions}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAddBlock={handleAddBlock}
          onAddQuestion={handleAddQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onMoveQuestion={handleMoveQuestion}
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
                <LivePreview questions={questions} />
              </>
            )}
          </div>
        </MainContent>
      </div>
    </div>
  );
}
