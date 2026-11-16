/**
 * Chat's own accent: the one vibrant, non-tenant colour of the app. It marks
 * «a conversation lives here» (deck message button, the Chat tab, the Chat
 * row) and its dot says «something is waiting». Not tenant-overridable: a
 * brand red or jade must not swallow it. Ratios measured with WCAG 2.x.
 */
export const chatColors = {
  dark: {
    /** Glyph/text on dark surfaces: 6.65:1 on surfaceLow, 5.40:1 on surfaceHighest. */
    ink: '#8EA2FF',
    /** Vibrant fill (gradient from → to). White glyph on it: 4.57:1 / 4.41:1. */
    fillFrom: '#6D5BFF',
    fillTo: '#3F6BFF',
    onFill: '#FFFFFF',
    /** The glowing dot: 5.19:1 on surfaceLow, 5.81:1 on background. Always drawn with a halo of the
     *  surface under it, so it also reads on the fill (the dot alone on the fill is only 1.49:1). */
    dot: '#FF4F9A',
    /** Count inside the dot: 5.81:1. */
    onDot: '#0F172A',
  },
  light: {
    /** 6.39:1 on white, 5.47:1 on background. */
    ink: '#3D4FD6',
    fillFrom: '#6D5BFF',
    fillTo: '#3F6BFF',
    onFill: '#FFFFFF',
    /** 4.51:1 on white, 3.86:1 on background. */
    dot: '#E0246F',
    /** 4.51:1. */
    onDot: '#FFFFFF',
  },
} as const;

export type ChatColors = { readonly [K in keyof (typeof chatColors)['dark']]: string };
