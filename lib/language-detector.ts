type Signal = { pattern: RegExp; score: number }
type LangSignals = { [lang: string]: Signal[] }

const SIGNALS: LangSignals = {
  tsx: [
    { pattern: /import\s+React|from\s+['"]react['"]/,              score: 5 },
    { pattern: /useState|useEffect|useRef|useCallback|useMemo/,    score: 4 },
    { pattern: /<[A-Z][A-Za-z]+[\s/>]/,                            score: 4 },
    { pattern: /:\s*(React\.FC|FC|ReactNode|JSX\.Element)/,        score: 6 },
    { pattern: /interface\s+\w+Props|type\s+\w+Props/,            score: 5 },
    { pattern: /export\s+default\s+function\s+[A-Z]/,             score: 3 },
  ],
  typescript: [
    { pattern: /:\s*(string|number|boolean|void|any|never|unknown)\b/, score: 3 },
    { pattern: /interface\s+\w+\s*\{/,                             score: 5 },
    { pattern: /type\s+\w+\s*=/,                                   score: 4 },
    { pattern: /<[A-Z]\w+>/,                                       score: 3 },
    { pattern: /as\s+\w+/,                                         score: 2 },
    { pattern: /enum\s+\w+/,                                       score: 5 },
    { pattern: /:\s*\w+\[\]/,                                      score: 3 },
    { pattern: /implements\s+\w+/,                                 score: 4 },
    { pattern: /Partial<|Record<|Readonly<|Pick<|Omit</,           score: 5 },
  ],
  python: [
    { pattern: /def\s+\w+\s*\(/,                                   score: 5 },
    { pattern: /from\s+\w[\w.]+\s+import\b/,                      score: 5 },
    { pattern: /if\s+__name__\s*==\s*['"]__main__['"]/,           score: 6 },
    { pattern: /print\s*\(/,                                       score: 3 },
    { pattern: /class\s+\w+(\s*\(\s*\w*\s*\))?:/,                 score: 4 },
    { pattern: /lambda\s+[\w,\s]+:/,                               score: 4 },
    { pattern: /self\.\w+/,                                        score: 4 },
    { pattern: /@\w+(\.\w+)?\s*\n/,                               score: 3 },
    { pattern: /:\s*\n\s{4}/,                                      score: 2 },
  ],
  java: [
    { pattern: /public\s+(static\s+)?(void|class|int|String)\b/,  score: 5 },
    { pattern: /import\s+java\./,                                  score: 6 },
    { pattern: /@Override|@Autowired|@SpringBootApplication/,      score: 6 },
    { pattern: /System\.out\.print/,                               score: 5 },
    { pattern: /new\s+\w+\(/,                                      score: 2 },
    { pattern: /throws\s+\w+Exception/,                            score: 5 },
    { pattern: /\bfinal\s+\w+\s+\w+\s*=/,                        score: 3 },
  ],
  csharp: [
    { pattern: /using\s+System(\.\w+)?;/,                          score: 6 },
    { pattern: /namespace\s+\w+/,                                  score: 5 },
    { pattern: /async\s+Task(<|>|\s)/,                             score: 5 },
    { pattern: /IEnumerable|IQueryable|IActionResult/,             score: 5 },
    { pattern: /\[HttpGet\]|\[HttpPost\]|\[ApiController\]/,       score: 6 },
    { pattern: /Console\.Write/,                                   score: 4 },
    { pattern: /var\s+\w+\s*=\s*new\s+\w+/,                      score: 3 },
  ],
  cpp: [
    { pattern: /#include\s*<[\w.]+>/,                              score: 6 },
    { pattern: /int\s+main\s*\(\s*(void\s*)?\)/,                  score: 6 },
    { pattern: /std::\w+/,                                         score: 5 },
    { pattern: /nullptr|cout\s*<<|cin\s*>>/,                      score: 5 },
    { pattern: /template\s*<(class|typename)/,                     score: 5 },
    { pattern: /::\w+/,                                            score: 2 },
  ],
  go: [
    { pattern: /^package\s+\w+/m,                                  score: 6 },
    { pattern: /func\s+\w+\s*\(/,                                  score: 4 },
    { pattern: /import\s+\(/,                                      score: 5 },
    { pattern: /\bdefer\s+/,                                       score: 5 },
    { pattern: /\bgoroutine\b|go\s+func/,                          score: 6 },
    { pattern: /fmt\.(Print|Println|Sprintf)/,                     score: 5 },
    { pattern: /:=\s*/,                                            score: 3 },
  ],
  rust: [
    { pattern: /fn\s+\w+\s*\(/,                                    score: 4 },
    { pattern: /\blet\s+mut\s+/,                                   score: 5 },
    { pattern: /match\s+\w+\s*\{/,                                 score: 4 },
    { pattern: /use\s+std::|use\s+\w+::/,                         score: 5 },
    { pattern: /impl\s+\w+/,                                       score: 4 },
    { pattern: /println!\s*\(/,                                    score: 5 },
    { pattern: /->/,                                               score: 2 },
    { pattern: /\bOption<\w+>|\bResult<\w+/,                      score: 5 },
  ],
  php: [
    { pattern: /<\?php/,                                           score: 8 },
    { pattern: /\$[a-zA-Z_]\w*/,                                   score: 4 },
    { pattern: /echo\s+/,                                          score: 4 },
    { pattern: /->/,                                               score: 2 },
    { pattern: /mysqli_|PDO::/,                                    score: 6 },
    { pattern: /\$_GET|\$_POST|\$_SESSION/,                        score: 6 },
  ],
  ruby: [
    { pattern: /def\s+\w+/,                                        score: 4 },
    { pattern: /puts\s+/,                                          score: 4 },
    { pattern: /attr_accessor|attr_reader|attr_writer/,            score: 6 },
    { pattern: /\belif\b|\bunless\b|\bend\b/,                      score: 4 },
    { pattern: /\.each\s*\{|\s*do\s*\|/,                          score: 4 },
    { pattern: /require\s+['"]\w+['"]/,                            score: 3 },
  ],
  swift: [
    { pattern: /\bfunc\s+\w+/,                                     score: 4 },
    { pattern: /@IBAction|@IBOutlet|UIViewController|SwiftUI/,     score: 6 },
    { pattern: /var\s+\w+\s*:\s*[A-Z]/,                           score: 4 },
    { pattern: /guard\s+let\b/,                                    score: 5 },
    { pattern: /optional\s*\?|if\s+let\s+/,                       score: 4 },
    { pattern: /import\s+(UIKit|Foundation|SwiftUI)/,              score: 6 },
  ],
  kotlin: [
    { pattern: /fun\s+\w+\s*\(/,                                   score: 5 },
    { pattern: /val\s+\w+\s*:|var\s+\w+\s*:/,                    score: 4 },
    { pattern: /data\s+class\s+\w+/,                               score: 6 },
    { pattern: /\?:\s*/,                                           score: 4 },
    { pattern: /\.let\s*\{|\.also\s*\{|\.run\s*\{/,              score: 4 },
    { pattern: /import\s+kotlinx\.|import\s+kotlin\./,             score: 6 },
  ],
  sql: [
    { pattern: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i, score: 5 },
    { pattern: /\bFROM\s+\w+/i,                                    score: 4 },
    { pattern: /\bWHERE\s+\w+/i,                                   score: 4 },
    { pattern: /\bJOIN\s+\w+\s+ON\b/i,                            score: 5 },
    { pattern: /\bGROUP\s+BY\b|\bORDER\s+BY\b/i,                 score: 5 },
  ],
  shell: [
    { pattern: /^#!/,                                              score: 5 },
    { pattern: /\becho\s+["']?/,                                   score: 3 },
    { pattern: /\$\{?\w+\}?/,                                      score: 3 },
    { pattern: /\bif\s+\[|\bfi\b|\bdo\b|\bdone\b/,               score: 4 },
    { pattern: /chmod\s+|chown\s+|grep\s+|awk\s+|sed\s+/,        score: 4 },
  ],
  css: [
    { pattern: /[\w-]+\s*:\s*[\w#%'"(]+[;\s]/,                    score: 3 },
    { pattern: /\.\w+\s*\{|\#\w+\s*\{|@media\s+/,               score: 5 },
    { pattern: /margin:|padding:|display:|font-size:/,             score: 4 },
  ],
  javascript: [
    { pattern: /const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=/,   score: 2 },
    { pattern: /=>\s*\{|=>\s*\w+/,                                 score: 3 },
    { pattern: /console\.(log|error|warn)/,                        score: 4 },
    { pattern: /require\s*\(|module\.exports/,                     score: 5 },
    { pattern: /document\.|window\.|addEventListener/,             score: 5 },
    { pattern: /Promise\.|async\s+function|await\s+/,              score: 3 },
    { pattern: /import\s+\{.*\}\s+from\s+['"]/,                   score: 3 },
  ],
}

export function detectLanguage(code: string): string {
  if (!code || !code.trim()) return 'javascript'

  const scores: Record<string, number> = {}

  for (const [lang, signals] of Object.entries(SIGNALS)) {
    scores[lang] = 0
    for (const { pattern, score } of signals) {
      if (pattern.test(code)) scores[lang] += score
    }
  }

  // TSX must beat TypeScript threshold to avoid false positives
  if (scores.tsx < 8) scores.tsx = 0

  const winner = Object.entries(scores).reduce(
    (best, [lang, score]) => (score > best[1] ? [lang, score] : best),
    ['javascript', 0]
  )

  return winner[1] > 0 ? winner[0] : 'javascript'
}
