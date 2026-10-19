"""Valida el documento y su trazabilidad; no prueba código de GymSheet."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
index = json.loads((root / "evidencia/plan-index.json").read_text())
phases = index["phases"]
tasks = index["tasks"]
errors = []
required = [
    "PLAN.md", "DECISIONES.md", "ESPECIFICACION.md",
    "ARQUITECTURA_Y_CONTRATOS.md", "RECOMENDADOR.md", "MAPA.md",
    "DATOS_DE_PRUEBA.md", "DOS_DISPOSITIVOS.md", "CALIDAD_Y_DOD.md",
    "LOOP.md", "QA.md", "TRAZABILIDAD.md", "REPORTE.md", "REVISION.md",
]
for name in required:
    if not (root / name).is_file():
        errors.append(f"Documento faltante: {name}")
ids = [task["id"] for task in tasks]
if len(ids) != len(set(ids)):
    errors.append("IDs duplicados en índice")
phase_ids = {phase["n"] for phase in phases}
covered = set()
actual_ids = []
subtasks = 0
for phase in phases:
    n = phase["n"]
    path = root / "fases" / f"H{n:02d}-{phase['slug']}.md"
    if not path.is_file():
        errors.append(f"Falta archivo de H{n}")
        continue
    content = path.read_text()
    actual_ids.extend(re.findall(r"^\| (H\d+\.S\d+\.M\d+) \|", content, re.M))
    subtasks += len(re.findall(r"^## H\d+\.S\d+ —", content, re.M))
    for dependency in phase["deps"]:
        if dependency not in phase_ids or dependency >= n:
            errors.append(f"Dependencia inválida H{n} -> H{dependency}")
    if n != 12:
        covered.update(phase["req"])
    if "**CA del hito:**" not in content or "**DoD del hito:**" not in content:
        errors.append(f"Falta CA/DoD en H{n}")
if set(actual_ids) != set(ids) or len(actual_ids) != len(ids):
    errors.append("Las filas escritas no coinciden con el índice")
for task in tasks:
    if task["status"] not in ("TODO", "EN CURSO", "HECHO", "BLOCKED"):
        errors.append(f"Estado de implementación inesperado: {task['id']}")
    phase = next(p for p in phases if p["n"] == task["phase"])
    content = (root / "fases" / f"H{phase['n']:02d}-{phase['slug']}.md").read_text()
    if task["acceptance"] not in content or task["title"] not in content:
        errors.append(f"Desalineación de CA/título: {task['id']}")
expected = {f"R{i:02d}" for i in range(1, 38)}
if covered != expected:
    errors.append(f"Cobertura de requisitos: faltan {sorted(expected-covered)}")
decision_text = (root / "DECISIONES.md").read_text()
decision_ids = re.findall(r"^\| (R\d+) \|", decision_text, re.M)
if set(decision_ids) != expected or len(decision_ids) != len(expected):
    errors.append("Registro de decisiones incompleto/duplicado")
docs = [p for p in root.rglob("*.md") if "evidencia" not in p.relative_to(root).parts]
links = 0
for path in docs:
    content = path.read_text()
    for target in re.findall(r"\]\(([^)]+)\)", content):
        target = target.strip().strip("<>")
        if re.match(r"^(https?://|#)", target):
            continue
        target = target.split("#", 1)[0]
        links += 1
        if not (path.parent / target).exists():
            errors.append(f"Enlace roto: {path.name} -> {target}")
    # Every table row must have the same number of unescaped column separators.
    width = None
    for line in content.splitlines():
        if line.startswith("|"):
            current = len(re.findall(r"(?<!\\)\|", line))
            if width is None:
                width = current
            elif width != current:
                errors.append(f"Columnas Markdown inconsistentes en {path.name}: {line[:75]}")
        else:
            width = None
if errors:
    print("FAIL — validación documental")
    for error in errors:
        print(error)
    raise SystemExit(1)
print("PASS — validación documental")
print(f"{len(phases)} hitos; {subtasks} subtareas; {len(tasks)} microtareas únicas")
print(f"{len(expected)}/{len(expected)} requisitos asignados a hitos de implementación")
print(f"{len(docs)} documentos Markdown actuales; {links} enlaces locales válidos")
print("Dependencias ordenadas; estados TODO/EN CURSO/HECHO/BLOCKED; CA e índice consistentes")
print("No demuestra: implementación, tests de producto ni funcionamiento en emuladores")
