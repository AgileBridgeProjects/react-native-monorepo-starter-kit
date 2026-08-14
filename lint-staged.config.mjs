export default {
  "apps/backend/**/*.cs": (files) => {
    const relative = files.map((f) => f.replace(/^.*?apps[\\/]backend[\\/]/, ""));
    const command = `cd apps/backend && dotnet tool run csharpier format ${relative.join(" ")}`;

    return process.platform === "win32" ? `cmd /d /s /c "${command}"` : `sh -c '${command}'`;
  },
  "**/*.{js,jsx,ts,tsx,json}": (files) =>
    `npx biome check --write --no-errors-on-unmatched ${quote(files)}`,
  "**/*.md": (files) => `npx markdownlint-cli2 ${quote(files)}`,
  // Secret scan runs on every staged file (respects .secretlintignore).
  "*": (files) => `npx secretlint --secretlintignore .secretlintignore ${quote(files)}`,
};

function quote(files) {
  return files.map((file) => `"${file.replaceAll('"', '\\"')}"`).join(" ");
}
