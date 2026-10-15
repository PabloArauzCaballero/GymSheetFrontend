import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).parent / "h7_m2_mobile.py"
SPEC = importlib.util.spec_from_file_location("h7_m2_mobile", MODULE)
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class H7M2MobileTests(unittest.TestCase):
    def setUp(self):
        self.conversation_id = "11111111-1111-4111-8111-111111111111"
        self.message_id = "22222222-2222-4222-8222-222222222222"
        self.metadata = {
            "runId": "run-123",
            "case": "H7.S4.M2",
            "expectedRoles": sorted(("A_ANDROID", "B_IOS", "B_WEB")),
            "expectedActorIds": {"A_ANDROID": "actor-a", "B_IOS": "actor-b", "B_WEB": "actor-b"},
            "invocationId": "a" * 32,
        }

    def audio_message(self, **updates):
        return {
            "id": self.message_id,
            "conversationId": self.conversation_id,
            "senderId": "actor-a",
            "type": "audio",
            "body": None,
            "mediaUrl": f"/me/conversations/{self.conversation_id}/messages/{self.message_id}/media",
            "mediaMimeType": "audio/mp4",
            "viewOnce": False,
            "deletedAt": None,
            "createdAt": "2026-10-09T10:00:00.000Z",
            **updates,
        }

    def test_m2_requires_disposable_device_pair_and_exact_conversation_acknowledgements(self):
        self.assertEqual(driver.require_m2_fixture(
            "H7.S4.M2", "H7.S4.M2", self.conversation_id, self.conversation_id),
            self.conversation_id)
        with self.assertRaisesRegex(ValueError, "dedicated Android"):
            driver.require_m2_fixture(None, "H7.S4.M2", self.conversation_id, self.conversation_id)
        with self.assertRaisesRegex(ValueError, "disposable A/B pair"):
            driver.require_m2_fixture("H7.S4.M2", None, self.conversation_id, self.conversation_id)
        with self.assertRaisesRegex(ValueError, "does not match"):
            driver.require_m2_fixture("H7.S4.M2", "H7.S4.M2", self.conversation_id,
                                      "33333333-3333-4333-8333-333333333333")

    def test_pair_roles_resolve_exactly_two_distinct_authenticated_actor_ids(self):
        self.assertEqual(driver.pair_actor_ids(
            self.metadata, "run-123", "H7.S4.M2", "B_WEB", "actor-b"),
            {"actorId": "actor-b", "peerId": "actor-a"})
        with self.assertRaisesRegex(ValueError, "identity metadata mismatch"):
            driver.pair_actor_ids(self.metadata, "wrong-run", "H7.S4.M2", "B_WEB", "actor-b")
        with self.assertRaisesRegex(ValueError, "exactly two distinct"):
            driver.pair_actor_ids({**self.metadata, "expectedActorIds": {
                "A_ANDROID": "actor-a", "B_IOS": "actor-a", "B_WEB": "actor-a"}},
                "run-123", "H7.S4.M2", "A_ANDROID", "actor-a")

    def test_only_exact_writable_direct_conversation_for_peer_is_accepted(self):
        rows = [{"conversationId": self.conversation_id, "otherUserId": "actor-b",
                 "systemKind": None, "canWrite": True}]
        self.assertEqual(driver.find_reserved_pair_conversation(
            rows, "actor-b", self.conversation_id), self.conversation_id)
        with self.assertRaisesRegex(ValueError, "exactly one"):
            driver.find_reserved_pair_conversation(rows + rows, "actor-b", self.conversation_id)
        with self.assertRaisesRegex(ValueError, "reserved"):
            driver.find_reserved_pair_conversation(
                [{**rows[0], "conversationId": "33333333-3333-4333-8333-333333333333"}],
                "actor-b", self.conversation_id)
        with self.assertRaisesRegex(ValueError, "writable"):
            driver.find_reserved_pair_conversation(
                [{**rows[0], "canWrite": False}], "actor-b", self.conversation_id)

    def test_preflight_requires_empty_history_for_exact_conversation(self):
        self.assertEqual(driver.require_empty_history([], self.conversation_id), [])
        with self.assertRaisesRegex(ValueError, "not empty"):
            driver.require_empty_history([self.audio_message()], self.conversation_id)
        with self.assertRaisesRegex(ValueError, "different conversation"):
            driver.require_empty_history(
                [{**self.audio_message(), "conversationId": "33333333-3333-4333-8333-333333333333"}],
                self.conversation_id)

    def test_android_preflight_blocks_until_record_audio_is_granted(self):
        self.assertTrue(driver.require_microphone_granted("granted"))
        with self.assertRaisesRegex(ValueError, "permission must be granted"):
            driver.require_microphone_granted("denied")
        with self.assertRaisesRegex(ValueError, "permission must be granted"):
            driver.require_microphone_granted("")

    def test_ffprobe_metadata_is_bounded_and_validates_m4a_aac_duration(self):
        metadata = driver.parse_ffprobe_audio_metadata(
            '{"format":{"format_name":"mov,mp4,m4a,3gp,3g2,mj2","duration":"2.250"},'
            '"streams":[{"codec_type":"audio","codec_name":"aac",'
            '"sample_rate":"44100","channels":1}]}')
        self.assertEqual(metadata, {
            "durationSeconds": 2.25,
            "formatName": "mov,mp4,m4a,3gp,3g2,mj2",
            "codecName": "aac",
            "sampleRate": 44100,
            "channels": 1,
        })
        with self.assertRaisesRegex(ValueError, "duration"):
            driver.parse_ffprobe_audio_metadata(
                '{"format":{"format_name":"m4a","duration":"120.1"},'
                '"streams":[{"codec_type":"audio","codec_name":"aac",'
                '"sample_rate":"44100","channels":1}]}')
        with self.assertRaisesRegex(ValueError, "AAC"):
            driver.parse_ffprobe_audio_metadata(
                '{"format":{"format_name":"m4a","duration":"2"},'
                '"streams":[{"codec_type":"audio","codec_name":"mp3",'
                '"sample_rate":"44100","channels":1}]}')
        with self.assertRaisesRegex(ValueError, "too large"):
            driver.parse_ffprobe_audio_metadata(" " * (driver.MAX_FFPROBE_OUTPUT_BYTES + 1))

    def test_audio_recovery_requires_empty_baseline_and_exactly_one_new_sender_audio(self):
        result = driver.recover_audio_from_poll_snapshots(
            [], [[], [self.audio_message()]], self.conversation_id, "actor-a")
        self.assertEqual(result, self.audio_message())
        with self.assertRaisesRegex(TimeoutError, "no new audio"):
            driver.recover_audio_from_poll_snapshots([], [[], []], self.conversation_id, "actor-a")
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            driver.recover_audio_from_poll_snapshots(
                [], [[self.audio_message(), {**self.audio_message(), "id": "33333333-3333-4333-8333-333333333333"}]],
                self.conversation_id, "actor-a")
        with self.assertRaisesRegex(ValueError, "empty baseline"):
            driver.recover_audio_from_poll_snapshots(
                [self.audio_message()], [[self.audio_message()]], self.conversation_id, "actor-a")

    def test_audio_recovery_rejects_new_message_from_wrong_sender_or_conversation(self):
        with self.assertRaisesRegex(ValueError, "sender"):
            driver.recover_audio_from_poll_snapshots(
                [], [[{**self.audio_message(), "senderId": "actor-b"}]], self.conversation_id, "actor-a")
        with self.assertRaisesRegex(ValueError, "conversation"):
            driver.recover_audio_from_poll_snapshots(
                [], [[{**self.audio_message(), "conversationId": "33333333-3333-4333-8333-333333333333"}]],
                self.conversation_id, "actor-a")

    def test_global_cleanup_targets_only_new_correlated_audio_from_sender(self):
        target = driver.global_delete_request_for_correlated_audio(
            self.audio_message(), self.conversation_id, "actor-a", set())
        self.assertEqual(target, {
            "method": "DELETE",
            "endpoint": f"/me/conversations/{self.conversation_id}/messages/{self.message_id}?scope=EVERYONE",
        })
        with self.assertRaisesRegex(ValueError, "correlated sender"):
            driver.global_delete_request_for_correlated_audio(
                self.audio_message(senderId="actor-b"), self.conversation_id, "actor-a", set())
        with self.assertRaisesRegex(ValueError, "pre-existing"):
            driver.global_delete_request_for_correlated_audio(
                self.audio_message(), self.conversation_id, "actor-a", {self.message_id})

    def test_cleanup_requires_exact_tombstone_and_media_404_without_claiming_blob_deletion(self):
        tombstone = {
            "id": self.message_id,
            "conversationId": self.conversation_id,
            "type": "text",
            "body": "Mensaje eliminado",
            "mediaUrl": None,
            "scope": "EVERYONE",
            "deletedAt": "2026-10-09T10:01:00.000Z",
        }
        result = driver.validate_global_delete_result(
            tombstone, self.message_id, self.conversation_id, 404)
        self.assertEqual(result, {
            "messageId": self.message_id,
            "tombstoneConfirmed": True,
            "mediaEndpointUnavailable": True,
            "physicalBlobDeletion": "not_verified",
        })
        with self.assertRaisesRegex(ValueError, "404"):
            driver.validate_global_delete_result(tombstone, self.message_id, self.conversation_id, 200)
        with self.assertRaisesRegex(ValueError, "tombstone"):
            driver.validate_global_delete_result(
                {**tombstone, "scope": "ME"}, self.message_id, self.conversation_id, 404)


if __name__ == "__main__":
    unittest.main()
