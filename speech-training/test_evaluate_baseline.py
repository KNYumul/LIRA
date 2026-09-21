import json
from pathlib import Path
import tempfile
import unittest

from evaluate_baseline import normalize, score, select_samples


class BaselineTests(unittest.TestCase):
    def test_scoring_and_normalization(self):
        self.assertEqual(normalize('  Magandáng, UMAGA! '), 'magandáng umaga')
        self.assertEqual(score('Hello world', 'hello WORLD!')['word_errors'], 0)
        self.assertEqual(score('a b c', 'a x c d')['word_errors'], 2)
        self.assertEqual(score('a b c', '')['word_errors'], 3)
        self.assertEqual(score('cat', 'cut')['character_errors'], 1)
        with self.assertRaises(ValueError):
            score('!!!', 'hello')

    def test_sampling_is_reproducible_and_refuses_test_split(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            audio = root / 'exists.wav'
            audio.touch()
            manifest = root / 'validation.jsonl'
            manifest.write_text('\n'.join(json.dumps({'audio': str(audio), 'text': str(i)}) for i in range(20)))
            sample = select_samples(manifest, 5, 42)
            self.assertEqual(len(sample), 5)
            self.assertEqual(sample, select_samples(manifest, 5, 42))
            with self.assertRaises(ValueError):
                select_samples(root / 'test.jsonl', 5, 42)
            with self.assertRaises(ValueError):
                select_samples(manifest, 0, 42)
            test_manifest = root / 'test.jsonl'
            test_manifest.write_text(manifest.read_text())
            self.assertEqual(len(select_samples(test_manifest, 100, 42, split='test')), 20)
            with self.assertRaises(ValueError):
                select_samples(manifest, 5, 42, split='test')
            with self.assertRaises(ValueError):
                select_samples(manifest, 5, 42, split='train')


if __name__ == '__main__':
    unittest.main()
