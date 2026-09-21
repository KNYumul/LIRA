from types import SimpleNamespace
import unittest

from train_trial import training_label_ids, save_inference_model


class FakeTokenizer:
    prefix_tokens = [50258, 50348, 50359, 50363]

    def __init__(self, ids):
        self.ids = ids

    def __call__(self, text):
        return SimpleNamespace(input_ids=self.ids)


class LabelTests(unittest.TestCase):
    def test_saved_model_uses_cache_without_changing_training_state(self):
        from unittest.mock import Mock
        model = Mock()
        model.config.use_cache = False
        def save(*args, **kwargs):
            self.assertTrue(model.config.use_cache)
        model.save_pretrained.side_effect = save
        processor = Mock()
        save_inference_model(model, processor, 'output')
        self.assertFalse(model.config.use_cache)
        processor.save_pretrained.assert_called_once_with('output')
        model.save_pretrained.side_effect = OSError('disk full')
        with self.assertRaises(OSError):
            save_inference_model(model, processor, 'output')
        self.assertFalse(model.config.use_cache)

    def test_rejects_stale_fast_tokenizer_prefix(self):
        # The observed bug: attributes claim Tagalog/transcribe, but encoded
        # text has only start-of-transcript and no-timestamps markers.
        tokenizer = FakeTokenizer([50258, 50363, 123, 50257])
        with self.assertRaisesRegex(ValueError, 'missing language'):
            training_label_ids(tokenizer, 'text', 50258, 448)

    def test_removes_only_decoder_start(self):
        tokenizer = FakeTokenizer([50258, 50348, 50359, 50363, 123, 50257])
        self.assertEqual(training_label_ids(tokenizer, 'text', 50258, 448),
                         [50348, 50359, 50363, 123, 50257])
        with self.assertRaisesRegex(ValueError, 'limit'):
            training_label_ids(tokenizer, 'text', 50258, 4)


if __name__ == '__main__':
    unittest.main()
