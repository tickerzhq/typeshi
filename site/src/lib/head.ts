// Two tiny scripts that must run in <head>, before the first paint. They live in a plain module
// (not a "use client" one) so the server can inline them as text.

/** localStorage key: "light" when the reader picked the light theme. Dark is the default. */
export const THEME_KEY = "typeshi:theme";

/** sessionStorage key: the direction of the lesson the reader is moving to. */
export const SLIDE_KEY = "typeshi:slide";

/** Puts the light theme on before the first paint, so a light reader never sees a dark flash. */
const theme = `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

/**
 * Hears `pagereveal` on a cross-document navigation (`@view-transition { navigation: auto }` in
 * globals.css): back and next in the tour slide the lesson text the way you went; any other page load
 * skips the transition. Browsers without the API (Firefox today) just load the page.
 */
const slide = `addEventListener("pagereveal",function(e){if(!e.viewTransition)return;var d=null;try{d=sessionStorage.getItem("${SLIDE_KEY}");sessionStorage.removeItem("${SLIDE_KEY}")}catch(_){}if(d&&!matchMedia("(prefers-reduced-motion: reduce)").matches)e.viewTransition.types.add(d);else e.viewTransition.skipTransition()});`;

export const headScript = `${theme}${slide}`;
