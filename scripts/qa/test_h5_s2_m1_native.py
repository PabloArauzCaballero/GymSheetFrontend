import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).with_name("h5_s2_m1_native.py")
SPEC = importlib.util.spec_from_file_location("h5_s2_m1_native", SCRIPT)
native = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(native)


class H5S2M1NativeTests(unittest.TestCase):
    def test_flow_asserts_pending_removal_rollback_and_gesture_success(self):
        flow = native.build_native_flow("a@example.test", "Socio QA H5 S2 M1")
        self.assertIn('assertVisible: "a@example.test"', flow)
        self.assertIn('assertVisible: "Fixture QA H5.S2.M1 activa"', flow)
        self.assertIn('assertNotVisible: "Socio QA H5 S2 M1"', flow)
        self.assertIn('visible: "Prueba QA H5.S2.M1: pending"', flow)
        self.assertIn('visible: "Prueba QA H5.S2.M1: rollback"', flow)
        self.assertIn('visible: "Prueba QA H5.S2.M1 correcta"', flow)
        self.assertIn("direction: RIGHT", flow)
        self.assertEqual(flow.count("takeScreenshot:"), 3)

    def test_native_observation_requires_two_exact_identical_like_payloads(self):
        payload = {"targetId": "00000000-0000-4000-8000-000000000001", "direction": "LIKE"}
        accepted = dict(request_count=2, first_payload=payload, second_payload=payload,
                        pending_removed=True, rollback_restored=True,
                        gesture_removed=True, fixture_complete=True)
        self.assertTrue(native.validate_native_observation(**accepted))
        for key, value in (
                ("request_count", 1), ("second_payload", {**payload, "direction": "PASS"}),
                ("pending_removed", False), ("rollback_restored", False),
                ("gesture_removed", False), ("fixture_complete", False)):
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    native.validate_native_observation(**{**accepted, key: value})

    def test_flow_requires_identity_and_fixture_candidate(self):
        with self.assertRaises(ValueError):
            native.build_native_flow("", "candidate")
        with self.assertRaises(ValueError):
            native.build_native_flow("a@example.test", "")


if __name__ == "__main__":
    unittest.main()
