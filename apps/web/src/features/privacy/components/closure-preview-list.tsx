import { accountClosureCopy } from '@gymsheet/domain';
import type { ClosurePreview, ClosurePreviewItem } from '@/shared/api/schemas';

function Group({ title, items }: Readonly<{ title: string; items: readonly ClosurePreviewItem[] }>) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="grid gap-2">
      <h4 className="data-label text-[var(--text-muted)]">{title}</h4>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li className="grid gap-0.5" key={item.table}>
            <p className="t-subhead flex justify-between gap-4">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums text-[var(--text-muted)]">{item.count}</span>
            </p>
            {item.reason ? <p className="t-footnote text-[var(--text-muted)]">{item.reason}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What closing does to each kind of data, as the backend counts it for this account. */
export function ClosurePreviewList({ preview }: Readonly<{ preview: ClosurePreview }>) {
  return (
    <div className="grid gap-5 rounded-[var(--radius-lg)] bg-[var(--surface)] p-4">
      <section aria-label={preview.account.label} className="grid gap-1">
        <h4 className="t-headline">{preview.account.label}</h4>
        <p className="t-subhead text-[var(--text-muted)]">{preview.account.reason}</p>
      </section>
      <Group items={preview.deleted} title={accountClosureCopy.deleted} />
      <Group items={preview.anonymized} title={accountClosureCopy.anonymized} />
      <Group items={preview.kept} title={accountClosureCopy.kept} />
    </div>
  );
}
