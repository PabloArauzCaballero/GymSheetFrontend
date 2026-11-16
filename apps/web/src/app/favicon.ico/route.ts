/**
 * `/favicon.ico` for clients that ask for it directly (crawlers, a tab opened
 * before the document declares its icon). It answers with the tenant's brand
 * mark itself, the same SVG the document links as its icon, so there is one
 * drawing and no 404 on every page. Browsers honour the SVG content type.
 */
export const dynamic = 'force-dynamic';

export { GET } from '../brand-mark.svg/route';
