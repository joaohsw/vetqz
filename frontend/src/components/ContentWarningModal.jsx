/**
 * ContentWarningModal — warning shown when uploaded PDF is not about veterinary medicine.
 *
 * Offers the user two choices: continue anyway or upload a different PDF.
 * Uses the same design language as the rest of the app (card, teal accents, dark mode).
 */

import { AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import { getTranslations } from '../i18n';

export default function ContentWarningModal({
  onContinue,
  onUploadAnother,
  isDeleting = false,
  language,
}) {
  const copy = getTranslations(language);

  return (
    <div className="animate-enter">
      <div className="card p-6 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-['Plus_Jakarta_Sans'] font-700 text-text-1 text-base">
              {copy.contentWarning.title}
            </h3>
            <p className="text-sm text-text-2 mt-2 leading-relaxed">
              {copy.contentWarning.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            id="content-warning-continue-btn"
            type="button"
            onClick={onContinue}
            disabled={isDeleting}
            className="btn-primary flex-1"
          >
            {copy.contentWarning.continueAnyway}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="content-warning-upload-another-btn"
            type="button"
            onClick={onUploadAnother}
            disabled={isDeleting}
            className="btn-secondary flex-1"
          >
            {isDeleting ? (
              <>
                <span className="spinner" />
                {copy.contentWarning.uploadAnother}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {copy.contentWarning.uploadAnother}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
