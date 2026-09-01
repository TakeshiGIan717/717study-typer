import unittest
from human_typing import Rhythm, TypingConfig


class RhythmTests(unittest.TestCase):
    def test_delay_is_positive_and_seeded(self):
        cfg=TypingConfig(wpm=60,variation=.2,pause_chance=0)
        a=Rhythm(cfg,7); b=Rhythm(cfg,7)
        self.assertEqual(a.delay("a"),b.delay("a")); self.assertGreater(a.delay("a"),0)

    def test_typo_only_for_ascii_letters(self):
        r=Rhythm(TypingConfig(typo_chance=1),1)
        self.assertIsNotNone(r.typo_for("a")); self.assertIsNone(r.typo_for("中")); self.assertIsNone(r.typo_for("1"))

    def test_invalid_config(self):
        with self.assertRaises(ValueError): TypingConfig(wpm=0).validate()

    def test_word_chunk_probability_limits(self):
        self.assertTrue(Rhythm(TypingConfig(word_chunk_chance=1),1).should_chunk_word())
        self.assertFalse(Rhythm(TypingConfig(word_chunk_chance=0),1).should_chunk_word())


if __name__ == "__main__": unittest.main()
