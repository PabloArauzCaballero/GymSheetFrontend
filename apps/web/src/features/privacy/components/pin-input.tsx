import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

/** Six-digit emailed code: numeric keyboard, one-time-code autofill, digits only. */
export function PinInput({
  id,
  label,
  value,
  onChange,
  error,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (pin: string) => void;
  error?: string | null;
}>) {
  return (
    <Field error={error ?? undefined} htmlFor={id} label={label}>
      <Input
        autoComplete="one-time-code"
        className="h-14 text-center text-2xl font-semibold tabular-nums tracking-[0.5em]"
        inputMode="numeric"
        maxLength={6}
        name="pin"
        onChange={(event) => onChange(event.target.value.replace(/\D/gu, '').slice(0, 6))}
        pattern="[0-9]*"
        spellCheck={false}
        value={value}
      />
    </Field>
  );
}
