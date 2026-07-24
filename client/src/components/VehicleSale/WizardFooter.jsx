import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

// Bottom navigation bar. Step 1: Previous disabled. Last step: no Next — shows
// Cancel + Save Sale. Middle steps: Previous + Next.
export default function WizardFooter({ isFirst, isLast, onPrev, onNext, onCancel, onSave, saving }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-border p-4 mt-5">
      <Button variant="ghost" onClick={onPrev} disabled={isFirst}>
        <ChevronLeft size={16} /> Previous
      </Button>

      <div className="flex items-center gap-3">
        {isLast ? (
          <>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Sale'}</Button>
          </>
        ) : (
          <Button onClick={onNext}>Next <ChevronRight size={16} /></Button>
        )}
      </div>
    </div>
  );
}
