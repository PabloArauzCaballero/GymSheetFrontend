"""Contract tests for the H1, H3.S2, H5, H7.S4, H8, and H9 pair runner."""
import contextlib
import importlib.util
import io
import json
import math
import pathlib
import subprocess
import sys
import tempfile
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import patch


def load_runner():
    sys.path.insert(0, str(SCRIPT.parent))
    spec = importlib.util.spec_from_file_location("pair_runner", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

SCRIPT = pathlib.Path(__file__).with_name("run-social-pair.py")
BARRIER_SCRIPT = pathlib.Path(__file__).with_name("pair_barrier.py")


def load_barrier():
    spec = importlib.util.spec_from_file_location("pair_barrier", BARRIER_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PairRunnerTests(unittest.TestCase):
    def run_cli(self, *args):
        with tempfile.TemporaryDirectory() as folder:
            out = pathlib.Path(folder) / "manifest.json"
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), *args, "--output", str(out)],
                text=True, capture_output=True, check=False,
                env={"PATH": "/usr/bin:/bin", "QA_API_BASE_URL": "http://127.0.0.1:1",
                     "QA_TOKEN_A": "secret-token-A", "QA_TOKEN_B": "secret-token-B"},
            )
            return completed, json.loads(out.read_text()) if out.exists() else None

    def test_h1_phase_includes_every_required_case_and_blocks_missing_environment(self):
        result, manifest = self.run_cli("--phase", "H1")
        self.assertEqual(result.returncode, 2)
        self.assertEqual([case["id"] for case in manifest["cases"]],
                         [f"H1.S3.M{i}" for i in range(1, 5)])
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        self.assertNotIn("secret-token", json.dumps(manifest))
        self.assertTrue(manifest["runId"])

    def test_unknown_case_fails_without_pass(self):
        result, manifest = self.run_cli("--case", "H1.S3.M99")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("PASS", result.stdout)
        if manifest:
            self.assertNotIn("PASS", json.dumps(manifest))

    def test_h3_s2_cases_are_registered_with_explicit_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            "H3.S2.M1": ("A_WEB", "B_WEB"),
            "H3.S2.M2": ("A_WEB", "B_WEB"),
            "H3.S2.M3": ("A_WEB", "B_WEB"),
            "H3.S2.M4": ("A_WEB",),
        }
        expected_assertions = {
            "H3.S2.M1": "requestAcceptedConnectionVisible",
            "H3.S2.M2": "withdrawalRemovedWithoutChat",
            "H3.S2.M3": "discardUndoRestoredCandidate",
            "H3.S2.M4": "connectionStatusSyncedAcrossSurfaces",
        }
        for case, roles in expected_roles.items():
            self.assertIn(case, runner.CASES)
            self.assertEqual(runner.CASE_ROLES[case], roles)
            self.assertEqual(runner.CASE_ASSERTIONS[case], expected_assertions[case])
            self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))

    def test_h3_s2_role_environment_gets_authenticated_actor_and_opposite_peer(self):
        runner = load_runner()
        actors = {"A": {"id": "actor-a"}, "B": {"id": "actor-b"}}
        for role, actor_id, peer_id in (
                ("A_WEB", "actor-a", "actor-b"),
                ("B_WEB", "actor-b", "actor-a")):
            env = runner.h3_role_identity_env({}, role, actors)
            self.assertEqual(env["QA_H3_ACTOR_USER_ID"], actor_id)
            self.assertEqual(env["QA_H3_PEER_USER_ID"], peer_id)

    def test_h3_s2_drivers_are_recognized_and_unready_api_blocks_without_pass(self):
        result, manifest = self.run_cli("--case", "H3.S2.M1")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(manifest["cases"][0]["verdict"], "BLOCKED")
        self.assertFalse(any("driver H3.S2.M1" in reason
                             for reason in manifest["cases"][0]["reasons"]))
        self.assertTrue(any("API /health/ready unavailable" in reason
                            for reason in manifest["cases"][0]["reasons"]))
        self.assertNotIn("PASS", json.dumps(manifest))

    def test_h3_phase_selects_registered_cases_with_fixed_drivers(self):
        result, manifest = self.run_cli("--phase", "H3")
        self.assertEqual(result.returncode, 2)
        self.assertEqual([case["id"] for case in manifest["cases"]],
                         [f"H3.S2.M{i}" for i in range(1, 5)])
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        self.assertTrue(all(not any("required driver" in reason for reason in case["reasons"])
                            for case in manifest["cases"]))
        self.assertTrue(all(any("API /health/ready unavailable" in reason
                                for reason in case["reasons"])
                            for case in manifest["cases"]))

    def test_h7_s4_cases_are_registered_with_explicit_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            "H7.S4.M1": ("A_ANDROID",),
            "H7.S4.M2": ("A_ANDROID", "B_IOS", "B_WEB"),
            "H7.S4.M3": ("A_IOS", "B_WEB"),
            "H7.S4.M4": ("A_ANDROID", "A_IOS", "A_WEB", "B_WEB"),
            "H7.S4.M5": ("A_ANDROID", "B_WEB"),
        }
        expected_assertions = {
            "H7.S4.M1": "microphoneDeniedTextAvailable",
            "H7.S4.M2": "audioDurationAndPlaybackMatch",
            "H7.S4.M3": "editVisibleAcrossClients",
            "H7.S4.M4": "readReceiptScopeSynced",
            "H7.S4.M5": "revokedChatClearedOnForeground",
        }
        expected_devices = {
            "A_ANDROID": "android", "B_ANDROID": "android",
            "A_IOS": "ios", "A_WEB": "web",
            "B_IOS": "ios", "B_WEB": "web",
            "C_WEB": "web", "A_API": "api",
            "B_API": "api", "C_API": "api",
        }
        self.assertEqual(set(expected_roles), set(runner.CASES) & set(expected_roles))
        self.assertEqual(runner.missing_drivers(
            "H5.S1.M1", SCRIPT.parent / "drivers"), [])
        self.assertEqual(runner.missing_drivers(
            "H5.S1.M2", SCRIPT.parent / "drivers"), [])
        self.assertEqual(runner.missing_drivers(
            "H5.S1.M3", SCRIPT.parent / "drivers"), [])
        self.assertEqual(runner.missing_drivers(
            "H5.S1.M4", SCRIPT.parent / "drivers"), [])
        self.assertEqual(runner.CASE_ROLE_DEVICES, expected_devices)
        self.assertEqual(
            runner.CASE_ROLE_ASSERTIONS["H7.S4.M3", "A_IOS"],
            ("editComposerFocusedAtSave",),
        )
        self.assertEqual(
            runner.CASE_ROLE_ARTIFACTS["H7.S4.M3", "A_IOS"],
            ("editComposerFocusedBeforeSave",),
        )
        for case, roles in expected_roles.items():
            self.assertEqual(runner.CASE_ROLES[case], roles)
            self.assertEqual(runner.CASE_ASSERTIONS[case], expected_assertions[case])
            self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))
    def test_h7_device_preflight_checks_only_devices_required_by_that_case(self):
        runner = load_runner()
        devices = {
            "android": {"ready": False},
            "ios": {"booted": True},
        }
        self.assertEqual(runner.case_preflight_issues("H7.S4.M3", [], devices), [])
        self.assertEqual(runner.case_device_issues("H7.S4.M1", devices),
                         ["selected android device is not connected"])

    def test_m4_preflight_requires_a_valid_disposable_conversation_uuid(self):
        runner = load_runner()
        devices = {"android": {"ready": True}, "ios": {"booted": True}}
        with patch.dict("os.environ", {}, clear=True):
            self.assertIn("M4 requires QA_M4_DISPOSABLE_ACCOUNT_ACK=H7.S4.M4",
                          runner.case_preflight_issues("H7.S4.M4", [], devices))
        with patch.dict("os.environ", {"QA_M4_DISPOSABLE_ACCOUNT_ACK": "H7.S4.M4",
                                        "QA_DISPOSABLE_CONVERSATION_ID": "not-a-uuid"}, clear=True):
            self.assertIn("M4 disposable conversation ID is invalid",
                          runner.case_preflight_issues("H7.S4.M4", [], devices))
        with patch.dict("os.environ", {"QA_M4_DISPOSABLE_ACCOUNT_ACK": "H7.S4.M4",
                      "QA_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111"}, clear=True):
            self.assertNotIn("M4 requires QA_DISPOSABLE_CONVERSATION_ID",
                             runner.case_preflight_issues("H7.S4.M4", [], devices))

    def test_m1_preflight_requires_dedicated_device_ack_and_reserved_chat(self):
        runner = load_runner()
        devices = {"android": {"ready": True}, "ios": {"booted": True}}
        with patch.dict("os.environ", {}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M1", [], devices)
        self.assertIn("M1 requires QA_M1_DISPOSABLE_DEVICE_ACK=H7.S4.M1", issues)
        with patch.dict("os.environ", {
                "QA_M1_DISPOSABLE_DEVICE_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111",
        }, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M1", [], devices)
        self.assertIn("M1 requires QA_M1_DISPOSABLE_PAIR_ACK=H7.S4.M1", issues)
        with patch.dict("os.environ", {
                "QA_M1_DISPOSABLE_DEVICE_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_PAIR_ACK": "H7.S4.M1",
        }, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M1", [], devices)
        self.assertIn("M1 requires QA_M1_DISPOSABLE_CONVERSATION_ID", issues)
        with patch.dict("os.environ", {
                "QA_M1_DISPOSABLE_DEVICE_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_PAIR_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_CONVERSATION_ID": "not-a-uuid",
        }, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M1", [], devices)
        self.assertIn("M1 disposable conversation ID is invalid", issues)
        with patch.dict("os.environ", {
                "QA_M1_DISPOSABLE_DEVICE_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_PAIR_ACK": "H7.S4.M1",
                "QA_M1_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111",
        }, clear=True):
            self.assertEqual(runner.case_preflight_issues("H7.S4.M1", [], devices), [])

    def test_m2_preflight_requires_disposable_pair_device_and_reserved_conversation(self):
        runner = load_runner()
        devices = {"android": {"ready": True}, "ios": {"booted": True}}
        with patch.dict("os.environ", {}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M2", [], devices)
        self.assertIn("M2 requires QA_M2_DISPOSABLE_PAIR_ACK=H7.S4.M2", issues)
        with patch.dict("os.environ", {
                "QA_M2_DISPOSABLE_PAIR_ACK": "H7.S4.M2",
                "QA_M2_DISPOSABLE_DEVICE_ACK": "H7.S4.M2",
        }, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M2", [], devices)
        self.assertIn("M2 requires QA_M2_DISPOSABLE_CONVERSATION_ID", issues)
        valid = {
            "QA_M2_DISPOSABLE_PAIR_ACK": "H7.S4.M2",
            "QA_M2_DISPOSABLE_DEVICE_ACK": "H7.S4.M2",
            "QA_M2_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111",
        }
        with patch.dict("os.environ", {**valid,
                "QA_M2_DISPOSABLE_CONVERSATION_ID": "not-a-uuid"}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M2", [], devices)
        self.assertIn("M2 disposable conversation ID is invalid", issues)
        with patch.dict("os.environ", valid, clear=True):
            self.assertEqual(runner.case_preflight_issues("H7.S4.M2", [], devices), [])

    def test_m2_rejects_audio_proofs_that_do_not_match_message_content_and_duration(self):
        runner = load_runner()
        proof = {
            role: {"audioEvidence": {
                "conversationId": "11111111-1111-4111-8111-111111111111",
                "messageId": "22222222-2222-4222-8222-222222222222",
                "mediaSha256": "a" * 64,
                "mediaDurationMs": 4250,
                "recordedDurationSeconds": 4,
                "playerDurationSeconds": 4 if role != "B_WEB" else 4,
                "playbackAdvanced": role != "A_ANDROID",
            }}
            for role in ("A_ANDROID", "B_IOS", "B_WEB")
        }
        self.assertTrue(runner.validate_m2_audio_evidence(
            proof, "11111111-1111-4111-8111-111111111111"))
        with self.assertRaisesRegex(ValueError, "reserved disposable conversation"):
            runner.validate_m2_audio_evidence(
                proof, "33333333-3333-4333-8333-333333333333")
        mismatched_content = {**proof, "B_WEB": {"audioEvidence": {
            **proof["B_WEB"]["audioEvidence"], "mediaSha256": "b" * 64}}}
        with self.assertRaisesRegex(ValueError, "same audio content"):
            runner.validate_m2_audio_evidence(mismatched_content)
        mismatched_duration = {**proof, "B_IOS": {"audioEvidence": {
            **proof["B_IOS"]["audioEvidence"], "playerDurationSeconds": 6}}}
        with self.assertRaisesRegex(ValueError, "duration"):
            runner.validate_m2_audio_evidence(mismatched_duration)

    def test_m2_requires_all_roles_to_confirm_the_same_logical_cleanup(self):
        runner = load_runner()
        proofs = {role: {"audioEvidence": {"messageId": "22222222-2222-4222-8222-222222222222"},
            "cleanupEvidence": {
            "messageId": "22222222-2222-4222-8222-222222222222",
            "tombstoneConfirmed": True,
            "mediaEndpointUnavailable": True,
            "physicalBlobDeletion": "not_verified",
        }} for role in ("A_ANDROID", "B_IOS", "B_WEB")}
        self.assertTrue(runner.validate_m2_cleanup_evidence(proofs, proofs))
        mismatch = {**proofs, "B_WEB": {"cleanupEvidence": {
            **proofs["B_WEB"]["cleanupEvidence"], "messageId": "33333333-3333-4333-8333-333333333333"}}}
        with self.assertRaisesRegex(ValueError, "different cleanup message IDs"):
            runner.validate_m2_cleanup_evidence(mismatch, mismatch)

    def test_m5_preflight_requires_separate_disposable_pair_ack_and_reserved_ids(self):
        runner = load_runner()
        devices = {"android": {"ready": True}, "ios": {"booted": True}}
        with patch.dict("os.environ", {}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M5", [], devices)
        self.assertIn("M5 requires QA_M5_DISPOSABLE_PAIR_ACK=H7.S4.M5", issues)

        valid = {
            "QA_M5_DISPOSABLE_PAIR_ACK": "H7.S4.M5",
            "QA_M5_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111",
            "QA_M5_DISPOSABLE_CONNECTION_ID": "22222222-2222-4222-8222-222222222222",
        }
        with patch.dict("os.environ", {"QA_M5_DISPOSABLE_PAIR_ACK": "H7.S4.M5"}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M5", [], devices)
        self.assertIn("M5 requires QA_M5_DISPOSABLE_CONVERSATION_ID", issues)
        with patch.dict("os.environ", {"QA_M5_DISPOSABLE_PAIR_ACK": "H7.S4.M5",
                      "QA_M5_DISPOSABLE_CONVERSATION_ID": "11111111-1111-4111-8111-111111111111"}, clear=True):
            issues = runner.case_preflight_issues("H7.S4.M5", [], devices)
        self.assertIn("M5 requires QA_M5_DISPOSABLE_CONNECTION_ID", issues)
        with patch.dict("os.environ", valid, clear=True):
            self.assertEqual(runner.case_preflight_issues("H7.S4.M5", [], devices), [])
        with patch.dict("os.environ", {**valid,
                      "QA_M5_DISPOSABLE_CONNECTION_ID": "not-a-uuid"}, clear=True):
            self.assertIn("M5 disposable connection ID is invalid",
                          runner.case_preflight_issues("H7.S4.M5", [], devices))

    def test_h7_case_is_registered_and_blocks_on_live_preflight_without_devices_or_fixture(self):
        result, manifest = self.run_cli("--case", "H7.S4.M2")
        self.assertEqual(result.returncode, 2)
        self.assertEqual([case["id"] for case in manifest["cases"]], ["H7.S4.M2"])
        case = manifest["cases"][0]
        self.assertEqual(case["verdict"], "BLOCKED")
        self.assertIn("API /health/ready unavailable", " ".join(case["reasons"]))
        self.assertIn("M2 requires QA_M2_DISPOSABLE_PAIR_ACK=H7.S4.M2", " ".join(case["reasons"]))
        self.assertNotIn("evidence", case)

    def test_h7_phase_includes_every_required_case_and_reports_current_preflight_blocks(self):
        result, manifest = self.run_cli("--phase", "H7")
        self.assertEqual(result.returncode, 2)
        self.assertEqual([case["id"] for case in manifest["cases"]],
                         [f"H7.S4.M{i}" for i in range(1, 6)])
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        by_case = {case["id"]: " ".join(case["reasons"]) for case in manifest["cases"]}
        self.assertNotIn("required driver", by_case["H7.S4.M1"])
        self.assertIn("M1 requires QA_M1_DISPOSABLE_DEVICE_ACK=H7.S4.M1", by_case["H7.S4.M1"])
        self.assertIn("API /health/ready unavailable", by_case["H7.S4.M2"])
        self.assertIn("M2 requires QA_M2_DISPOSABLE_PAIR_ACK=H7.S4.M2", by_case["H7.S4.M2"])
        self.assertIn("ios device", by_case["H7.S4.M3"])
        self.assertNotIn("required driver", by_case["H7.S4.M4"])
        self.assertIn("M4 requires QA_M4_DISPOSABLE_ACCOUNT_ACK=H7.S4.M4",
                      by_case["H7.S4.M4"])
        self.assertIn("M5 requires QA_M5_DISPOSABLE_PAIR_ACK=H7.S4.M5",
                      by_case["H7.S4.M5"])
        self.assertTrue(all("evidence" not in case for case in manifest["cases"]))

    def test_h5_cases_are_registered_with_explicit_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            "H5.S1.M1": ("A_WEB",),
            "H5.S1.M2": ("A_WEB",),
            "H5.S1.M3": ("A_WEB",),
            "H5.S1.M4": ("A_WEB",),
            "H5.S2.M1": ("A_ANDROID", "A_IOS", "A_WEB"),
            "H5.S2.M2": ("A_ANDROID", "A_IOS", "A_WEB"),
            "H5.S2.M3": ("A_ANDROID", "A_IOS", "A_WEB"),
            "H5.S2.M4": ("A_ANDROID", "B_IOS", "A_WEB", "B_WEB"),
        }
        expected_assertions = {
            "H5.S1.M1": "discoveryContractErrorRecoverable",
            "H5.S1.M2": "discoveryEmptyExplained",
            "H5.S1.M3": "swipeConflictReconciled",
            "H5.S1.M4": "cursorFreeDeckReloaded",
            "H5.S2.M1": "keyboardSwipeMatchesGesture",
            "H5.S2.M2": "filtersRefreshDeck",
            "H5.S2.M3": "flexibleRangeDisclosed",
            "H5.S2.M4": "simultaneousMatchOpensChat",
        }
        expected_role_assertions = {
            ("H5.S1.M3", "A_WEB"): ("connectionSnapshotUnchanged",),
            ("H5.S1.M4", "A_WEB"): ("swipeWasIntercepted",),
            **{("H5.S2.M3", role): ("returnToPreferredRangeAvailable",)
               for role in expected_roles["H5.S2.M3"]},
            **{("H5.S2.M4", role): ("oneCelebrationPerClient", "chatAccessible")
               for role in expected_roles["H5.S2.M4"]},
        }
        self.assertEqual([case for case in runner.CASES if case.startswith("H5.")],
                         list(expected_roles))
        for case, roles in expected_roles.items():
            self.assertEqual(runner.CASE_ROLES[case], roles)
            self.assertEqual(runner.CASE_ASSERTIONS[case], expected_assertions[case])
            self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))
        self.assertTrue((runner.ROOT / "scripts/qa/drivers/H5.S2.M1-A_WEB.py").is_file())
        self.assertTrue((runner.ROOT / "scripts/qa/drivers/H5.S2.M1-A_ANDROID.py").is_file())
        self.assertTrue((runner.ROOT / "scripts/qa/drivers/H5.S2.M1-A_IOS.py").is_file())
        self.assertEqual(runner.missing_drivers("H5.S2.M1", SCRIPT.parent / "drivers"), [])
        for case_role, assertions in expected_role_assertions.items():
            self.assertEqual(runner.CASE_ROLE_ASSERTIONS[case_role], assertions)

    def test_h5_phase_reports_all_cases_and_explicit_missing_driver_blocks(self):
        result, manifest = self.run_cli("--phase", "H5")
        self.assertEqual(result.returncode, 2)
        self.assertEqual([case["id"] for case in manifest["cases"]],
                         [f"H5.S1.M{i}" for i in range(1, 5)]
                         + [f"H5.S2.M{i}" for i in range(1, 5)])
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        by_case = {case["id"]: " ".join(case["reasons"]) for case in manifest["cases"]}
        for case in ("H5.S1.M1", "H5.S1.M2", "H5.S1.M3", "H5.S1.M4"):
            self.assertNotIn("required driver", by_case[case])
            self.assertIn("API /health/ready unavailable", by_case[case])
        self.assertNotIn("required driver", by_case["H5.S2.M1"])
        self.assertNotIn("required driver H5.S2.M1-A_WEB.py missing", by_case["H5.S2.M1"])
        self.assertTrue(all("required driver" in by_case[case]
                            for case in by_case
                            if case not in ("H5.S1.M1", "H5.S1.M2", "H5.S1.M3", "H5.S1.M4",
                                            "H5.S2.M1")))
        self.assertTrue(all("evidence" not in case for case in manifest["cases"]))
        self.assertNotIn("secret-token", json.dumps(manifest))

    def test_h5_simultaneous_decisions_use_a_shared_barrier(self):
        runner = load_runner()
        self.assertTrue(runner.case_uses_barrier("H5.S2.M4"))
        self.assertFalse(runner.case_uses_barrier("H5.S2.M1"))

    def test_h8_cases_are_registered_with_required_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            "H8.S1.M1": ("A_WEB", "B_WEB"),
            "H8.S1.M2": ("A_ANDROID", "B_WEB", "C_WEB"),
            "H8.S1.M3": ("A_WEB", "B_WEB"),
            "H8.S1.M4": ("A_ANDROID", "B_WEB", "C_WEB"),
            "H8.S2.M1": ("B_ANDROID", "A_WEB"),
            "H8.S2.M2": ("B_ANDROID", "A_WEB"),
            "H8.S2.M3": ("A_WEB", "B_WEB"),
            "H8.S2.M4": ("B_ANDROID", "A_WEB"),
            "H8.S3.M1": ("A_ANDROID", "B_WEB", "C_WEB"),
            "H8.S3.M2": ("A_ANDROID",),
            "H8.S3.M3": ("A_ANDROID", "B_WEB"),
            "H8.S3.M4": ("A_ANDROID", "B_IOS"),
            "H8.S4.M1": ("A_API",),
            "H8.S4.M2": ("A_API",),
        }
        expected_assertions = {
            "H8.S1.M1": "authorizedStoryVisibleAcrossGyms",
            "H8.S1.M2": "selectedAudienceVisibleOnlyToRecipient",
            "H8.S1.M3": "expiredStoryUnavailable",
            "H8.S1.M4": "storyViewerListOwnerOnly",
            "H8.S2.M1": "storyReactionDeliveredExactlyOnce",
            "H8.S2.M2": "storyReplyDeliveredWithReference",
            "H8.S2.M3": "unavailableStoryReferencePreservesText",
            "H8.S2.M4": "disconnectedStoryReactionCreatesNoChat",
            "H8.S3.M1": "selectedAudienceSurvivesClientReload",
            "H8.S3.M2": "storyRemainsPausedAfterForeground",
            "H8.S3.M3": "storyUploadRetryCreatesSingleStory",
            "H8.S3.M4": "deletedStoryRemovedFromActiveViewer",
            "H8.S4.M1": "legacyStoriesSurviveMigration",
            "H8.S4.M2": "emptyDatabaseLoadsStoryFixture",
        }
        self.assertEqual([case for case in runner.CASES if case.startswith("H8.")],
                         list(expected_roles))
        self.assertEqual(set(expected_roles), set(runner.CASE_ROLES) & set(expected_roles))
        for case, roles in expected_roles.items():
            self.assertEqual(runner.CASE_ROLES[case], roles)
            self.assertEqual(runner.CASE_ASSERTIONS[case], expected_assertions[case])
            self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))
        self.assertEqual(runner.CASE_ROLE_ACTORS["C_WEB"], "C")
        self.assertEqual(runner.CASE_ROLE_ACTORS["A_API"], "A")
        self.assertEqual(runner.case_device_issues("H8.S4.M2", {
            "android": {"ready": False}, "ios": {"booted": False},
        }), [])
    def test_h8_phase_manifest_lists_all_required_cases_and_blocks_missing_drivers(self):
        runner = load_runner()
        expected_case_ids = [
            *(f"H8.S1.M{i}" for i in range(1, 5)),
            *(f"H8.S2.M{i}" for i in range(1, 5)),
            *(f"H8.S3.M{i}" for i in range(1, 5)),
            *(f"H8.S4.M{i}" for i in range(1, 3)),
        ]
        api = {"ready": False, "actors": {}}
        devices = {"android": {"ready": False}, "ios": {"booted": False}}
        with tempfile.TemporaryDirectory() as folder:
            output = pathlib.Path(folder) / "h8-manifest.json"
            drivers = pathlib.Path(folder) / "drivers"
            with patch.dict("os.environ", {
                    "QA_RUN_ID": "h8-contract-run",
                    "QA_API_BASE_URL": "http://127.0.0.1:3011/api/v1",
                    "QA_WEB_BASE_URL": "http://127.0.0.1:3002",
            }, clear=True), \
                    patch.object(runner, "device_state", return_value=devices), \
                    patch.object(runner, "observe_api", return_value=(api, ["API unavailable"])) as observe, \
                    patch.object(runner, "repo_state", return_value={"present": False}), \
                    patch.object(runner, "command", return_value={"available": False}), \
                    patch.object(sys, "argv", [str(SCRIPT), "--phase", "H8", "--output", str(output),
                                                "--drivers-dir", str(drivers)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                exit_code = runner.main()

            manifest = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 2)
        self.assertEqual(manifest["runId"], "h8-contract-run")
        self.assertEqual([case["id"] for case in manifest["cases"]], expected_case_ids)
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        for case in manifest["cases"]:
            self.assertEqual(case["requiredRoles"], list(runner.CASE_ROLES[case["id"]]))
            self.assertTrue(all("required driver " in reason for reason in case["reasons"]))
            self.assertNotIn("evidence", case)
        self.assertEqual(observe.call_args.args[1], ("A", "B", "C"))
        self.assertFalse(manifest["secretsIncluded"])

    def test_h8_case_barriers_cover_multi_role_interactions(self):
        runner = load_runner()
        self.assertTrue(runner.case_uses_barrier("H8.S1.M2"))
        self.assertTrue(runner.case_uses_barrier("H8.S2.M1"))
        self.assertFalse(runner.case_uses_barrier("H8.S3.M2"))

    def test_h9_cases_are_registered_with_api_and_ui_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            "H9.S1.M1": ("A_API",),
            "H9.S1.M2": ("A_API",),
            "H9.S1.M3": ("A_API",),
            "H9.S1.M4": ("A_API",),
            "H9.S2.M1": ("A_API", "B_API"),
            "H9.S2.M2": ("A_API", "B_API"),
            "H9.S2.M3": ("A_API", "B_API", "C_API"),
            "H9.S2.M4": ("A_API", "B_API"),
            "H9.S2.M5": ("A_API", "B_API"),
            "H9.S2.M6": ("A_API", "B_API", "C_API"),
            "H9.S3.M1": ("A_ANDROID", "A_WEB"),
            "H9.S3.M2": ("A_ANDROID", "A_WEB"),
            "H9.S3.M3": ("A_ANDROID", "A_WEB"),
            "H9.S3.M4": ("A_ANDROID", "A_WEB"),
            "H9.S3.M5": ("A_ANDROID", "B_WEB"),
            "H9.S3.M6": ("A_ANDROID", "B_WEB"),
            "H9.S4.M1": ("A_API",),
            "H9.S4.M2": ("A_API",),
        }
        self.assertEqual([case for case in runner.CASES if case.startswith("H9.")],
                         list(expected_roles))
        self.assertEqual(set(expected_roles), set(runner.CASE_ROLES) & set(expected_roles))
        for case, roles in expected_roles.items():
            with self.subTest(case=case):
                self.assertEqual(runner.CASE_ROLES[case], roles)
                self.assertTrue(runner.CASE_ASSERTIONS[case])
                self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))
                if case.startswith(("H9.S1.", "H9.S2.", "H9.S4.")):
                    self.assertTrue(all(runner.CASE_ROLE_DEVICES[role] == "api" for role in roles))
                else:
                    self.assertTrue(all(runner.CASE_ROLE_DEVICES[role] in ("android", "ios", "web")
                                        for role in roles))

    def test_h9_phase_manifest_registers_all_cases_and_blocks_missing_drivers(self):
        runner = load_runner()
        expected_case_ids = [
            *(f"H9.S1.M{i}" for i in range(1, 5)),
            *(f"H9.S2.M{i}" for i in range(1, 7)),
            *(f"H9.S3.M{i}" for i in range(1, 7)),
            *(f"H9.S4.M{i}" for i in range(1, 3)),
        ]
        api = {"ready": False, "actors": {}}
        devices = {"android": {"ready": False}, "ios": {"booted": False}}
        with tempfile.TemporaryDirectory() as folder:
            output = pathlib.Path(folder) / "h9-manifest.json"
            drivers = pathlib.Path(folder) / "drivers"
            with patch.dict("os.environ", {
                    "QA_RUN_ID": "h9-contract-run",
                    "QA_API_BASE_URL": "http://127.0.0.1:3011/api/v1",
                    "QA_WEB_BASE_URL": "http://127.0.0.1:3002",
            }, clear=True), \
                    patch.object(runner, "device_state", return_value=devices), \
                    patch.object(runner, "observe_api", return_value=(api, ["API unavailable"])) as observe, \
                    patch.object(runner, "repo_state", return_value={"present": False}), \
                    patch.object(runner, "command", return_value={"available": False}), \
                    patch.object(sys, "argv", [str(SCRIPT), "--phase", "H9", "--output", str(output),
                                                "--drivers-dir", str(drivers)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                exit_code = runner.main()

            manifest = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 2)
        self.assertEqual(manifest["runId"], "h9-contract-run")
        self.assertEqual([case["id"] for case in manifest["cases"]], expected_case_ids)
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        for case in manifest["cases"]:
            self.assertEqual(case["requiredRoles"], list(runner.CASE_ROLES[case["id"]]))
            self.assertTrue(all("required driver " in reason for reason in case["reasons"]))
            self.assertNotIn("evidence", case)
        self.assertEqual(observe.call_args.args[1], ("A", "B", "C"))
        self.assertFalse(manifest["secretsIncluded"])

    def test_h10_cases_are_registered_with_roles_and_assertions(self):
        runner = load_runner()
        expected_roles = {
            **{f"H10.S1.M{i}": ("A_API", "B_API") for i in range(1, 7)},
            **{f"H10.S2.M{i}": ("A_API", "B_API") for i in range(1, 6)},
            "H10.S3.M1": ("A_ANDROID", "A_WEB"),
            "H10.S3.M2": ("A_ANDROID", "B_IOS", "B_WEB"),
            "H10.S3.M3": ("A_IOS", "A_WEB"),
            "H10.S3.M4": ("A_ANDROID", "A_IOS"),
            "H10.S3.M5": ("A_ANDROID", "A_WEB"),
            "H10.S4.M1": ("A_API",),
            "H10.S4.M2": ("A_API",),
        }
        self.assertEqual([case for case in runner.CASES if case.startswith("H10.")],
                         list(expected_roles))
        for case, roles in expected_roles.items():
            with self.subTest(case=case):
                self.assertEqual(runner.CASE_ROLES[case], roles)
                self.assertTrue(runner.CASE_ASSERTIONS[case])
                self.assertTrue(all(role in runner.CASE_ROLE_ACTORS for role in roles))
                if case.startswith(("H10.S1.", "H10.S2.", "H10.S4.")):
                    self.assertTrue(all(runner.CASE_ROLE_DEVICES[role] == "api" for role in roles))
                else:
                    self.assertTrue(all(runner.CASE_ROLE_DEVICES[role] in ("android", "ios", "web")
                                        for role in roles))

    def test_h10_phase_manifest_registers_cases_and_blocks_missing_drivers(self):
        runner = load_runner()
        expected_case_ids = [
            *(f"H10.S1.M{i}" for i in range(1, 7)),
            *(f"H10.S2.M{i}" for i in range(1, 6)),
            *(f"H10.S3.M{i}" for i in range(1, 6)),
            *(f"H10.S4.M{i}" for i in range(1, 3)),
        ]
        api = {"ready": False, "actors": {}}
        devices = {"android": {"ready": False}, "ios": {"booted": False}}
        with tempfile.TemporaryDirectory() as folder:
            output = pathlib.Path(folder) / "h10-manifest.json"
            drivers = pathlib.Path(folder) / "drivers"
            with patch.dict("os.environ", {
                    "QA_RUN_ID": "h10-contract-run",
                    "QA_API_BASE_URL": "http://127.0.0.1:3011/api/v1",
                    "QA_WEB_BASE_URL": "http://127.0.0.1:3002",
                    "QA_H10_DISPOSABLE_INVITATION_ID": "00000000-0000-4000-8000-000000000010",
            }, clear=True), \
                    patch.object(runner, "device_state", return_value=devices), \
                    patch.object(runner, "observe_api", return_value=(api, ["API unavailable"])) as observe, \
                    patch.object(runner, "repo_state", return_value={"present": False}), \
                    patch.object(runner, "command", return_value={"available": False}), \
                    patch.object(sys, "argv", [str(SCRIPT), "--phase", "H10", "--output", str(output),
                                                "--drivers-dir", str(drivers)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                exit_code = runner.main()

            manifest = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 2)
        self.assertEqual(manifest["runId"], "h10-contract-run")
        self.assertEqual([case["id"] for case in manifest["cases"]], expected_case_ids)
        self.assertTrue(all(case["verdict"] == "BLOCKED" for case in manifest["cases"]))
        for case in manifest["cases"]:
            self.assertEqual(case["requiredRoles"], list(runner.CASE_ROLES[case["id"]]))
            self.assertTrue(all("required driver " in reason for reason in case["reasons"]))
            self.assertNotIn("evidence", case)
        self.assertEqual(observe.call_args.args[1], ("A", "B"))
        self.assertFalse(manifest["secretsIncluded"])

    def test_h10_calendar_pair_requires_same_actor_and_uid(self):
        runner = load_runner()
        roles = ("A_IOS", "A_WEB")
        proofs = {role: {"apiActorId": "actor-a", "observations": {
            "uid": "event@example.invalid", "invitationId": "invite-a"}}
                  for role in roles}
        runner.validate_calendar_pair(proofs, roles)
        proofs["A_WEB"]["observations"]["uid"] = "different@example.invalid"
        with self.assertRaisesRegex(ValueError, "UID differs"):
            runner.validate_calendar_pair(proofs, roles)
        proofs["A_WEB"]["observations"]["uid"] = "event@example.invalid"
        proofs["A_WEB"]["apiActorId"] = "actor-b"
        with self.assertRaisesRegex(ValueError, "same account"):
            runner.validate_calendar_pair(proofs, roles)
        proofs["A_WEB"]["apiActorId"] = "actor-a"
        proofs["A_WEB"]["observations"]["invitationId"] = "invite-b"
        with self.assertRaisesRegex(ValueError, "same invitation"):
            runner.validate_calendar_pair(proofs, roles)

    def test_h10_calendar_preflight_requires_a_reserved_invitation(self):
        runner = load_runner()
        devices = {"android": {"ready": False}, "ios": {"booted": True}}
        with patch.dict("os.environ", {}, clear=True):
            issues = runner.case_preflight_issues("H10.S3.M3", [], devices)
        self.assertIn("H10.S3.M3 requires QA_H10_DISPOSABLE_INVITATION_ID", issues)
        with patch.dict("os.environ", {"QA_H10_DISPOSABLE_INVITATION_ID": "bad-id"}, clear=True):
            issues = runner.case_preflight_issues("H10.S3.M3", [], devices)
        self.assertIn("H10.S3.M3 disposable invitation ID is invalid", issues)

    def test_h9_api_service_unavailable_blocks_when_driver_is_present(self):
        runner = load_runner()
        api = {"ready": False, "actors": {}}
        devices = {"android": {"ready": False}, "ios": {"booted": False}}
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            (drivers / "H9.S1.M1-A_API.py").write_text("# API driver pending\n", encoding="utf-8")
            output = root / "h9-api-blocked.json"
            with patch.dict("os.environ", {
                    "QA_RUN_ID": "h9-api-blocked",
                    "QA_API_BASE_URL": "http://127.0.0.1:3011/api/v1",
                    "QA_WEB_BASE_URL": "http://127.0.0.1:3002",
            }, clear=True), \
                    patch.object(runner, "device_state", return_value=devices), \
                    patch.object(runner, "observe_api", return_value=(api, ["API /health/ready unavailable"])), \
                    patch.object(runner, "repo_state", return_value={"present": False}), \
                    patch.object(runner, "command", return_value={"available": False}), \
                    patch.object(sys, "argv", [str(SCRIPT), "--case", "H9.S1.M1", "--output", str(output),
                                                "--drivers-dir", str(drivers)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                exit_code = runner.main()
            case = json.loads(output.read_text(encoding="utf-8"))["cases"][0]

        self.assertEqual(exit_code, 2)
        self.assertEqual(case["verdict"], "BLOCKED")
        self.assertEqual(case["requiredRoles"], ["A_API"])
        self.assertIn("API /health/ready unavailable", case["reasons"])

    def test_h9_barriers_cover_concurrent_repost_and_cross_client_mutations(self):
        runner = load_runner()
        self.assertTrue(runner.case_uses_barrier("H9.S2.M3"))
        self.assertTrue(runner.case_uses_barrier("H9.S3.M4"))
        self.assertTrue(runner.case_uses_barrier("H9.S3.M5"))
        self.assertTrue(runner.case_uses_barrier("H9.S3.M6"))
        self.assertFalse(runner.case_uses_barrier("H9.S1.M1"))
        self.assertFalse(runner.case_uses_barrier("H9.S3.M3"))
        self.assertEqual(runner.case_device_issues("H9.S1.M1", {
            "android": {"ready": False}, "ios": {"booted": False},
        }), [])
        self.assertEqual(runner.case_device_issues("H9.S3.M1", {
            "android": {"ready": False}, "ios": {"booted": False},
        }), ["selected android device is not connected"])

    def test_barrier_observes_api_until_expected_state(self):
        spec = importlib.util.spec_from_file_location("pair_runner", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        responses = iter([{"id": "a"}, {"id": "b"}])
        observed = module.wait_for_state(lambda: next(responses), {"id": "b"}, timeout=1, interval=0)
        self.assertEqual(observed["id"], "b")

    def test_invalid_git_head_is_not_reported_as_sha(self):
        spec = importlib.util.spec_from_file_location("pair_runner", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            repo = pathlib.Path(folder)
            (repo / ".git").mkdir()
            self.assertIsNone(module.repo_state(repo)["sha"])

    def test_readiness_rejects_http_200_with_degraded_dependencies(self):
        runner = load_runner()
        degraded = {"ok": True, "data": {"status": "ok", "dependencies": {
            "database": "down", "migrations": "up-to-date", "redis": "ready"}}}
        self.assertEqual(runner.response_data(degraded)["dependencies"]["database"], "down")
        with patch.object(runner, "get_json", return_value=degraded):
            observed, issues = runner.observe_api("http://127.0.0.1:1/api/v1")
        self.assertFalse(observed["ready"])
        self.assertIn("API /health/ready unavailable", issues)

    def test_observe_api_accepts_backend_envelopes_and_distinct_actors(self):
        runner = load_runner()
        ready = {"ok": True, "data": {"status": "ok", "dependencies": {
            "database": "ready", "migrations": "up-to-date", "redis": "not-configured"}}}
        def response(url, token=None):
            if url.endswith("/health/ready"):
                return ready
            return {"ok": True, "data": {"id": "a" if token == "token-a" else "b"}}
        with patch.dict("os.environ", {"QA_TOKEN_A": "token-a", "QA_TOKEN_B": "token-b"}):
            with patch.object(runner, "get_json", side_effect=response):
                observed, issues = runner.observe_api("http://local/api/v1")
        self.assertEqual(issues, [])
        self.assertTrue(observed["ready"])
        self.assertEqual(observed["actors"], {"A": {"id": "a"}, "B": {"id": "b"}})

    def test_observe_api_rejects_false_success_envelope(self):
        runner = load_runner()
        degraded = {"ok": False, "data": {"status": "ok", "dependencies": {
            "database": "ready", "migrations": "up-to-date", "redis": "ready"}}}
        with patch.object(runner, "get_json", return_value=degraded):
            observed, issues = runner.observe_api("http://local/api/v1")
        self.assertFalse(observed["ready"])
        self.assertIn("API /health/ready unavailable", issues)

    def test_valid_driver_evidence_can_pass_a_case(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            artifact = root / "screen.png"
            artifact.write_bytes(b"real nonempty capture")
            import hashlib
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            for role in ("A", "B"):
                driver = drivers / f"H1.S3.M1-{role}.py"
                driver.write_text("import json,sys\nfrom pathlib import Path\n"
                    "args=sys.argv\n"
                    f"print(json.dumps({{'runId':args[args.index('--run-id')+1], 'case':'H1.S3.M1', 'role':'{role}', 'apiActorId':'{role.lower()}', 'assertions':{{'profileAccountMatchesApi': True}}, 'artifacts':[{{'path':{str(artifact)!r},'sha256':{digest!r}}}]}}))\n")
            result = runner.run_case("H1.S3.M1", "test-run", drivers, root,
                {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}})
            self.assertEqual(result["verdict"], "PASS")

    def test_driver_receives_only_its_own_actor_token(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            artifact = root / "capture.png"
            artifact.write_bytes(b"private QA capture")
            import hashlib
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            driver = drivers / "H7.S4.M1-A_ANDROID.py"
            driver.write_text(
                "import json,os,sys\n"
                "if not os.environ.get('QA_TOKEN_A') or os.environ.get('QA_TOKEN_B'): raise SystemExit(9)\n"
                "if os.environ.get('QA_API_BASE_URL') != 'https://api.test/api/v1' or os.environ.get('QA_WEB_BASE_URL') != 'https://web.test': raise SystemExit(10)\n"
                "a=sys.argv\n"
                f"print(json.dumps({{'runId':a[a.index('--run-id')+1], 'case':'H7.S4.M1', 'role':'A_ANDROID', 'apiActorId':'a', 'assertions':{{'microphoneDeniedTextAvailable':True}}, 'artifacts':[{{'path':{str(artifact)!r}, 'sha256':{digest!r}}}]}}))\n"
            )
            api = {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}}
            with patch.dict("os.environ", {"QA_TOKEN_A": "token-a", "QA_TOKEN_B": "token-b"}):
                result = runner.run_case("H7.S4.M1", "r", drivers, root, api,
                                         "https://api.test/api/v1", "https://web.test")
            self.assertEqual(result["verdict"], "PASS")

    def test_h7_roles_receive_the_same_fresh_barrier_directory(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            for role in runner.CASE_ROLES["H7.S4.M3"]:
                (drivers / f"H7.S4.M3-{role}.py").write_text("# fake pair role\n", encoding="utf-8")
            observed = []

            def fake_run(args, **kwargs):
                role = args[args.index("--role") + 1]
                barrier_dir = pathlib.Path(args[args.index("--barrier-dir") + 1])
                observed.append(barrier_dir)
                artifact = root / (
                    "H7.S4.M3-A_IOS-keyboard-reuse-this-run.png"
                    if role == "A_IOS" else f"{role}.png"
                )
                artifact.write_bytes(
                    b"\x89PNG\r\n\x1a\nA_IOS" if role == "A_IOS" else role.encode()
                )
                import hashlib
                assertions = {"editVisibleAcrossClients": True}
                artifacts = [{"path": str(artifact),
                              "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()}]
                if role == "A_IOS":
                    assertions["editComposerFocusedAtSave"] = True
                    artifacts[0]["evidenceType"] = "editComposerFocusedBeforeSave"
                proof = {"runId": "reuse-this-run", "case": "H7.S4.M3", "role": role,
                         "apiActorId": "a" if role == "A_IOS" else "b",
                         "assertions": assertions,
                         "artifacts": artifacts}
                return SimpleNamespace(returncode=0, stdout=json.dumps(proof), stderr="")

            api = {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}}
            with patch.object(runner.subprocess, "run", side_effect=fake_run):
                result = runner.run_case("H7.S4.M3", "reuse-this-run", drivers, root, api)
            self.assertEqual(result["verdict"], "PASS")
            self.assertEqual(len(observed), 2)
            self.assertEqual(observed[0], observed[1])
            self.assertTrue(observed[0].is_relative_to(root.resolve() / ".barriers"))

    def test_driver_exit_two_reports_blocked_precondition(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            (drivers / "H7.S4.M1-A_ANDROID.py").write_text("# preflight only\n", encoding="utf-8")
            with patch.object(runner.subprocess, "run",
                              return_value=SimpleNamespace(returncode=2, stdout="", stderr="")):
                result = runner.run_case("H7.S4.M1", "r", drivers, root,
                    {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}})
            self.assertEqual(result["verdict"], "BLOCKED")
            self.assertIn("precondition", " ".join(result["reasons"]))

    def test_driver_evidence_wrong_hash_fails(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            artifact = pathlib.Path(folder) / "proof.png"
            artifact.write_bytes(b"pixels")
            proof = {"runId": "r", "case": "H1.S3.M1", "role": "A", "apiActorId": "a",
                     "assertions": {"profileAccountMatchesApi": True},
                     "artifacts": [{"path": str(artifact), "sha256": "0" * 64}]}
            with self.assertRaises(ValueError):
                runner.validate_driver_evidence(proof, "r", "H1.S3.M1", "A", "a", pathlib.Path(folder))

    def test_h7_m3_ios_evidence_requires_composer_focused_at_save(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            artifact = pathlib.Path(folder) / "H7.S4.M3-A_IOS-keyboard-r-0123456789abcdef.png"
            artifact.write_bytes(b"pixels")
            import hashlib
            screenshot = {"path": str(artifact),
                          "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()}
            proof = {
                "runId": "r", "case": "H7.S4.M3", "role": "A_IOS", "apiActorId": "a",
                "assertions": {"editVisibleAcrossClients": True},
                "artifacts": [screenshot],
            }
            with self.assertRaisesRegex(ValueError, "role assertion missing"):
                runner.validate_driver_evidence(proof, "r", "H7.S4.M3", "A_IOS", "a", pathlib.Path(folder))
            proof["assertions"]["editComposerFocusedAtSave"] = True
            with self.assertRaisesRegex(ValueError, "required role artifact missing"):
                runner.validate_driver_evidence(proof, "r", "H7.S4.M3", "A_IOS", "a", pathlib.Path(folder))
            screenshot["evidenceType"] = "editComposerFocusedBeforeSave"
            with self.assertRaisesRegex(ValueError, "PNG signature"):
                runner.validate_driver_evidence(proof, "r", "H7.S4.M3", "A_IOS", "a", pathlib.Path(folder))
            artifact.write_bytes(b"\x89PNG\r\n\x1a\nfake image bytes")
            screenshot["sha256"] = hashlib.sha256(artifact.read_bytes()).hexdigest()
            duplicate = {**screenshot, "path": str(pathlib.Path(folder) / "wrong-name.png")}
            pathlib.Path(duplicate["path"]).write_bytes(artifact.read_bytes())
            duplicate["sha256"] = hashlib.sha256(pathlib.Path(duplicate["path"]).read_bytes()).hexdigest()
            proof["artifacts"].append(duplicate)
            with self.assertRaisesRegex(ValueError, "duplicated"):
                runner.validate_driver_evidence(proof, "r", "H7.S4.M3", "A_IOS", "a", pathlib.Path(folder))
            proof["artifacts"].pop()
            validated = runner.validate_driver_evidence(
                proof, "r", "H7.S4.M3", "A_IOS", "a", pathlib.Path(folder),
            )
            self.assertIn("editComposerFocusedAtSave", validated["additionalAssertions"])
            self.assertIn("editComposerFocusedBeforeSave", validated["additionalArtifacts"])

    def test_malformed_driver_assertions_are_rejected_as_invalid_evidence(self):
        runner = load_runner()
        proof = {"runId": "r", "case": "H1.S3.M1", "role": "A", "apiActorId": "a", "assertions": None}
        with self.assertRaises(ValueError):
            runner.validate_driver_evidence(proof, "r", "H1.S3.M1", "A", "a", pathlib.Path("/tmp"))

    def test_persistence_case_requires_api_state_after_restart(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            artifact = root / "restart.png"
            artifact.write_bytes(b"post-restart capture")
            import hashlib
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            driver = drivers / "H1.S3.M4-A.py"
            driver.write_text("import json,sys\nargs=sys.argv\n"
                f"print(json.dumps({{'runId':args[args.index('--run-id')+1], 'case':'H1.S3.M4', 'role':'A', 'apiActorId':'a', 'assertions':{{'persistedAfterRestart':True}}, 'artifacts':[{{'path':{str(artifact)!r}, 'sha256':{digest!r}}}]}}))\n")
            result = runner.run_case("H1.S3.M4", "r", drivers, root,
                {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}})
            self.assertNotEqual(result["verdict"], "PASS")

    def test_m4_rejects_absent_expected_or_observed_field(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            artifact = root / "restart.png"
            artifact.write_bytes(b"capture")
            import hashlib
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            driver = drivers / "H1.S3.M4-A.py"
            def write_driver(state):
                driver.write_text("import json,sys\na=sys.argv\n"
                    f"print(json.dumps({{'runId':a[a.index('--run-id')+1], 'case':'H1.S3.M4', 'role':'A', 'apiActorId':'a', 'assertions':{{'persistedAfterRestart':True}}, 'apiState':{state!r}, 'artifacts':[{{'path':{str(artifact)!r}, 'sha256':{digest!r}}}]}}))\n")
            api = {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}}
            with patch.dict("os.environ", {"QA_TOKEN_A": "private"}):
                write_driver({"field": "genero"})
                with patch.object(runner, "get_json", side_effect=[{"genero": "MALE"}, {}]):
                    self.assertNotEqual(runner.run_case("H1.S3.M4", "r", drivers, root, api, "http://local" )["verdict"], "PASS")
                write_driver({"field": "genero", "value": "FEMALE"})
                with patch.object(runner, "get_json", side_effect=[{}, {"genero": "FEMALE"}]):
                    self.assertNotEqual(runner.run_case("H1.S3.M4", "r", drivers, root, api, "http://local")["verdict"], "PASS")

    def test_m3_rejects_shared_artifact_without_rendezvous(self):
        runner = load_runner()
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            drivers = root / "drivers"
            drivers.mkdir()
            artifact = root / "recording.mp4"
            artifact.write_bytes(b"one recording")
            import hashlib
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            for role in ("A", "B"):
                (drivers / f"H1.S3.M3-{role}.py").write_text("import json,sys\na=sys.argv\n"
                    f"print(json.dumps({{'runId':a[a.index('--run-id')+1], 'case':'H1.S3.M3', 'role':'{role}', 'apiActorId':'{role.lower()}', 'assertions':{{'simultaneousCapture':True}}, 'artifacts':[{{'path':{str(artifact)!r}, 'sha256':{digest!r}}}]}}))\n")
            result = runner.run_case("H1.S3.M3", "r", drivers, root,
                {"actors": {"A": {"id": "a"}, "B": {"id": "b"}}})
            self.assertNotEqual(result["verdict"], "PASS")


class PairBarrierTests(unittest.TestCase):
    def test_runner_creates_fresh_case_scoped_barriers_beneath_evidence(self):
        barrier = load_barrier()
        with tempfile.TemporaryDirectory() as folder:
            roles = ("A_IOS", "B_WEB")
            actor_ids = {"A_IOS": "a", "B_WEB": "b"}
            first = barrier.create_barrier_dir(folder, "same-run", "H7.S4.M3", roles, actor_ids)
            second = barrier.create_barrier_dir(folder, "same-run", "H7.S4.M3", roles, actor_ids)
            self.assertNotEqual(first, second)
            first_metadata = json.loads((first / ".barrier.json").read_text())
            second_metadata = json.loads((second / ".barrier.json").read_text())
            self.assertNotEqual(first_metadata["invocationId"], second_metadata["invocationId"])
            self.assertTrue(first.is_relative_to(pathlib.Path(folder).resolve()))
            self.assertTrue(second.is_relative_to(pathlib.Path(folder).resolve()))
            self.assertEqual(first.stat().st_mode & 0o777, 0o700)

    def test_runner_rejects_barrier_root_symlink_escape(self):
        barrier = load_barrier()
        with tempfile.TemporaryDirectory() as folder, tempfile.TemporaryDirectory() as outside:
            root = pathlib.Path(folder)
            (root / ".barriers").symlink_to(outside, target_is_directory=True)
            with self.assertRaises(ValueError):
                barrier.create_barrier_dir(root, "run-1", "H7.S4.M3",
                                           ("A_IOS", "B_WEB"), {"A_IOS": "a", "B_WEB": "b"})

    def test_roles_release_only_after_all_roles_arrive(self):
        barrier = load_barrier()
        roles = ("A_IOS", "B_WEB")
        with tempfile.TemporaryDirectory() as folder:
            barrier_dir = barrier.create_barrier_dir(
                folder, "run-1", "H7.S4.M3", roles, {"A_IOS": "a", "B_WEB": "b"})
            with ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(barrier.arrive_and_wait, folder, barrier_dir, "run-1",
                                    "H7.S4.M3", "A_IOS", "a", roles, 1.0, 0.01)
                time.sleep(0.03)
                self.assertFalse(first.done())
                second = pool.submit(barrier.arrive_and_wait, folder, barrier_dir, "run-1",
                                     "H7.S4.M3", "B_WEB", "b", roles, 1.0, 0.01)
                self.assertEqual(first.result(timeout=1), roles)
                self.assertEqual(second.result(timeout=1), roles)

    def test_arrivals_from_another_run_do_not_release_waiter(self):
        barrier = load_barrier()
        roles = ("A_ANDROID", "B_WEB")
        with tempfile.TemporaryDirectory() as folder:
            actor_ids = {"A_ANDROID": "a", "B_WEB": "b"}
            first_dir = barrier.create_barrier_dir(folder, "run-a", "H7.S4.M5", roles, actor_ids)
            second_dir = barrier.create_barrier_dir(folder, "run-b", "H7.S4.M5", roles, actor_ids)
            with ThreadPoolExecutor(max_workers=2) as pool:
                waiter = pool.submit(barrier.arrive_and_wait, folder, first_dir, "run-a",
                                     "H7.S4.M5", "A_ANDROID", "a", roles, 0.15, 0.01)
                time.sleep(0.03)
                with self.assertRaises(TimeoutError):
                    barrier.arrive_and_wait(folder, second_dir, "run-b", "H7.S4.M5",
                                            "B_WEB", "b", roles, 0.05, 0.01)
                with self.assertRaises(TimeoutError):
                    waiter.result(timeout=1)

    def test_barrier_rejects_unsafe_identity_and_unexpected_role(self):
        barrier = load_barrier()
        with tempfile.TemporaryDirectory() as folder:
            for run_id, case, role, expected in [
                ("../escape", "H7.S4.M3", "A_IOS", ("A_IOS", "B_WEB")),
                ("run-1", "../../escape", "A_IOS", ("A_IOS", "B_WEB")),
                ("run-1", "H7.S4.M3", "OUTSIDER", ("A_IOS", "B_WEB")),
            ]:
                with self.subTest(run_id=run_id, case=case, role=role):
                    with self.assertRaises(ValueError):
                        barrier_dir = barrier.create_barrier_dir(
                            folder, "safe-run", "H7.S4.M3", expected,
                            {item: "actor" for item in expected})
                        barrier.arrive_and_wait(folder, barrier_dir, run_id, case, role,
                                                "actor", expected, 0.01, 0)
            barrier_dir = barrier.create_barrier_dir(
                folder, "run-1", "H7.S4.M3", ("A_IOS",), {"A_IOS": "actor"})
            with self.assertRaisesRegex(ValueError, "timeout"):
                barrier.arrive_and_wait(folder, barrier_dir, "run-1", "H7.S4.M3",
                                        "A_IOS", "actor", ("A_IOS",), math.nan, 0)

    def test_duplicate_role_cannot_overwrite_its_arrival(self):
        barrier = load_barrier()
        roles = ("A_IOS", "B_WEB")
        with tempfile.TemporaryDirectory() as folder:
            barrier_dir = barrier.create_barrier_dir(
                folder, "run-1", "H7.S4.M3", roles, {"A_IOS": "a", "B_WEB": "b"})
            with ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(barrier.arrive_and_wait, folder, barrier_dir, "run-1",
                                    "H7.S4.M3", "A_IOS", "a", roles, 0.12, 0.01)
                time.sleep(0.02)
                with self.assertRaises(ValueError):
                    barrier.arrive_and_wait(folder, barrier_dir, "run-1", "H7.S4.M3",
                                            "A_IOS", "a", roles, 0.01, 0)
                with self.assertRaises(TimeoutError):
                    first.result(timeout=1)

    def test_mismatched_existing_role_marker_fails_closed(self):
        barrier = load_barrier()
        roles = ("A_IOS", "B_WEB")
        with tempfile.TemporaryDirectory() as folder:
            barrier_dir = barrier.create_barrier_dir(
                folder, "run-1", "H7.S4.M3", roles, {"A_IOS": "a", "B_WEB": "b"})
            (barrier_dir / "ready--B_WEB.json").write_text(
                '{"runId":"old-run","case":"H7.S4.M3","role":"B_WEB",'
                '"actorId":"b","name":"ready","invocationId":"stale"}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "identity mismatch"):
                barrier.arrive_and_wait(folder, barrier_dir, "run-1", "H7.S4.M3",
                                        "A_IOS", "a", roles, 0.1, 0.01)

    def test_marker_from_another_invocation_fails_even_with_same_run_and_case(self):
        barrier = load_barrier()
        roles = ("A_IOS", "B_WEB")
        with tempfile.TemporaryDirectory() as folder:
            barrier_dir = barrier.create_barrier_dir(
                folder, "same-run", "H7.S4.M3", roles, {"A_IOS": "a", "B_WEB": "b"})
            metadata = json.loads((barrier_dir / ".barrier.json").read_text())
            (barrier_dir / "ready--B_WEB.json").write_text(json.dumps({
                "runId": "same-run", "case": "H7.S4.M3", "role": "B_WEB",
                "actorId": "b", "name": "ready", "invocationId": "0" * 32,
            }), encoding="utf-8")
            self.assertNotEqual(metadata["invocationId"], "0" * 32)
            with self.assertRaisesRegex(ValueError, "identity mismatch"):
                barrier.arrive_and_wait(folder, barrier_dir, "same-run", "H7.S4.M3",
                                        "A_IOS", "a", roles, 0.1, 0.01)

    def test_barrier_rejects_wrong_run_case_or_role_manifest(self):
        barrier = load_barrier()
        with tempfile.TemporaryDirectory() as folder:
            roles = ("A_IOS", "B_WEB")
            barrier_dir = barrier.create_barrier_dir(
                folder, "run-1", "H7.S4.M3", roles, {"A_IOS": "a", "B_WEB": "b"})
            with self.assertRaisesRegex(ValueError, "metadata mismatch"):
                barrier.arrive_and_wait(folder, barrier_dir, "run-2", "H7.S4.M3",
                                        "A_IOS", "a", roles, 0.1, 0.01)
            self.assertFalse((barrier_dir / "ready--A_IOS.json").exists())
            with self.assertRaisesRegex(ValueError, "actor identity mismatch"):
                barrier.arrive_and_wait(folder, barrier_dir, "run-1", "H7.S4.M3",
                                        "A_IOS", "b", roles, 0.1, 0.01)
            self.assertFalse((barrier_dir / "ready--A_IOS.json").exists())

    def test_driver_timeout_exceeds_default_barrier_wait(self):
        runner = load_runner()
        barrier = load_barrier()
        self.assertGreaterEqual(runner.DRIVER_TIMEOUT_SECONDS, 150 + 30)
        self.assertGreater(runner.DRIVER_TIMEOUT_SECONDS, barrier.DEFAULT_TIMEOUT_SECONDS)


if __name__ == "__main__":
    unittest.main()
