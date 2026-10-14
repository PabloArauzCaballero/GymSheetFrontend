import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).parent / "h7_m2_mobile_roles.py"
SPEC = importlib.util.spec_from_file_location("h7_m2_mobile_roles", MODULE)
roles = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(roles)


class H7M2MobileRoleTests(unittest.TestCase):
    def setUp(self):
        self.conversation_id = "11111111-1111-4111-8111-111111111111"

    def test_android_record_flow_checks_profile_then_exact_chat_and_starts_recording(self):
        flow = roles.build_android_record_flow("a@example.test", self.conversation_id)
        self.assertLess(flow.index("a@example.test"), flow.index("gymsheet://chat/"))
        self.assertIn('text: "Grabar mensaje de voz"', flow)
        self.assertIn('visible: "Duración de grabación: 4 segundos"', flow)
        self.assertIn('text: "Detener y enviar mensaje de voz"', flow)
        self.assertIn("appId: app.gymsheet.mobile", flow)

    def test_android_stop_flow_only_stops_and_sends_current_recording(self):
        flow = roles.build_android_stop_flow()
        self.assertIn('text: "Detener y enviar mensaje de voz"', flow)
        self.assertNotIn("pm grant", flow)

    def test_ios_playback_flow_targets_accessible_audio_control_and_real_progress(self):
        flow = roles.build_ios_playback_flow("b@example.test", self.conversation_id, 4)
        self.assertIn('text: "Reproducir audio"', flow)
        self.assertIn("Progreso de audio:", flow)
        self.assertIn("takeScreenshot: audio-playback", flow)
        self.assertIn("0:04", flow)
        self.assertNotIn("API-only", flow)

    def test_ios_preflight_flow_confirms_profile_empty_chat_and_composer_controls(self):
        flow = roles.build_ios_preflight_flow("b@example.test", self.conversation_id)
        self.assertLess(flow.index("b@example.test"), flow.index("gymsheet://chat/"))
        self.assertIn('"Todavía no hay mensajes"', flow)
        self.assertIn('"Escribe un mensaje"', flow)
        self.assertIn('"Grabar mensaje de voz"', flow)

    def test_ios_preflight_runs_maestro_before_role_reaches_barrier(self):
        observed = []
        original = roles.run_maestro
        roles.run_maestro = lambda *args: observed.append(args)
        context = {"identity": {"email": "b@example.test"}, "conversation": self.conversation_id,
                   "maestro": "maestro", "device": "sim-1"}
        try:
            roles.run_ios_preflight(context, 9999999999)
        finally:
            roles.run_maestro = original
        self.assertEqual(len(observed), 1)
        self.assertEqual(observed[0][1:3], ("ios", "sim-1"))
        self.assertLess(observed[0][3].index("b@example.test"), observed[0][3].index("Grabar mensaje de voz"))

    def test_role_cli_requires_standard_identity_and_paths(self):
        parsed = roles.parse_role_args([
            "--case", "H7.S4.M2", "--role", "A_ANDROID", "--run-id", "run-1",
            "--evidence-dir", "/tmp/evidence", "--barrier-dir", "/tmp/evidence/barrier",
        ], "A_ANDROID")
        self.assertEqual(parsed["run-id"], "run-1")
        with self.assertRaisesRegex(ValueError, "wrong case or role"):
            roles.parse_role_args([
                "--case", "H7.S4.M2", "--role", "B_IOS", "--run-id", "run-1",
                "--evidence-dir", "/tmp/evidence", "--barrier-dir", "/tmp/evidence/barrier",
            ], "A_ANDROID")

    def test_exclusive_conversation_lock_blocks_overlapping_runs_until_release(self):
        import tempfile
        with tempfile.TemporaryDirectory(prefix="gymsheet-m2-lock-test-") as temporary:
            first = roles.acquire_m2_conversation_lock(self.conversation_id, temporary)
            try:
                with self.assertRaisesRegex(ValueError, "active M2 run"):
                    roles.acquire_m2_conversation_lock(self.conversation_id, temporary)
            finally:
                roles.release_m2_conversation_lock(first)
            second = roles.acquire_m2_conversation_lock(self.conversation_id, temporary)
            roles.release_m2_conversation_lock(second)

    def test_maestro_command_uses_android_serial_and_output_directory(self):
        command = roles.maestro_command("maestro", "android", "serial-1", "/tmp/a.yaml", "/tmp/out")
        self.assertEqual(command, ["maestro", "test", "--device", "serial-1",
                                   "--test-output-dir", "/tmp/out", "/tmp/a.yaml"])

    def test_maestro_command_uses_ios_udid_selector(self):
        command = roles.maestro_command("maestro", "ios", "sim-1", "/tmp/b.yaml", "/tmp/out")
        self.assertEqual(command, ["maestro", "test", "--udid", "sim-1",
                                   "--test-output-dir", "/tmp/out", "/tmp/b.yaml"])

    def test_pair_ids_bind_each_mobile_role_to_the_same_two_actors(self):
        metadata = {
            "runId": "run-1", "case": "H7.S4.M2",
            "expectedRoles": sorted(("A_ANDROID", "B_IOS", "B_WEB")),
            "expectedActorIds": {"A_ANDROID": "actor-a", "B_IOS": "actor-b", "B_WEB": "actor-b"},
            "invocationId": "a" * 32,
        }
        self.assertEqual(roles.pair_actor_ids(metadata, "run-1", "H7.S4.M2", "B_IOS", "actor-b"),
                         {"actorId": "actor-b", "peerId": "actor-a"})
        with self.assertRaisesRegex(ValueError, "identity metadata mismatch"):
            roles.pair_actor_ids(metadata, "wrong-run", "H7.S4.M2", "B_IOS", "actor-b")

    def test_android_permission_parser_only_accepts_granted_app_permission(self):
        text = "android.permission.RECORD_AUDIO: granted=true, flags=[ USER_SENSITIVE_WHEN_GRANTED ]"
        self.assertEqual(roles.android_record_audio_status(text), "granted")
        with self.assertRaisesRegex(ValueError, "already be granted"):
            roles.android_record_audio_status("android.permission.RECORD_AUDIO: granted=false")

    def test_playback_evidence_contains_required_shared_message_and_integer_duration(self):
        evidence = roles.build_audio_evidence(
            "B_IOS", self.conversation_id, "22222222-2222-4222-8222-222222222222",
            "a" * 64, 4.8, playback_advanced=True)
        self.assertEqual(evidence, {
            "conversationId": self.conversation_id,
            "messageId": "22222222-2222-4222-8222-222222222222",
            "mediaSha256": "a" * 64,
            "mediaDurationMs": 4800,
            "playerDurationSeconds": 4,
            "playbackAdvanced": True,
        })

    def test_audio_evidence_rejects_sender_playback_or_listener_recording_mixup(self):
        with self.assertRaisesRegex(ValueError, "sender role"):
            roles.build_audio_evidence("A_ANDROID", self.conversation_id,
                "22222222-2222-4222-8222-222222222222", "a" * 64, 4.0,
                playback_advanced=True)
        with self.assertRaisesRegex(ValueError, "listener role"):
            roles.build_audio_evidence("B_IOS", self.conversation_id,
                "22222222-2222-4222-8222-222222222222", "a" * 64, 4.0,
                recorded_duration_seconds=4)

    def test_download_media_route_must_match_exact_conversation_and_message_id(self):
        message_id = "22222222-2222-4222-8222-222222222222"
        message = {"id": message_id, "conversationId": self.conversation_id,
                   "mediaUrl": f"/me/conversations/{self.conversation_id}/messages/{message_id}/media"}
        self.assertEqual(roles.validate_audio_media_route(message, self.conversation_id), message["mediaUrl"])
        with self.assertRaisesRegex(ValueError, "exact message ID"):
            roles.validate_audio_media_route({**message, "mediaUrl": "/me/conversations/33333333-3333-4333-8333-333333333333/messages/33333333-3333-4333-8333-333333333333/media"}, self.conversation_id)


if __name__ == "__main__":
    unittest.main()
