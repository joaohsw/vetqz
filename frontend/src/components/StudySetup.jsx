/**
 * StudySetup — selection of detected topics and session preferences.
 */

import { CheckSquare, ListTree, Play, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from '../i18n';

const QUESTION_COUNTS = [5, 10, 15];

export default function StudySetup({
  topics,
  selectedTopicIds,
  onSelectedTopicsChange,
  questionCount,
  onQuestionCountChange,
  feedbackMode,
  onFeedbackModeChange,
  onStart,
  language,
}) {
  const copy = getTranslations(language);
  const selectedIds = new Set(selectedTopicIds);
  const allSelected = topics.length > 0 && selectedTopicIds.length === topics.length;

  const toggleTopic = (topicId) => {
    const next = new Set(selectedIds);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    onSelectedTopicsChange([...next]);
  };

  const toggleAll = () => {
    onSelectedTopicsChange(allSelected ? [] : topics.map((topic) => topic.id));
  };

  return (
    <section className="space-y-5 animate-enter">
      <div>
        <div className="flex items-center gap-2 text-teal-400 mb-2">
          <ListTree className="w-4 h-4" />
          <span className="text-xs font-['Plus_Jakarta_Sans'] font-600 uppercase tracking-widest">
            {copy.studySetup.eyebrow}
          </span>
        </div>
        <h2 className="text-2xl font-['Plus_Jakarta_Sans'] font-800 tracking-tight text-text-1">
          {copy.studySetup.title}
        </h2>
        <p className="text-sm text-text-3 mt-1">{copy.studySetup.description}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-600 text-text-1">{copy.studySetup.topicsTitle}</h3>
            <p className="text-xs text-text-3 mt-1">
              {copy.studySetup.selectedCount.replace('{count}', selectedTopicIds.length)}
            </p>
          </div>
          <button
            id="toggle-all-topics-btn"
            type="button"
            onClick={toggleAll}
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            {allSelected ? copy.studySetup.clearAll : copy.studySetup.selectAll}
          </button>
        </div>

        <div className="divide-y divide-border-subtle">
          {topics.map((topic) => {
            const isSelected = selectedIds.has(topic.id);
            return (
              <label
                key={topic.id}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-teal-500/5' : 'hover:bg-surface-2'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTopic(topic.id)}
                  className="mt-1 h-4 w-4 accent-teal-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-600 text-text-1">{topic.title}</span>
                  <span className="block text-xs text-text-3 mt-1 leading-relaxed">{topic.summary}</span>
                  <span className="block text-xs text-text-3/70 mt-2">
                    {copy.studySetup.excerptCount.replace('{count}', topic.chunk_indices.length)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 text-teal-400">
          <SlidersHorizontal className="w-4 h-4" />
          <h3 className="text-sm font-600 text-text-1">{copy.studySetup.sessionTitle}</h3>
        </div>

        <fieldset>
          <legend className="text-xs font-600 text-text-2 mb-3">{copy.studySetup.questionCount}</legend>
          <div className="grid grid-cols-3 gap-2">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                id={`question-count-${count}`}
                type="button"
                onClick={() => onQuestionCountChange(count)}
                className={`py-2.5 rounded-lg text-sm font-600 border transition-colors ${
                  questionCount === count
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-400'
                    : 'border-border-subtle bg-surface-1 text-text-3 hover:text-text-2'
                }`}
              >
                {copy.studySetup.questionLabel.replace('{count}', count)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-600 text-text-2 mb-3">{copy.studySetup.feedbackTiming}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {['immediate', 'final'].map((mode) => (
              <button
                key={mode}
                id={`feedback-mode-${mode}`}
                type="button"
                onClick={() => onFeedbackModeChange(mode)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  feedbackMode === mode
                    ? 'border-teal-500/40 bg-teal-500/15'
                    : 'border-border-subtle bg-surface-1 hover:bg-surface-2'
                }`}
              >
                <span className={`block text-sm font-600 ${feedbackMode === mode ? 'text-teal-400' : 'text-text-2'}`}>
                  {copy.studySetup.feedbackModes[mode].title}
                </span>
                <span className="block text-xs text-text-3 mt-1 leading-relaxed">
                  {copy.studySetup.feedbackModes[mode].description}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        id="start-study-session-btn"
        type="button"
        onClick={onStart}
        disabled={selectedTopicIds.length === 0}
        className="btn-primary w-full"
      >
        <CheckSquare className="w-4 h-4" />
        {copy.studySetup.start}
        <Play className="w-4 h-4" />
      </button>
    </section>
  );
}
