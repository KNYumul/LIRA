import json
from pathlib import Path
import tempfile
import unittest
import wave

from prepare_dataset import normalize, prepare, review_reason, speaker_splits


class PreparationTests(unittest.TestCase):
    def test_preserves_accents_and_flags_glosses(self):
        self.assertEqual(normalize('  pa\u0061\u0301lam   po '), 'paálam po')
        self.assertEqual(review_reason('eto (here)', 'TGL_Iso_colors_Pronouns.txt'), 'annotation_or_alternative')
        self.assertEqual(review_reason('describe this', 'TGL_spontaneous.txt'), 'spontaneous_prompt_needs_review')

    def test_deterministic_speaker_assignment(self):
        speakers = [str(i) for i in range(20)]
        self.assertEqual(speaker_splits(speakers, 42), speaker_splits(reversed(speakers), 42))
        self.assertEqual(set(speaker_splits(speakers, 42).values()), {'train', 'validation', 'test'})

    def test_language_specific_categories(self):
        self.assertIsNone(review_reason('Good morning.', 'TGL_Utt_Eng1_Shib.txt', 'eng'))
        self.assertEqual(review_reason('Good morning.', 'TGL_Utt_Eng1_Shib.txt', 'fil'), 'explicit_english_category')
        self.assertEqual(review_reason('Describe your family.', 'ENG_SP01.txt', 'eng'), 'spontaneous_prompt_needs_review')
        self.assertIsNone(review_reason('Naga Airport', 'TGL_Airlines.txt', 'eng'))

    def test_manifest_rejects_missing_and_truncated_audio(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for index in range(3):
                speaker = str(index)
                folder = root / 'source' / speaker
                folder.mkdir(parents=True)
                audio = folder / 'good.wav'
                with wave.open(str(audio), 'wb') as stream:
                    stream.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                    stream.writeframes((index + 1).to_bytes(2, 'little') * 8000)
                (folder / 'bad.wav').write_bytes(audio.read_bytes()[:-100])
                (folder / 'session.log').write_text(
                    f'SpeakerID = "{speaker}"\nSpeakerAge = 18\n'
                    'good.wav "TGL_Utt_Story.txt" "Magandang umaga."\n'
                    'missing.wav "TGL_Utt_Story.txt" "Wala."\n'
                    'bad.wav "TGL_Utt_Story.txt" "Sira."\n', encoding='utf-8-sig')
            output = root / 'output'
            prepare(root / 'source', output, 42)
            report = json.loads((output / 'report.json').read_text())
            self.assertEqual(report['eligible_recordings'], 3)
            self.assertEqual(report['exclusion_reasons'], {'missing_audio': 3, 'truncated_audio': 3})
            sets = [set(v['speakers']) for v in report['splits'].values()]
            self.assertFalse(sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2])
            with self.assertRaises(ValueError):
                prepare(root / 'source', output, 42)


if __name__ == '__main__':
    unittest.main()
