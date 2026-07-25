'use client';

export function ChoiceGroup({
  options,
  selected,
  setSelected,
}: Readonly<{ options: string[]; selected: string[]; setSelected: (items: string[]) => void }>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((item) => (
        <button
          className={`min-h-12 rounded-lg border px-3 text-sm ${selected.includes(item) ? 'border-[var(--volt)] bg-[var(--surface-high)]' : 'border-[var(--border-subtle)]'}`}
          key={item}
          onClick={() =>
            setSelected(
              selected.includes(item)
                ? selected.filter((value) => value !== item)
                : [...selected, item],
            )
          }
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
