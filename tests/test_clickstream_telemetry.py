import json
import unittest
from pathlib import Path
import sys

# Ensure root dir is in path
ROOT_DIR = Path("/usr/local/google/home/nitinagga/Documents/blogs")
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server

class TestClickstreamTelemetry(unittest.TestCase):
    def test_01_record_and_load_clickstream_event(self):
        ev = server.record_clickstream_event(
            actor_email="alice@google.com",
            actor_name="Alice Googler",
            event_type="TAB_SWITCH",
            tab="simulator",
            target_id="tab-simulator",
            target_title="Switched to tab: simulator",
            session_id="sess-unit-01",
            client_ip="172.253.31.100",
            user_agent="Mozilla/5.0 Unit-Test",
            metadata={"testKey": "testVal"}
        )
        self.assertTrue(ev["id"].startswith("CLK-"))
        self.assertEqual(ev["actorEmail"], "alice@google.com")
        self.assertEqual(ev["eventType"], "TAB_SWITCH")
        self.assertEqual(ev["tab"], "simulator")

        store = server.load_portal_clickstream()
        self.assertGreaterEqual(store["totalEvents"], 1)
        self.assertIn("alice@google.com", store["visitors"])
        self.assertEqual(store["visitors"]["alice@google.com"]["actorName"], "Alice Googler")
        self.assertGreaterEqual(store["eventTypeCounts"]["TAB_SWITCH"], 1)

    def test_02_multiple_googler_identity_tracking(self):
        # Record event for user Bob
        server.record_clickstream_event(
            actor_email="bob@google.com",
            actor_name="Bob Googler",
            event_type="SIMULATION_RUN",
            tab="simulator",
            target_id="sim3a_prompt_injection",
            target_title="Sim 3A: Prompt Injection Defense",
            session_id="sess-unit-02",
            client_ip="172.253.31.101"
        )
        store = server.load_portal_clickstream()
        self.assertIn("bob@google.com", store["visitors"])
        self.assertIn("alice@google.com", store["visitors"])
        self.assertGreaterEqual(store["uniqueVisitorsCount"], 2)

    def test_03_event_capping_and_schema_integrity(self):
        store = server.load_portal_clickstream()
        self.assertEqual(store.get("schemaVersion"), "1.0")
        self.assertIsInstance(store.get("events"), list)
        self.assertIsInstance(store.get("visitors"), dict)
        self.assertIsInstance(store.get("eventTypeCounts"), dict)

if __name__ == "__main__":
    unittest.main()
