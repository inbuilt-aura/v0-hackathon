export function detectLanguage(code: string): string {
  if (!code.trim()) return "javascript";

  // TypeScript indicators
  if (
    /(:\s*\w+[\[\]]*[,;]|interface\s+\w+|type\s+\w+|generic|tsconfig)/.test(
      code,
    )
  ) {
    return "typescript";
  }

  // Python indicators
  if (
    /(^|\n)def\s+\w+|^import\s+\w+|from\s+\w+\s+import|print\(|class\s+\w+:|^\s{2,}[a-zA-Z_]|lambda\s+|if\s+__name__/.test(
      code,
    )
  ) {
    return "python";
  }

  // Java indicators
  if (
    /(public\s+(class|static|void)|import\s+java\.|new\s+\w+\(|@Override|IOException)/.test(
      code,
    )
  ) {
    return "java";
  }

  // C# indicators
  if (
    /(using\s+System|public\s+class|namespace\s+\w+|async\s+Task|IEnumerable)/.test(
      code,
    )
  ) {
    return "csharp";
  }

  // C/C++ indicators
  if (
    /(#include\s+<|int\s+main\(|printf\(|malloc\(|nullptr|std::)/.test(code)
  ) {
    return "cpp";
  }

  // Go indicators
  if (
    /(func\s+\w+|package\s+\w+|import\s+\(|defer\s+|interface\{\})/.test(code)
  ) {
    return "go";
  }

  // Rust indicators
  if (/(fn\s+\w+|let\s+\w+|mut\s+|ownership|match\s+|fn\s+main)/.test(code)) {
    return "rust";
  }

  // PHP indicators
  if (/(^\s*<\?php|function\s+\w+\(|\$\w+|echo\s+|mysqli_|PDO)/.test(code)) {
    return "php";
  }

  // Ruby indicators
  if (/(def\s+\w+|puts\s+|attr_accessor|@@\w+|elsif|unless)/.test(code)) {
    return "ruby";
  }

  // Swift indicators
  if (
    /(func\s+\w+|var\s+\w+:|String\(|@IBAction|UIViewController)/.test(code)
  ) {
    return "swift";
  }

  // Kotlin indicators
  if (
    /(fun\s+\w+|val\s+\w+|var\s+\w+|class\s+\w+\s*\(|package\s+\w+)/.test(code)
  ) {
    return "kotlin";
  }

  // Default to JavaScript
  return "javascript";
}
