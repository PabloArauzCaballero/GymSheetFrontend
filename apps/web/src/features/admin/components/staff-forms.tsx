'use client';

import { Link2, UserPlus } from 'lucide-react';
import { staffPositions, type StaffPosition } from '@/shared/api/contracts';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { DialogClose } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

export const positionLabels: Record<StaffPosition, string> = {
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
  ADMINISTRATION: 'Administración',
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type Branch = { id: string; nombre: string };

function PositionField() {
  return (
    <Field label="Cargo">
      <Select defaultValue="COACH" name="cargo">
        {staffPositions.map((item) => (
          <option key={item} value={item}>
            {positionLabels[item]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function BranchField({ branches }: Readonly<{ branches: readonly Branch[] }>) {
  return (
    <Field label="Sede">
      <Select name="sedeId" required>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.nombre}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function UnlimitedAccessCheckbox({ className }: Readonly<{ className?: string }>) {
  return (
    <label className={`flex items-center gap-3 text-sm ${className ?? ''}`}>
      <input
        className="size-4 accent-[var(--volt)]"
        defaultChecked
        name="accesoIlimitado"
        type="checkbox"
      />
      Acceso ilimitado (sin depender de una membresía vigente)
    </label>
  );
}

/** Alta completa: cuenta con rol laboral y perfil en una sola operación. */
export function StaffCreateForm({
  branches,
  loading,
  onSubmit,
}: Readonly<{
  branches: readonly Branch[];
  loading: boolean;
  onSubmit: (form: FormData) => void;
}>) {
  return (
    <form action={onSubmit} className="grid gap-5">
      <Field label="Nombre completo">
        <Input minLength={3} name="nombreCompleto" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo">
          <Input name="email" required type="email" />
        </Field>
        <Field hint="Mínimo 10 caracteres." label="Contraseña inicial">
          <Input minLength={10} name="password" required type="password" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <PositionField />
        <Field label="Fecha de contratación">
          <Input defaultValue={todayIso()} name="contratadoEl" required type="date" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <BranchField branches={branches} />
        <Field hint="Opcional: sin PIN entra por credencial facial o tarjeta." label="PIN de acceso">
          <Input inputMode="numeric" name="pinAcceso" pattern="\d{4,12}" />
        </Field>
      </div>
      <UnlimitedAccessCheckbox />
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button loading={loading} type="submit" variant="primary">
          <UserPlus className="size-4" />
          Crear
        </Button>
      </div>
    </form>
  );
}

/** Vincula un perfil laboral a una cuenta que ya existe. */
export function StaffLinkCard({
  branches,
  loading,
  onSubmit,
}: Readonly<{
  branches: readonly Branch[];
  loading: boolean;
  onSubmit: (form: FormData) => void;
}>) {
  return (
    <Card>
      <CardHeader
        description="Para una cuenta que ya existe (por ejemplo, un cliente que pasa a entrenador): vincula su perfil laboral por UUID."
        title="Vincular cuenta existente"
      />
      <CardContent>
        <form action={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="UUID de usuario">
            <Input name="usuarioId" required />
          </Field>
          <PositionField />
          <Field label="Fecha de contratación">
            <Input defaultValue={todayIso()} name="contratadoEl" required type="date" />
          </Field>
          <BranchField branches={branches} />
          <UnlimitedAccessCheckbox className="self-end" />
          <Button className="sm:col-span-2" loading={loading} type="submit" variant="secondary">
            <Link2 className="size-4" />
            Vincular perfil
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
