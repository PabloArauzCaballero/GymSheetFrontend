import { describe, expect, it } from 'vitest';
import { backendMediaTarget } from './backend-media';

const config = {
  internalOrigin: 'http://api:3001/api/v1',
  publicOrigins: ['http://localhost:3001', undefined],
};
const PHOTO = '/media/users/ffd983ae-9bc0-4a64-a7a0-fcf819ac0134/perfiles/479e11de.png';

describe('backendMediaTarget', () => {
  it('maps a profile photo of the local media mount to the internal backend origin', () => {
    expect(backendMediaTarget(`http://localhost:3001${PHOTO}`, config)?.toString()).toBe(`http://api:3001${PHOTO}`);
  });

  it('accepts the internal origin itself and drops the query string', () => {
    expect(backendMediaTarget(`http://api:3001${PHOTO}?x=1`, config)?.toString()).toBe(`http://api:3001${PHOTO}`);
  });

  it('leaves any other origin to the SSRF-guarded external proxy', () => {
    expect(backendMediaTarget(`https://media.example.com${PHOTO}`, config)).toBeNull();
    // Same host, another port: not the configured backend.
    expect(backendMediaTarget(`http://localhost:3000${PHOTO}`, config)).toBeNull();
    expect(backendMediaTarget('http://127.0.0.1:3001/media/a.png', config)).toBeNull();
  });

  it('never leaves the media mount, even with dot segments', () => {
    expect(backendMediaTarget('http://localhost:3001/api/v1/admin/users', config)).toBeNull();
    expect(backendMediaTarget('http://localhost:3001/media/../api/v1/me', config)).toBeNull();
    expect(backendMediaTarget('http://localhost:3001/media/%2e%2e/api/v1/me', config)).toBeNull();
    expect(backendMediaTarget('http://localhost:3001/media/', config)).toBeNull();
    expect(backendMediaTarget('http://localhost:3001/mediax/a.png', config)).toBeNull();
  });

  it('refuses credentials, other schemes and garbage', () => {
    expect(backendMediaTarget(`http://user:pw@localhost:3001${PHOTO}`, config)).toBeNull();
    expect(backendMediaTarget('file:///etc/passwd', config)).toBeNull();
    expect(backendMediaTarget('not a url', config)).toBeNull();
  });
});
