# Local Filipino and English dataset preparation

## Baseline evaluation

### Final test evaluation after model selection

The expanded-v2 candidate achieved full-validation WER of 23.96% Filipino and 10.13% English. Hold that candidate fixed and compare with the original model on all test clips:

```powershell
.\.venv\Scripts\python.exe evaluate_baseline.py --split test --samples 10000 --output "C:\dataset\baseline-final-test"
.\.venv\Scripts\python.exe evaluate_baseline.py --split test --model "C:\dataset\fil-expanded-v2\best-model" --samples 10000 --output "C:\dataset\expanded-v2-final-test"
```

`--split test` explicitly enables final testing. Validation remains the default, including during training. Both commands use the same seed and scoring and cover all 5,174 Filipino and 449 English test recordings. Reports record the split and manifest hashes. Treat results as final evaluation, not feedback for further tuning on this test set. Check predictions and generation-limit flags when interpreting results. The dataset's age/domain limitations still apply.

From this directory, use the existing CUDA-enabled Python environment:

```powershell
.\.venv\Scripts\python.exe -m pip install --no-cache-dir -r requirements-baseline.txt
.\.venv\Scripts\python.exe evaluate_baseline.py --samples 100
```

The first run downloads the multilingual `openai/whisper-base` model into `C:\dataset\model-cache`. Audio processing is local. No audio or labels are sent to a speech API. The evaluator uses 100 randomly sampled validation clips per language with seed 42, greedy transcription with the language set explicitly, and float32 on the GPU. It never trains or reads the test manifests. This is a preliminary baseline, not a final accuracy claim or a pronunciation assessment.

Results go to `C:\dataset\baseline-whisper-base-v1`: `summary.json`, `selected.jsonl`, and predictions for each language. WER and CER are corpus-level edit counts divided by reference lengths; lower is better, and insertions can make WER exceed 100%. Normalization preserves accents and number spelling, so inspect errors involving numerals, abbreviations and accents before interpreting the scores. Real-time factor below 1 means offline processing took less time than the recording duration; it does not measure live browser latency. Warmup and model downloads are excluded from timings.

Use `--dry-run` to check input selection without dependencies or downloads. Existing output directories are never overwritten; use `--output C:\dataset\baseline-whisper-base-v2` for a new run. The summary records package versions and the model revision. Compare future models on the same selected clips and scoring rules. If generation-limit hits are nonzero, review those predictions before accepting the baseline.

Sources: https://huggingface.co/docs/transformers/model_doc/whisper and https://huggingface.co/openai/whisper-base

## Dataset preparation

### Expanded training with checkpoint selection

After the corrected trial improved full-validation Filipino WER from 62.63% to 40.06%, continue from its weights with a fresh optimizer and a lower learning rate:

```powershell
.\.venv\Scripts\python.exe train_trial.py --initial-model "C:\dataset\fil-trial-v2\model" --samples 10000 --steps 1000 --learning-rate 0.000005 --eval-every 100 --validation-samples 200 --patience 3 --output "C:\dataset\fil-expanded-v1"
.\.venv\Scripts\python.exe evaluate_baseline.py --model "C:\dataset\fil-expanded-v1\best-model" --samples 10000 --output "C:\dataset\fil-expanded-v1-full-validation"
```

This checks a fixed 200-clip validation sample per language at step 0, every 100 steps and the last step. It selects `best-model` by the lowest Filipino WER and logs English WER for regression checks. Step 0 is eligible, so it can retain the starting weights if no checkpoint improves on this sample. Three consecutive checks without improvement stop training early. Sample-level gains are not a guarantee of full-validation gains; run the second command to compare against v2 (Filipino WER 40.06%, English WER 11.30%). Test sets remain untouched.

The run stores one replaceable best checkpoint, one final model and logs/selection manifests in the new output folder. `model` is the final model, which may be worse than `best-model`. There is no optimizer-state resume; `--initial-model` starts a new optimizer from existing weights. The 10,000-clip pool is shuffled; 1,000 steps with accumulation 8 process 8,000 clips unless early stopping occurs. Original trial weights are not modified. Validation restores training mode and gradient checkpointing after inference. A two-step GPU smoke test exercises training/validation transitions without saving weights.

### Small Filipino fine-tuning trial

The trial uses the existing torch/transformers/numpy environment; no additional packages are needed. Run from this directory:

```powershell
.\.venv\Scripts\python.exe train_trial.py
.\.venv\Scripts\python.exe evaluate_baseline.py --model "C:\dataset\fil-trial-v2\model" --samples 100 --output "C:\dataset\fil-trial-v2-evaluation"
```

Defaults: sample 2,000 Filipino training clips with seed 42, microbatch 1, gradient accumulation 8, 200 optimizer attempts, learning rate 0.00001 with a 10-step warmup. All model weights are fine-tuned; BF16 is used when supported, otherwise scaled FP16. Gradient checkpointing reduces GPU memory. Audio features are computed as needed without a feature cache. The script loads the cached base-model revision recorded by the baseline and checks training/validation speaker, file and audio-hash separation.

Training artifacts stay under `C:\dataset\fil-trial-v2`. Only final model weights and processor files are saved, plus the selected sample list and training log/report; there are no resumable optimizer checkpoints. Interrupted runs need a fresh output directory, for example `--output C:\dataset\fil-trial-v3`. There is no automatic upload, deployment, model selection or test-set evaluation. Check `completed_updates` in the report for skipped mixed-precision updates.

The first trial (`fil-trial-v1`) is invalid: its fast tokenizer omitted the language/task markers from encoded labels despite having those attributes configured. The corrected script explicitly rebuilds the tokenizer prefix and asserts that every encoded label begins with start-of-transcript, Tagalog, transcribe and no-timestamps markers. It removes only start-of-transcript for teacher forcing. Prefix IDs/tokens are saved in the training report. Restart from the original cached base model, not the v1 weights. Baseline evaluation is unaffected because it explicitly supplies language/task during generation.

`--dry-run` validates input selection without training. `--smoke-test` performs two temporary GPU updates and saves nothing. A two-update smoke test passed on the RTX 4050 with BF16 and about 1.30 GiB peak allocated GPU memory; longer labels and full gradient accumulation can change memory use. The full 200-step trial still needs to be run.

The evaluator checks both languages using the same seed/sample count as the baseline. Compare Filipino WER against 59.32% and English against 13.37%; Filipino-only tuning may worsen English. Training loss alone does not prove better recognition. Preserve the final test set until model selection is complete. This brief trial is a feasibility experiment and does not guarantee an improvement.

Run with Python's standard library; no packages, model downloads or audio copies are needed.

```powershell
python "C:\repos\LIRA - Capstone\LIRA\speech-training\prepare_dataset.py" --source "C:\dataset\PLD\FIL" --output "C:\dataset\prepared-fil-v1"
```

The output must not already exist. Use a new versioned directory to rerun; the source recordings are never modified.

For the English subset:

```powershell
python "C:\repos\LIRA - Capstone\LIRA\speech-training\prepare_dataset.py" --source "C:\dataset\PLD\ENG" --output "C:\dataset\prepared-eng-v1" --language eng
```

English mode retains English categories and excludes `ENG_SP` spontaneous prompts, whose instructions are not verbatim transcripts. Some English recordings use shared `TGL_` category names for airports, people and places; these names alone do not imply the recordings are Filipino. The English speaker metadata spans ages 17–29. Both corpora need listening review before training and separate evaluation on children. If combining language manifests, recheck speaker identities and audio hashes across languages before training a shared model.

Outputs:

- `train.jsonl`, `validation.jsonl`, `test.jsonl`: absolute audio paths, transcript, original text, speaker ID, source LOG line, prompt category, duration, sample rate and audio-content hash.
- `review.jsonl`: exclusions and their reasons. Do not train on this file without reviewing and correcting the labels.
- `report.json`: counts, hours, speaker assignments, category distributions and limitations.

Only NFC and whitespace normalization is applied; accents and punctuation are preserved. Empty labels, parenthetical glosses, alternatives, minimal-pair prompts, spontaneous prompts, explicitly English categories and missing categories are held out for review. Other English names or code-switching may remain. Missing/unreadable files, non-mono/non-16-bit/non-16-kHz PCM, truncated audio, digital silence, recordings outside 0.2–30 seconds and duplicate audio content are excluded. Long recordings are not silently cut or assigned partial transcripts.

Splits use seed 42 and approximately 80/10/10 percent of eligible speakers, not of recording duration. A speaker appears in exactly one split. Prompts can repeat across splits: this evaluates new speakers, not necessarily new sentences. Exact duplicate eligible audio is retained only once. Review the per-split distributions before using the fixed test set.

These manifests are candidates for ASR training, not proof that each prompt matches the actual speech. Listen to samples from each category, especially sentence recordings, before training. The inspected subset has ages 15–55 and does not establish performance for Grade 3 readers. Keep the final test split out of model selection.

Keep audio, generated manifests and checkpoints outside Git. The dataset listing specifies research-only use and restrictions on sharing; this script does not upload anything. Source: https://mozilladatacollective.com/datasets/cmmxhw46c00tqnw07xyr94zjk

Run the fixture tests from this directory:

```powershell
python -m unittest test_prepare_dataset.py
```
