import type { BaseSyntheticEvent } from 'react';

/** The honeypot is uncontrolled and outside the form values: read it from the submitted form. */
export function honeypotValue(event?: BaseSyntheticEvent): string {
  const target: unknown = event?.target;
  if (!(target instanceof HTMLFormElement)) return '';
  const value = new FormData(target).get('website');
  return typeof value === 'string' ? value : '';
}
