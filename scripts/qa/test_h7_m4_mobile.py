import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).parent / "h7_m4_mobile.py"
SPEC = importlib.util.spec_from_file_location("h7_m4_mobile", MODULE)
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class H7M4MobileTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {
            "runId": "run-123",
            "case": "H7.S4.M4",
            "expectedRoles": ["A_ANDROID", "A_IOS", "A_WEB", "B_WEB"],
            "expectedActorIds": {
                "A_ANDROID": "actor-a", "A_IOS": "actor-a",
                "A_WEB": "actor-a", "B_WEB": "actor-b",
            },
            "invocationId": "0123456789abcdef0123456789abcdef",
        }

    def test_maps_repeated_roles_to_exactly_two_pair_actors(self):
        self.assertEqual(driver.pair_actor_ids(self.metadata, "run-123", "H7.S4.M4",
                         "A_IOS", "actor-a"), {"actorId": "actor-a", "peerId": "actor-b"})
        self.assertEqual(driver.pair_actor_ids(self.metadata, "run-123", "H7.S4.M4",
                         "B_WEB", "actor-b"), {"actorId": "actor-b", "peerId": "actor-a"})
        corrupt = {**self.metadata, "expectedActorIds": {
            **self.metadata["expectedActorIds"], "A_ANDROID": "actor-c"}}
        with self.assertRaisesRegex(ValueError, "exactly two"):
            driver.pair_actor_ids(corrupt, "run-123", "H7.S4.M4", "A_IOS", "actor-a")

    def test_requires_exact_reserved_conversation(self):
        conversation_id = "11111111-1111-4111-8111-111111111111"
        self.assertEqual(driver.require_disposable_conversation(conversation_id,
                         conversation_id), conversation_id)
        with self.assertRaisesRegex(ValueError, "reserved"):
            driver.require_disposable_conversation(conversation_id, None)
        with self.assertRaisesRegex(ValueError, "does not match"):
            driver.require_disposable_conversation(conversation_id,
                "22222222-2222-4222-8222-222222222222")

    def test_resolves_only_existing_conversation_for_assigned_peer(self):
        reserved = "11111111-1111-4111-8111-111111111111"
        rows = [
            {"conversationId": reserved, "otherUserId": "actor-b",
             "systemKind": None, "canWrite": True},
            {"conversationId": "22222222-2222-4222-8222-222222222222",
             "otherUserId": "actor-c", "systemKind": None, "canWrite": True},
        ]
        self.assertEqual(driver.find_reserved_pair_conversation(rows, "actor-b", reserved),
                         reserved)
        with self.assertRaisesRegex(ValueError, "reserved"):
            driver.find_reserved_pair_conversation(rows, "actor-x", reserved)

    def test_only_a_starts_from_explicit_enabled_override(self):
        driver.assert_restorable_settings({"enabled": True, "conversationOverride": True,
                                           "version": 2})
        with self.assertRaisesRegex(ValueError, "explicitly enabled"):
            driver.assert_restorable_settings({"enabled": True,
                "conversationOverride": None, "version": 2})
        with self.assertRaisesRegex(ValueError, "explicitly enabled"):
            driver.assert_restorable_settings({"enabled": False,
                "conversationOverride": False, "version": 2})

    def test_maestro_flow_uses_invocation_fixture_and_expected_menu_label(self):
        body = driver.fixture_body("run-123", self.metadata["invocationId"])
        initial = driver.build_observer_flow("a@example.test", "11111111-1111-4111-8111-111111111111",
                                             body, "initial")
        disabled = driver.build_observer_flow("a@example.test", "11111111-1111-4111-8111-111111111111",
                                               body, "disabled")
        self.assertIn(body, initial)
        self.assertIn("Desactivar solo en este chat", initial)
        self.assertIn("Activar solo en este chat", disabled)
        self.assertNotIn("tapOn: Cerrar", initial)
        self.assertNotIn("inputText", initial)
        self.assertNotIn("inputText", disabled)
        self.assertIn("tapOn: Cerrar", driver.build_close_menu_flow())
        self.assertIn("assertNotVisible", driver.build_close_menu_flow())

    def test_maestro_targets_the_assigned_ios_or_android_device(self):
        self.assertEqual(driver.maestro_device_flag("ios"), "--udid")
        self.assertEqual(driver.maestro_device_flag("android"), "--device")
        with self.assertRaisesRegex(ValueError, "unsupported"):
            driver.maestro_device_flag("web")


if __name__ == "__main__":
    unittest.main()
