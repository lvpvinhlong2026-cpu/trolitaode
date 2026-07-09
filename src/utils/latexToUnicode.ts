/**
 * Utility to convert simple LaTeX to Unicode strings for PowerPoint inline text.
 */

const unicodeMap: Record<string, string> = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\Delta': 'Δ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
  '\\sigma': 'σ', '\\tau': 'τ', '\\phi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\infty': '∞', '\\int': '∫', '\\sum': '∑', '\\prod': '∏', '\\approx': '≈', '\\neq': '≠',
  '\\leq': '≤', '\\geq': '≥', '\\pm': '±', '\\times': '×', '\\div': '÷', '\\cdot': '⋅',
  '\\rightarrow': '→', '\\Rightarrow': '⇒', '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔',
  '\\partial': '∂', '\\nabla': '∇', '\\in': '∈', '\\notin': '∉', '\\subset': '⊂',
  '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\angle': '∠', '\\circ': '°',
  '\\sqrt': '√', '\\equiv': '≡', '\\forall': '∀', '\\exists': '∃'
};

const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ'
};

const subscriptMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'n': 'ₙ'
};

export function latexToUnicode(latex: string): string {
  let text = latex;
  
  // Replace simple commands
  for (const [cmd, unicode] of Object.entries(unicodeMap)) {
    text = text.split(cmd).join(unicode);
  }

  // Handle simple superscripts like ^2 or ^{2}
  text = text.replace(/\^\{([0-9\+\-\=\(\)n]+)\}/g, (_, inner) => {
    return inner.split('').map((c: string) => superscriptMap[c] || c).join('');
  });
  text = text.replace(/\^([0-9n])/g, (_, char) => {
    return superscriptMap[char] || char;
  });

  // Handle simple subscripts like _2 or _{2}
  text = text.replace(/_\{([0-9\+\-\=\(\)n]+)\}/g, (_, inner) => {
    return inner.split('').map((c: string) => subscriptMap[c] || c).join('');
  });
  text = text.replace(/_([0-9n])/g, (_, char) => {
    return subscriptMap[char] || char;
  });

  // Remove some formatting wrappers
  text = text.replace(/\\mathrm\{([^\}]+)\}/g, '$1');
  text = text.replace(/\\mathbf\{([^\}]+)\}/g, '$1');
  text = text.replace(/\\text\{([^\}]+)\}/g, '$1');
  
  // Cleanup braces and extra spaces
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\\/g, ''); // strip remaining slashes

  return text.trim();
}
