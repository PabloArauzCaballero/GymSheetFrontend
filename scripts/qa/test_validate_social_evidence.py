import os
import tempfile
import unittest
from pathlib import Path

from validate_social_evidence import audit


CASE = "H1.S1.M1"
GOOD_PROOF = "`python3 -m unittest test_case.py` → PASS; [evidencia](../evidencia/result.txt)"


def make_fixture(
    root: Path,
    *,
    trace_case: str = CASE,
    phase_state: str = "TODO",
    proof: str = GOOD_PROOF,
    trace_state: str = "TODO",
    trace_owner: str = "H1; aceptación H12",
    link_suffix: str = "",
) -> None:
    phases = root / "fases"
    phases.mkdir(parents=True)
    requirements = ", ".join(f"R{i:02d}" for i in range(1, 38))
    (phases / "H01-demo.md").write_text(
        f"**Requisitos:** {requirements}. **Dependencias:** ninguna\n\n"
        f"| {trace_case} | Implementación | Criterio | {proof}{link_suffix} | {phase_state} |\n",
        encoding="utf-8",
    )
    (root / "evidencia").mkdir()
    (root / "evidencia/result.txt").write_text("PASS: test_case.py\n", encoding="utf-8")
    requirement_rows = "\n".join(
        f"| R{i:02d} | {trace_owner if i == 1 else 'H1; aceptación H12'} | TODO |"
        for i in range(1, 38)
    )
    trace_cases = f"| {CASE} | H1 | API | Demo | {trace_state} |"
    (root / "TRAZABILIDAD.md").write_text(
        requirement_rows + "\n\n" + trace_cases + "\n", encoding="utf-8"
    )
    for name in ("PLAN.md", "PROGRESO.md", "REPORTE.md"):
        (root / name).write_text(f"{name}\n", encoding="utf-8")


class ValidateSocialEvidenceTests(unittest.TestCase):
    def test_accepts_complete_requirement_case_and_evidence_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "docs"
            root.mkdir()
            make_fixture(root)
            result = audit(root)
            self.assertEqual((), result.errors)
            self.assertEqual(37, len(result.requirements))

    def test_reports_case_that_has_no_traceability_row(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root, trace_case="H99.S99.M99")
            result = audit(root)
            self.assertTrue(any("sin estado en trazabilidad" in error for error in result.errors))
            self.assertTrue(any("no definidas en fases" in error for error in result.errors))

    def test_reports_broken_local_evidence_link(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root, proof="`python3 -m unittest test_case.py` → PASS; [evidencia](missing.md)")
            result = audit(root)
            self.assertTrue(any("Enlaces locales rotos" in error for error in result.errors))

    def test_rejects_hecho_without_affirmative_executed_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(
                root,
                phase_state="HECHO",
                trace_state="HECHO",
                proof="`python3 -m unittest test_case.py` → PASS (no test execution); [evidencia](evidencia/result.txt)",
            )
            result = audit(root)
            self.assertTrue(any("sin resultado afirmativo" in error for error in result.errors))

    def test_accepts_non_test_completion_with_concrete_artifact_reference(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(
                root,
                phase_state="HECHO",
                trace_state="HECHO",
                proof="Inventario registrado en `../evidencia/result.txt`.",
            )
            result = audit(root)
            self.assertEqual((), result.errors)

    def test_rejects_unknown_extended_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root, phase_state="HECHO", trace_state="HECHO fabricated")
            result = audit(root)
            self.assertTrue(any("Estado no reconocido" in error for error in result.errors))

    def test_detects_duplicate_planned_case_before_mapping(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root)
            phase = root / "fases/H01-demo.md"
            phase.write_text(
                phase.read_text(encoding="utf-8")
                + f"| {CASE} | Duplicado | Otro criterio | TODO | TODO |\n",
                encoding="utf-8",
            )
            result = audit(root)
            self.assertTrue(any("IDs duplicados en fases" in error for error in result.errors))

    def test_rejects_requirement_assigned_to_hito_without_cases(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root, trace_owner="H2; aceptación H12")
            (root / "fases/H02-empty.md").write_text(
                "**Requisitos:** R01. **Dependencias:** ninguna\n", encoding="utf-8"
            )
            result = audit(root)
            self.assertTrue(any("R01 asignado a H2 sin microtareas/casos" in error for error in result.errors))

    def test_rejects_requirement_owner_that_does_not_declare_requirement(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root)
            phase = root / "fases/H01-demo.md"
            phase.write_text(
                phase.read_text(encoding="utf-8").replace("R01, ", "", 1),
                encoding="utf-8",
            )
            result = audit(root)
            self.assertTrue(any("R01 asignado a H1, pero la fase no lo declara" in error for error in result.errors))

    def test_rejects_link_traversal_outside_plan_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            workspace = base / "workspace"
            root = workspace / "docs"
            workspace.mkdir()
            root.mkdir()
            make_fixture(root)
            outside = base / "outside.txt"
            outside.write_text("should not satisfy a plan link", encoding="utf-8")
            relative = os.path.relpath(outside, root / "fases")
            phase = root / "fases/H01-demo.md"
            phase.write_text(
                phase.read_text(encoding="utf-8").replace(
                    "[evidencia](../evidencia/result.txt)", f"[escape]({relative})"
                ),
                encoding="utf-8",
            )
            result = audit(root, workspace)
            self.assertTrue(any("link escapes workspace root" in link for link in result.broken_links))

    def test_accepts_local_links_to_sibling_repository_within_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp) / "workspace"
            root = workspace / "frontend/docs"
            sibling = workspace / "backend/evidence.txt"
            sibling.parent.mkdir(parents=True)
            sibling.write_text("PASS", encoding="utf-8")
            root.mkdir(parents=True)
            make_fixture(root)
            relative = os.path.relpath(sibling, root / "fases")
            phase = root / "fases/H01-demo.md"
            phase.write_text(
                phase.read_text(encoding="utf-8").replace(
                    "[evidencia](../evidencia/result.txt)", f"[evidencia]({relative})"
                ),
                encoding="utf-8",
            )
            result = audit(root, workspace)
            self.assertEqual((), result.errors)

    def test_accepts_parenthetical_state_annotations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(
                root,
                phase_state="EN CURSO (regresión web local)",
                trace_state="EN CURSO (regresión web local)",
            )
            result = audit(root)
            self.assertEqual((), result.errors)

    def test_ignores_tables_inside_fenced_code_blocks(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_fixture(root)
            fake_phase = "```markdown\n| H99.S99.M99 | Fake | Fake | fake | HECHO |\n```\n"
            fake_trace = "```md\n| H99.S99.M99 | H99 | API | fake | HECHO |\n```\n"
            phase = root / "fases/H01-demo.md"
            phase.write_text(phase.read_text(encoding="utf-8") + fake_phase, encoding="utf-8")
            trace = root / "TRAZABILIDAD.md"
            trace.write_text(trace.read_text(encoding="utf-8") + fake_trace, encoding="utf-8")
            result = audit(root)
            self.assertEqual((CASE,), result.planned_cases)
            self.assertEqual((CASE,), result.traced_cases)
            self.assertEqual((), result.errors)

    def test_preserves_escaped_and_code_span_pipes_inside_proof(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            proof = "`python3 -m unittest test_case.py` → PASS; escaped \\| and code `left|right`; [evidencia](../evidencia/result.txt)"
            make_fixture(root, phase_state="HECHO", trace_state="HECHO", proof=proof)
            result = audit(root)
            self.assertEqual((), result.errors)


if __name__ == "__main__":
    unittest.main()
