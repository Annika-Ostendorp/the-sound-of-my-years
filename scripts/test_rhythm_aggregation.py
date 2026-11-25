import unittest
from collections import defaultdict
from datetime import datetime, timezone
from build_rhythm_preview import allocate_event


class HourAllocationTest(unittest.TestCase):
    def test_split_at_hour(self):
        bins = defaultdict(float)
        allocate_event(datetime(2026, 2, 2, 0, 15, tzinfo=timezone.utc), 30 * 60_000, bins)
        self.assertAlmostEqual(bins[(0, 0)], 15)
        self.assertAlmostEqual(bins[(0, 1)], 15)

    def test_dst_spring_forward(self):
        bins = defaultdict(float)
        allocate_event(datetime(2026, 3, 29, 1, 20, tzinfo=timezone.utc), 40 * 60_000, bins)
        self.assertAlmostEqual(bins[(6, 1)], 20)
        self.assertAlmostEqual(bins[(6, 3)], 20)
        self.assertEqual(bins[(6, 2)], 0)

    def test_dst_fall_back(self):
        bins = defaultdict(float)
        allocate_event(datetime(2026, 10, 25, 1, 20, tzinfo=timezone.utc), 40 * 60_000, bins)
        self.assertAlmostEqual(bins[(6, 2)], 40)

    def test_clips_before_2026(self):
        bins = defaultdict(float)
        allocate_event(datetime(2025, 12, 31, 22, 59, tzinfo=timezone.utc), 20 * 60_000, bins)
        self.assertEqual(sum(bins.values()), 0)


if __name__ == '__main__':
    unittest.main()
