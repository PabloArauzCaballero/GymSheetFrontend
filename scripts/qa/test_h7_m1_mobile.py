import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).parent / "h7_m1_mobile.py"
SPEC = importlib.util.spec_from_file_location("h7_m1_mobile", MODULE)
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class H7M1MobileTests(unittest.TestCase):
    def setUp(self):
        self.conversation_id = "11111111-1111-4111-8111-111111111111"

    def test_requires_device_ack_and_exact_reserved_conversation(self):
        self.assertEqual(driver.require_m1_fixture(
            "H7.S4.M1", "H7.S4.M1", self.conversation_id), self.conversation_id)
        with self.assertRaisesRegex(ValueError, "dedicated Android"):
            driver.require_m1_fixture(None, "H7.S4.M1", self.conversation_id)
        with self.assertRaisesRegex(ValueError, "disposable A/B pair"):
            driver.require_m1_fixture("H7.S4.M1", None, self.conversation_id)
        with self.assertRaisesRegex(ValueError, "valid reserved"):
            driver.require_m1_fixture("H7.S4.M1", "H7.S4.M1", "not-a-uuid")

    def test_resolves_only_reserved_writable_direct_conversation(self):
        rows = [{"conversationId": self.conversation_id, "otherUserId": "actor-b",
                 "systemKind": None, "canWrite": True}]
        self.assertEqual(driver.find_reserved_conversation(rows, self.conversation_id, "actor-b"),
                         self.conversation_id)
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            driver.find_reserved_conversation(rows + rows, self.conversation_id, "actor-b")
        with self.assertRaisesRegex(ValueError, "reserved"):
            driver.find_reserved_conversation(
                [{**rows[0], "conversationId": "22222222-2222-4222-8222-222222222222"}],
                self.conversation_id, "actor-b")
        with self.assertRaisesRegex(ValueError, "writable"):
            driver.find_reserved_conversation([{**rows[0], "canWrite": False}],
                                               self.conversation_id, "actor-b")
        with self.assertRaisesRegex(ValueError, "assigned peer"):
            driver.find_reserved_conversation(rows, self.conversation_id, "actor-c")

    def test_android_permission_commands_set_and_verify_permanent_denial(self):
        commands = driver.microphone_permission_commands("/usr/bin/adb", "device-1")
        self.assertEqual(commands[:2], [
            ["/usr/bin/adb", "-s", "device-1", "shell", "pm", "revoke",
             "app.gymsheet.mobile", "android.permission.RECORD_AUDIO"],
            ["/usr/bin/adb", "-s", "device-1", "shell", "pm", "set-permission-flags",
             "app.gymsheet.mobile", "android.permission.RECORD_AUDIO", "user-set", "user-fixed"],
        ])
        self.assertEqual(commands[2][-4:], ["pm", "check-permission",
                                           "app.gymsheet.mobile", "android.permission.RECORD_AUDIO"])
        self.assertEqual(commands[3], ["/usr/bin/adb", "-s", "device-1", "shell",
                                       "dumpsys", "package", "app.gymsheet.mobile"])

    def test_verifies_permission_denied_and_user_fixed_from_package_dump(self):
        self.assertTrue(driver.is_permanently_denied(
            "denied", "android.permission.RECORD_AUDIO: granted=false, flags=[ USER_SET|USER_FIXED ]"))
        self.assertFalse(driver.is_permanently_denied(
            "granted", "android.permission.RECORD_AUDIO: granted=true, flags=[ USER_SET ]"))
        self.assertFalse(driver.is_permanently_denied(
            "denied", "android.permission.RECORD_AUDIO: granted=false, flags=[ USER_SET ]"))

    def test_maestro_flow_checks_help_and_text_draft_without_sending(self):
        identity = driver.build_identity_preflight_flow("a@example.test")
        flow = driver.build_permission_flow(self.conversation_id, "H7.S4.M1 test")
        self.assertIn("a@example.test", identity)
        self.assertIn("Permite el micrófono en Ajustes", flow)
        self.assertIn("Puedes seguir escribiendo mensajes mientras tanto.", flow)
        self.assertIn("Ahora no", flow)
        self.assertIn("takeScreenshot: microphone-denied-alert", flow)
        self.assertIn("tapOn: Escribe un mensaje", flow)
        self.assertIn("H7.S4.M1 test", flow)
        self.assertIn("takeScreenshot: text-draft", flow)
        self.assertIn("eraseText: 200", flow)
        self.assertNotIn("tapOn: Enviar mensaje", flow)


if __name__ == "__main__":
    unittest.main()
