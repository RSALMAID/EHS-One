/** Roda antes da página aparecer: aplica o tema salvo (ou o do sistema) sem piscar. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="escuro"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
