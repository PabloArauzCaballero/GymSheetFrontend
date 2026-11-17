import { consentCopy } from '@gymsheet/domain';
import { useId } from 'react';
import type { ConsentKind } from '@/shared/api/schemas';
import { Checkbox } from '@/shared/components/ui/checkbox';

/** Inline separate consent: the grant label, its purpose and how to take it back. */
export function ConsentCheckbox({
  kind,
  checked,
  onChange,
}: Readonly<{ kind: ConsentKind; checked: boolean; onChange: (checked: boolean) => void }>) {
  const hintId = useId();
  const copy = consentCopy[kind];
  return (
    <div className="grid gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3">
      <Checkbox
        aria-describedby={hintId}
        checked={checked}
        label={copy.grantLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <p className="pl-[30px] text-xs leading-5 text-[var(--text-muted)]" id={hintId}>
        {`${copy.purpose} Lo retiras en Ajustes y lo borramos.`}
      </p>
    </div>
  );
}
