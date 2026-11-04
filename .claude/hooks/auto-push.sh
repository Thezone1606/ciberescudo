#!/bin/sh
# Al terminar cada tarea de Claude Code: commit de lo que cambió y push a GitHub.
# El .gitignore deja fuera .env, certificados y contraseñas; si no hay cambios, no hace nada.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
export PATH="$PATH:/c/Program Files/GitHub CLI"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
git add -A >/dev/null 2>&1
git diff --cached --quiet && exit 0
files=$(git diff --cached --name-only | wc -l | tr -d ' ')
git commit -q -m "Actualización automática ($files archivos)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" >/dev/null 2>&1 || exit 0
git push -q origin HEAD >/dev/null 2>&1 || echo "No se pudo subir a GitHub; se subirá en el siguiente cambio." >&2
exit 0
