import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).parent / "h7_m5_mobile.py"
SPEC = importlib.util.spec_from_file_location("h7_m5_mobile", MODULE)
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class H7M5MobileTests(unittest.TestCase):
    def setUp(self):
        self.conversation_id = "11111111-1111-4111-8111-111111111111"
        self.connection_id = "22222222-2222-4222-8222-222222222222"
        self.messages = [
            {"id": "text-message", "conversationId": self.conversation_id,
             "type": "text", "body": "fixture text"},
            {"id": "photo-message", "conversationId": self.conversation_id,
             "type": "image", "body": None, "mediaUrl": "/chat/media/photo"},
        ]

    def test_requires_exact_m5_disposable_conversation_and_connection(self):
        self.assertEqual(driver.require_disposable_pair(
            self.conversation_id, self.connection_id,
            self.conversation_id, self.connection_id),
            {"conversationId": self.conversation_id, "connectionId": self.connection_id})
        with self.assertRaisesRegex(ValueError, "disposable"):
            driver.require_disposable_pair(self.conversation_id, self.connection_id, None,
                                           self.connection_id)
        with self.assertRaisesRegex(ValueError, "does not match"):
            driver.require_disposable_pair(self.conversation_id, self.connection_id,
                self.conversation_id, "33333333-3333-4333-8333-333333333333")

    def test_resolves_only_one_active_reserved_conversation_for_peer(self):
        rows = [{"conversationId": self.conversation_id, "otherUserId": "actor-a",
                 "systemKind": None, "canWrite": True}]
        self.assertEqual(driver.find_reserved_conversation(rows, "actor-a", self.conversation_id),
                         self.conversation_id)
        with self.assertRaisesRegex(ValueError, "exactly one"):
            driver.find_reserved_conversation(rows + rows, "actor-a", self.conversation_id)
        with self.assertRaisesRegex(ValueError, "conversation"):
            driver.find_reserved_conversation(rows, "actor-b", self.conversation_id)

    def test_resolves_one_accepted_connection_for_peer_and_reserved_id(self):
        rows = [{"id": self.connection_id, "otherUserId": "actor-a", "status": "ACCEPTED"}]
        self.assertEqual(driver.find_reserved_connection(rows, "actor-a", self.connection_id),
                         self.connection_id)
        with self.assertRaisesRegex(ValueError, "accepted"):
            driver.find_reserved_connection([{**rows[0], "status": "PENDING"}],
                                             "actor-a", self.connection_id)
        with self.assertRaisesRegex(ValueError, "exactly one"):
            driver.find_reserved_connection(rows + rows, "actor-a", self.connection_id)

    def test_requires_existing_text_and_image_fixtures_for_the_exact_chat(self):
        fixture = driver.validate_history_fixture(self.messages, self.conversation_id)
        self.assertEqual(fixture["textBody"], "fixture text")
        self.assertEqual(fixture["imageMessageId"], "photo-message")
        with self.assertRaisesRegex(ValueError, "image"):
            driver.validate_history_fixture(self.messages[:1], self.conversation_id)
        with self.assertRaisesRegex(ValueError, "conversation"):
            driver.validate_history_fixture([self.messages[0],
                {**self.messages[1], "conversationId": "33333333-3333-4333-8333-333333333333"}],
                self.conversation_id)

    def test_maestro_flow_checks_baseline_then_background_resume_cleanup(self):
        initial = driver.build_initial_flow("a@example.test", self.conversation_id, "fixture text")
        resume = driver.build_resume_flow("fixture text")
        self.assertIn("fixture text", initial)
        self.assertIn("Abrir foto", initial)
        self.assertIn("pressKey: HOME", resume)
        self.assertIn("Chat cerrado", resume)
        self.assertIn("El historial y los archivos", resume)
        self.assertIn('assertNotVisible: "fixture text"', resume)
        self.assertIn('assertNotVisible: "Abrir foto"', resume)


if __name__ == "__main__":
    unittest.main()
