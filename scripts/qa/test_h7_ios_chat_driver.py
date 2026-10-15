import importlib.util
import pathlib
import unittest
from unittest.mock import patch


DRIVER = pathlib.Path(__file__).parent / "drivers" / "H7.S4.M3-A_IOS.py"
SPEC = importlib.util.spec_from_file_location("h7_ios_chat_driver", DRIVER)
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class IOSChatDriverTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {
            "runId": "run-123",
            "case": "H7.S4.M3",
            "expectedRoles": ["A_IOS", "B_WEB"],
            "expectedActorIds": {"A_IOS": "actor-a", "B_WEB": "actor-b"},
            "invocationId": "0123456789abcdef0123456789abcdef",
        }

    def test_pair_identity_uses_assigned_a_actor_and_distinct_peer(self):
        self.assertEqual(
            driver.pair_actor_ids(
                self.metadata, "run-123", "H7.S4.M3", "A_IOS", "actor-a",
                ["A_IOS", "B_WEB"],
            ),
            {"actorId": "actor-a", "peerId": "actor-b"},
        )
        with self.assertRaisesRegex(ValueError, "actor identity"):
            driver.pair_actor_ids(
                self.metadata, "run-123", "H7.S4.M3", "A_IOS", "actor-b",
                ["A_IOS", "B_WEB"],
            )

    def test_fixture_body_includes_run_and_invocation_nonce(self):
        self.assertEqual(
            driver.fixture_bodies("run-123", self.metadata["invocationId"]),
            (
                "H7.S4.M3 run-123 0123456789abcdef0123456789abcdef original",
                "H7.S4.M3 run-123 0123456789abcdef0123456789abcdef edited",
            ),
        )

    def test_edit_must_persist_on_the_original_owned_message(self):
        original = {"id": "message-a", "type": "text", "body": "original"}
        edited = {"id": "message-a", "type": "text", "body": "edited", "editedAt": "2026-10-09T10:00:00Z"}
        self.assertEqual(driver.verify_edited_message(original, edited, "edited"), "message-a")
        with self.assertRaisesRegex(RuntimeError, "same message"):
            driver.verify_edited_message(original, {**edited, "id": "message-b"}, "edited")

    def test_cleanup_uses_known_fixture_id_without_fetching_history(self):
        calls = []

        def api_data(*args, **kwargs):
            calls.append((args, kwargs))

        with patch.object(driver, "messages_for", side_effect=AssertionError("history read")), \
                patch.object(driver, "api_data", side_effect=api_data):
            driver.cleanup_owned_fixture("http://api.test/api/v1", "token-a", "conversation-a",
                                         "actor-a", ("original", "edited"), "message-a")
        self.assertEqual(len(calls), 1)
        self.assertIn("/messages/message-a?scope=EVERYONE", calls[0][0][2])

    def test_cleanup_discovery_selects_only_the_exact_actor_pair_fixture(self):
        calls = []
        fixture = {"id": "message-owned", "conversationId": "conversation-a",
                   "senderId": "actor-a", "body": "edited"}
        messages = [
            {**fixture, "id": "wrong-actor", "senderId": "actor-b"},
            {**fixture, "id": "unrelated", "body": "other"},
            fixture,
        ]
        with patch.object(driver, "messages_for", return_value=messages), \
                patch.object(driver, "api_data", side_effect=lambda *args, **kwargs: calls.append(args)):
            driver.cleanup_owned_fixture("http://api.test/api/v1", "token-a", "conversation-a",
                                         "actor-a", ("original", "edited"), None)
        self.assertEqual(len(calls), 1)
        self.assertIn("/messages/message-owned?scope=EVERYONE", calls[0][2])

    def test_maestro_flows_verify_identity_and_pause_between_send_and_edit(self):
        send_flow = driver.build_send_flow(
            "qa+ios@example.test",
            "9f09e6ca-5df9-4c1a-b2eb-d06b172e4b66",
            "H7.S4.M3 run-123 nonce original",
        )
        message_id = "7c46e005-cc88-4b57-809e-cfbe6ec9f502"
        edit_flow = driver.build_edit_flow(message_id, "H7.S4.M3 run-123 nonce edited")
        self.assertIn('openLink: "gymsheet://profile"', send_flow)
        self.assertIn('assertVisible: "qa+ios@example.test"', send_flow)
        self.assertIn('openLink: "gymsheet://chat/9f09e6ca-5df9-4c1a-b2eb-d06b172e4b66"', send_flow)
        self.assertIn('assertVisible: "H7.S4.M3 run-123 nonce original"', send_flow)
        self.assertNotIn('tapOn: "Editar mensaje"', send_flow)
        self.assertIn(f'id: "chat-message-edit-{message_id}"', edit_flow)
        self.assertNotIn('tapOn: "Editar mensaje"', edit_flow)
        self.assertIn('tapOn: "Editar mensaje actual"', edit_flow)
        self.assertNotIn('tapOn: "Edita tu mensaje…"', edit_flow)
        self.assertIn('tapOn: "Guardar edición"', edit_flow)
        self.assertIn('assertVisible: "H7.S4.M3 run-123 nonce edited"', edit_flow)
        self.assertIn('focused: true', edit_flow)
        focus = edit_flow.index('focused: true')
        capture = edit_flow.index('takeScreenshot: "edit-keyboard-open-before-save"')
        save = edit_flow.index('tapOn: "Guardar edición"')
        self.assertLess(focus, capture)
        self.assertLess(capture, save)
        self.assertNotIn('hideKeyboard', edit_flow[:save])
        for flow in (send_flow, edit_flow):
            self.assertNotIn("clearState", flow)
            self.assertNotIn("launchApp", flow)


if __name__ == "__main__":
    unittest.main()
