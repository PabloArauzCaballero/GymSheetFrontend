import Link from 'next/link';
import { businessDestination, businessEntryCopy } from '@gymsheet/domain';

/** «¿Tienes un negocio? Regístralo», under the person login and signup. */
export function BusinessEntryLink() {
  return (
    <p className="text-[var(--text-muted)]">
      {businessEntryCopy.prompt}{' '}
      <Link
        className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
        href={businessDestination.web.signup}
      >
        {businessEntryCopy.action}
      </Link>
    </p>
  );
}
