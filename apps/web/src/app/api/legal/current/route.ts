import type { NextRequest } from 'next/server';
import { backendRequest } from '@/shared/server/backend';
import { relayBackendResponse } from '@/shared/server/legal';

/**
 * Public: a signup form needs the current versions before any session exists.
 * `?accountKind=BUSINESS` asks for the business set (ADR-0020); anything else
 * gets the person set, so the query never reaches the backend unchecked.
 */
export async function GET(request: NextRequest) {
  const business = request.nextUrl.searchParams.get('accountKind') === 'BUSINESS';
  return relayBackendResponse(await backendRequest(business ? '/legal/current?accountKind=BUSINESS' : '/legal/current'));
}
