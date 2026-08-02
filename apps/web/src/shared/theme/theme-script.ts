/**
 * Script anti-FOUC. Se inyecta en <head> y se ejecuta antes del primer pintado
 * para fijar `data-theme` en <html> según la cookie de preferencia o, en su
 * ausencia, la preferencia del sistema. Evita el parpadeo de tema en la carga.
 *
 * La preferencia se guarda en cookie (no en almacenamiento del navegador) para
 * respetar la regla del proyecto sobre persistencia en el cliente.
 */
export const THEME_COOKIE = 'gymsheet-theme';

/** 1 año en segundos. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
