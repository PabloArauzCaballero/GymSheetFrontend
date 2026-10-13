#!/usr/bin/env python3
"""Read-only structural audit for the social plan and its evidence index.

The audit checks coverage and the shape of completion claims. It cannot prove
that a command was actually run or that an attached artifact is authentic.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit

CASE_ID = re.compile(r"^H\d+\.S\d+\.M\d+$")
REQUIREMENT_ID = re.compile(r"^R\d{2}$")
PHASE_ID = re.compile(r"^H(\d{1,2})$")
VALID_STATES = ("TODO", "EN CURSO", "HECHO", "BLOCKED")
STATE_PATTERN = re.compile(
    r"^(TODO|EN CURSO|HECHO|BLOCKED)(?:\s*(?::|;)\s*.+|\s*\([^()\r\n]+\))?$"
)
FENCE_PATTERN = re.compile(r"^ {0,3}(`{3,}|~{3,})")
LINK_PATTERN = re.compile(r"\]\(([^)]+)\)")
RESULT_PATTERN = re.compile(r"\b(?:PASS|E2E|passed|pasaron?)\b", re.I)
NEGATED_RESULT_PATTERN = re.compile(
    r"\b(?:no\s+(?:test(?:s)?|pruebas?|se\s+ejecut\w*|se\s+corr\w*|se\s+prob\w*)|"
    r"not\s+(?:run|execut\w*|tested|performed)|without\s+(?:running|execut\w*|testing)|"
    r"sin\s+(?:ejecut\w*|correr|pruebas?|test(?:s)?))\b",
    re.I,
)
COMMAND_PATTERN = re.compile(
    r"`\s*(?:python(?:3)?|yarn|npm|pnpm|node|corepack|pytest|jest|vitest|"
    r"playwright|maestro|adb|xcodebuild|ffmpeg)\b[^`]*`",
    re.I,
)
INLINE_PATH_PATTERN = re.compile(r"`(?:\.\.?/|/|[\w.-]+/)[^`\s]+`")
TEST_SELECTOR_PATTERN = re.compile(r"`[^`]*-t\s+['\"]?H\d+\.S\d+\.M\d+['\"]?[^`]*`", re.I)


@dataclass(frozen=True)
class Audit:
    planned_cases: tuple[str, ...]
    traced_cases: tuple[str, ...]
    requirements: tuple[str, ...]
    broken_links: tuple[str, ...]
    errors: tuple[str, ...]


def _outside_fences(text: str):
    fence_char: str | None = None
    fence_length = 0
    for line in text.splitlines():
        match = FENCE_PATTERN.match(line)
        if match:
            marker = match.group(1)
            if fence_char is None:
                fence_char, fence_length = marker[0], len(marker)
            elif marker[0] == fence_char and len(marker) >= fence_length:
                fence_char, fence_length = None, 0
            continue
        if fence_char is None:
            yield line


def _split_table_line(line: str) -> list[str]:
    """Split Markdown cells while preserving escaped and code-span pipes."""
    cells: list[str] = []
    current: list[str] = []
    code_ticks = 0
    index = 0
    line = line.strip()
    while index < len(line):
        char = line[index]
        if char == "\\" and index + 1 < len(line):
            following = line[index + 1]
            if following == "|":
                current.append("|")
                index += 2
                continue
            current.extend((char, following))
            index += 2
            continue
        if char == "`":
            end = index + 1
            while end < len(line) and line[end] == "`":
                end += 1
            tick_count = end - index
            if code_ticks == 0:
                code_ticks = tick_count
            elif code_ticks == tick_count:
                code_ticks = 0
            current.extend(line[index:end])
            index = end
            continue
        if char == "|" and code_ticks == 0:
            cells.append("".join(current).strip())
            current = []
            index += 1
            continue
        current.append(char)
        index += 1
    cells.append("".join(current).strip())
    if line.startswith("|") and cells and cells[0] == "":
        cells.pop(0)
    if line.endswith("|") and cells and cells[-1] == "":
        cells.pop()
    return cells


def _table_cells(text: str, identifier: re.Pattern[str]) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in _outside_fences(text):
        if not line.lstrip().startswith("|"):
            continue
        cells = _split_table_line(line)
        if len(cells) < 2 or not identifier.fullmatch(cells[0]):
            continue
        rows.append(cells)
    return rows


def _table_rows(text: str, identifier: re.Pattern[str]) -> list[tuple[str, str]]:
    return [(cells[0], cells[-1]) for cells in _table_cells(text, identifier)]


def _state(value: str) -> str | None:
    match = STATE_PATTERN.fullmatch(value.strip())
    return match.group(1) if match else None


def _has_affirmative_result(text: str) -> bool:
    for match in RESULT_PATTERN.finditer(text):
        # Reject a result explicitly qualified as not run/executed, including
        # the common form "PASS (no test execution)". Unrelated limitations
        # such as "PAIR pendiente" do not negate a local test result.
        before = text[max(0, match.start() - 48):match.start()]
        after = text[match.end():match.end() + 96]
        if NEGATED_RESULT_PATTERN.search(before) or NEGATED_RESULT_PATTERN.search(after):
            continue
        return True
    return False


def _claims_result(text: str) -> bool:
    return RESULT_PATTERN.search(text) is not None


def _has_concrete_evidence_reference(text: str) -> bool:
    if (COMMAND_PATTERN.search(text) or INLINE_PATH_PATTERN.search(text)
            or TEST_SELECTOR_PATTERN.search(text)):
        return True
    return bool(LINK_PATTERN.search(text))


def _phase_requirements(text: str) -> set[str]:
    for line in _outside_fences(text):
        if line.startswith("**Requisitos:**"):
            return set(re.findall(r"\bR\d{2}\b", line))
    return set()


def _responsible_phases(value: str) -> set[int]:
    phases: set[int] = set()
    for token in re.findall(r"\bH\d{1,2}\b", value):
        match = PHASE_ID.fullmatch(token)
        if match:
            number = int(match.group(1))
            # H12 is the cross-plan acceptance milestone, not the owner of
            # the requirement's implementation coverage.
            if number != 12:
                phases.add(number)
    return phases


def _check_link(root: Path, workspace_root: Path, source: Path, target: str) -> str | None:
    target = target.strip().strip("<>")
    parts = urlsplit(target)
    if parts.scheme in ("http", "https", "mailto"):
        return None
    if parts.scheme or parts.netloc:
        return f"{source.relative_to(root)} -> unsupported link target {target}"
    path = unquote(parts.path)
    if not path:  # anchor-only link
        return None
    # Markdown links beginning with / are treated as plan-root relative.
    candidate = root / path.lstrip("/") if path.startswith("/") else source.parent / path
    try:
        resolved = candidate.resolve()
        resolved.relative_to(workspace_root.resolve())
    except (OSError, RuntimeError, ValueError):
        return f"{source.relative_to(root)} -> link escapes workspace root: {path}"
    if not resolved.exists():
        return f"{source.relative_to(root)} -> {path}"
    return None


def audit(root: Path, workspace_root: Path | None = None) -> Audit:
    errors: list[str] = []
    workspace_root = (workspace_root or root.parent).resolve()
    phase_dir = root / "fases"
    phase_files = sorted(phase_dir.glob("H[0-9][0-9]-*.md"))
    if not phase_files:
        return Audit((), (), (), (), ("No se encontraron documentos de fases",))

    phase_numbers: dict[int, Path] = {}
    phase_reqs: dict[int, set[str]] = {}
    phase_case_rows: dict[str, list[str]] = {}
    phase_duplicates: set[str] = set()
    for path in phase_files:
        phase_match = re.match(r"H(\d{2})-", path.name)
        if not phase_match:
            continue
        phase_number = int(phase_match.group(1))
        phase_numbers[phase_number] = path
        text = path.read_text(encoding="utf-8")
        phase_reqs[phase_number] = _phase_requirements(text)
        rows = _table_cells(text, CASE_ID)
        counts = Counter(row[0] for row in rows)
        phase_duplicates.update(case for case, count in counts.items() if count > 1)
        for row in rows:
            if len(row) != 5:
                errors.append(f"Fila de caso inválida en {path.name}: {row[0]} requiere 5 columnas")
            phase_case_rows.setdefault(row[0], row)
    if phase_duplicates:
        errors.append(f"IDs duplicados en fases: {', '.join(sorted(phase_duplicates))}")
    planned = list(phase_case_rows)

    trace_path = root / "TRAZABILIDAD.md"
    if not trace_path.is_file():
        return Audit(tuple(planned), (), (), (), tuple(errors + ["Falta TRAZABILIDAD.md"]))
    trace = trace_path.read_text(encoding="utf-8")
    trace_case_rows = _table_cells(trace, CASE_ID)
    for row in trace_case_rows:
        if len(row) != 5:
            errors.append(f"Fila de caso inválida en TRAZABILIDAD.md: {row[0]} requiere 5 columnas")
    traced = [row[0] for row in trace_case_rows]
    trace_counts = Counter(traced)
    duplicate_trace = sorted(case for case, count in trace_counts.items() if count > 1)
    if duplicate_trace:
        errors.append(f"IDs duplicados en trazabilidad: {', '.join(duplicate_trace)}")
    if set(planned) != set(traced):
        missing = sorted(set(planned) - set(traced))
        extra = sorted(set(traced) - set(planned))
        if missing:
            errors.append(f"Microtareas sin estado en trazabilidad: {', '.join(missing)}")
        if extra:
            errors.append(f"Microtareas no definidas en fases: {', '.join(extra)}")

    phase_states: dict[str, str | None] = {}
    for case, cells in phase_case_rows.items():
        if len(cells) < 5:
            continue
        state = _state(cells[-1])
        phase_states[case] = state
        if state is None:
            errors.append(f"Estado no reconocido en fase para {case}: {cells[-1]}")

    trace_states: dict[str, str | None] = {}
    for cells in trace_case_rows:
        case, state_text = cells[0], cells[-1]
        state = _state(state_text)
        trace_states[case] = state
        if state is None:
            errors.append(f"Estado no reconocido para {case}: {state_text}")
            continue
        if case not in phase_case_rows:
            continue
        phase_cells = phase_case_rows[case]
        phase_state = phase_states.get(case)
        proof = phase_cells[-2] if len(phase_cells) == 5 else ""
        if state == "HECHO":
            if phase_state != "HECHO":
                errors.append(f"{case} figura HECHO en trazabilidad, pero no en su fase")
            result_missing_or_negated = _claims_result(proof) and not _has_affirmative_result(proof)
            if result_missing_or_negated or not _has_concrete_evidence_reference(proof):
                errors.append(f"{case} figura HECHO sin resultado afirmativo y referencia ejecutable/evidencia")
        elif phase_state == "HECHO":
            errors.append(f"{case} figura HECHO en su fase, pero no en trazabilidad")

    # Resolve the operational requirement owners against each phase's declared
    # scope and its actual case rows. H12 is an acceptance overlay for all Rxx.
    requirement_rows = _table_cells(trace, REQUIREMENT_ID)
    requirements = [row[0] for row in requirement_rows]
    expected = {f"R{number:02d}" for number in range(1, 38)}
    if any(len(row) != 3 for row in requirement_rows):
        errors.append("Fila de requisito inválida en TRAZABILIDAD.md: se requieren 3 columnas")
    if len(requirements) != len(set(requirements)):
        errors.append("Hay requisitos duplicados en la matriz")
    if set(requirements) != expected:
        missing = sorted(expected - set(requirements))
        extra = sorted(set(requirements) - expected)
        errors.append(f"Cobertura R01–R37 inconsistente; faltan={missing}, sobran={extra}")
    owner_map = {number: set() for number in phase_numbers}
    phase_case_ids = {
        number: [case for case in planned if case.startswith(f"H{number}.")]
        for number in phase_numbers
    }
    for row in requirement_rows:
        if len(row) != 3:
            continue
        requirement, owners_text, _ = row
        owners = _responsible_phases(owners_text)
        if not owners:
            errors.append(f"{requirement} no tiene hito responsable de implementación")
            continue
        for owner in owners:
            owner_map.setdefault(owner, set()).add(requirement)
            phase_path = phase_numbers.get(owner)
            if phase_path is None:
                errors.append(f"{requirement} asignado a H{owner}, pero no existe esa fase")
                continue
            if requirement not in phase_reqs.get(owner, set()):
                errors.append(f"{requirement} asignado a H{owner}, pero la fase no lo declara")
            owned_cases = phase_case_ids.get(owner, [])
            if not owned_cases:
                errors.append(f"{requirement} asignado a H{owner} sin microtareas/casos")
            elif not any(case in trace_counts for case in owned_cases):
                errors.append(f"{requirement} asignado a H{owner} sin caso trazado")

    # Each phase requirement must also appear in the operational owner matrix.
    for phase_number, reqs in phase_reqs.items():
        if phase_number == 12:
            continue
        for requirement in reqs:
            if requirement not in owner_map.get(phase_number, set()):
                errors.append(f"{requirement} declarado en H{phase_number}, pero sin asignación/caso trazable")

    broken_links: list[str] = []
    docs = [root / "PLAN.md", root / "PROGRESO.md", root / "REPORTE.md", trace_path,
            *phase_files]
    for path in docs:
        content = "\n".join(_outside_fences(path.read_text(encoding="utf-8")))
        for target in LINK_PATTERN.findall(content):
            error = _check_link(root, workspace_root, path, target)
            if error:
                broken_links.append(error)
    if broken_links:
        errors.append(f"Enlaces locales rotos o fuera del plan: {len(broken_links)}")

    return Audit(tuple(planned), tuple(traced), tuple(requirements),
                 tuple(broken_links), tuple(errors))


def main() -> int:
    repository_root = Path(__file__).resolve().parents[2]
    root = repository_root / "docs/trabajo/2026-10-08-social-recomendaciones"
    result = audit(root, repository_root.parent)
    if result.errors:
        print("FAIL — auditoría de cobertura documental")
        for error in result.errors:
            print(f"- {error}")
        return 1
    print("PASS — cobertura documental consistente")
    print(f"{len(result.planned_cases)} microtareas definidas y trazadas")
    print(f"{len(result.requirements)}/37 requisitos con asignación a Hito y casos trazados")
    print(f"{len(result.broken_links)} enlaces locales rotos o fuera del plan")
    print("Esto no valida que los comandos se hayan ejecutado ni la autenticidad del resultado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
