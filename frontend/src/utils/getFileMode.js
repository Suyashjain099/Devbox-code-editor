export const getFileMode = ({ selectedFile }) => {
  if (!selectedFile) return "plaintext";
  const extension = selectedFile.split('.').pop().toLowerCase();

  const modeMap = {
    // JavaScript / TypeScript
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "typescript",

    // Systems Languages
    c: "c",
    cpp: "cpp",
    cxx: "cpp",
    h: "c",
    hpp: "cpp",
    rs: "rust",
    go: "go",

    // JVM
    java: "java",
    kt: "kotlin",

    // Scripting
    py: "python",
    rb: "ruby",
    php: "php",
    sh: "shell",
    bash: "shell",

    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",

    // Data / Config
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    ini: "ini",
    env: "ini",

    // Docs
    md: "markdown",
    txt: "plaintext",

    // Database
    sql: "sql",

    // Templates
    hbs: "handlebars",
    handlebars: "handlebars",

    // Docker
    dockerfile: "dockerfile",

    // Other
    cs: "csharp",
    swift: "swift",
    r: "r",
    lua: "lua",
    dart: "dart",
    graphql: "graphql",
  };

  return modeMap[extension] || "plaintext";
};
