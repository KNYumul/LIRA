"""Small, local Filipino Whisper Base trial using the existing GPU environment."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import random
import shutil
import time

from evaluate_baseline import read_audio, select_samples, score


def evaluate_validation(model, processor, samples):
    """Use baseline decoding/scoring, without updating weights."""
    import torch
    was_training, old_cache = model.training, model.config.use_cache
    checkpointing = model.is_gradient_checkpointing
    model.eval()
    model.gradient_checkpointing_disable()
    model.config.use_cache = True
    results = {}
    try:
        for language, rows in samples.items():
            errors = words = 0
            for row in rows:
                inputs = processor(read_audio(row['audio']), sampling_rate=16000,
                                   return_tensors='pt', return_attention_mask=True)
                inputs = {key: value.to('cuda') for key, value in inputs.items()}
                with torch.inference_mode():
                    generated = model.generate(**inputs,
                        language='tagalog' if language == 'fil' else 'english', task='transcribe',
                        do_sample=False, num_beams=1, max_new_tokens=440,
                        return_dict_in_generate=True, return_timestamps=False)
                prediction = processor.batch_decode(generated.sequences, skip_special_tokens=True)[0].strip()
                metrics = score(row['text'], prediction)
                errors += metrics['word_errors']
                words += metrics['reference_words']
            results[language] = {'wer_percent': 100 * errors / words,
                                 'word_errors': errors, 'reference_words': words,
                                 'recordings': len(rows)}
    finally:
        model.config.use_cache = old_cache
        if checkpointing:
            model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
        model.train(was_training)
    return results


def save_inference_model(model, processor, destination):
    old_cache = model.config.use_cache
    model.config.use_cache = True
    try:
        model.save_pretrained(destination, safe_serialization=True)
        processor.save_pretrained(destination)
    finally:
        model.config.use_cache = old_cache


def training_label_ids(tokenizer, text, decoder_start_token_id, max_positions):
    ids = tokenizer(text).input_ids
    prefix = tokenizer.prefix_tokens
    if (len(prefix) != 4 or prefix[0] != decoder_start_token_id
            or ids[:len(prefix)] != prefix):
        raise ValueError('Training label is missing language/task/timestamp prefix tokens')
    ids = ids[1:]
    if len(ids) > max_positions:
        raise ValueError('Transcript exceeds decoder token limit')
    return ids


def training_rows(root, samples, seed):
    if samples < 1:
        raise ValueError('samples must be positive')
    manifest = root / 'prepared-fil-v1' / 'train.jsonl'
    rows = [json.loads(line) for line in manifest.read_text(encoding='utf-8').splitlines() if line.strip()]
    validation = [json.loads(line) for line in (manifest.parent / 'validation.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]
    if not rows:
        raise ValueError('Training manifest is empty')
    for key in ('speaker_id', 'audio', 'audio_sha256'):
        if {r[key] for r in rows} & {r[key] for r in validation}:
            raise ValueError(f'Training/validation overlap: {key}')
    selected = random.Random(seed).sample(rows, min(samples, len(rows)))
    for row in selected:
        if not Path(row['audio']).is_file() or not row['text'].strip():
            raise ValueError('Missing audio or empty training label')
    return selected, hashlib.sha256(manifest.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset-root', type=Path, default=Path('C:/dataset'))
    parser.add_argument('--output', type=Path, default=Path('C:/dataset/fil-trial-v2'))
    parser.add_argument('--samples', type=int, default=2000)
    parser.add_argument('--steps', type=int, default=200)
    parser.add_argument('--accumulation', type=int, default=8)
    parser.add_argument('--learning-rate', type=float, default=1e-5)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--initial-model', type=Path, help='Continue from local model weights with a fresh optimizer')
    parser.add_argument('--eval-every', type=int, default=0, help='Validate and save best every N steps; 0 disables')
    parser.add_argument('--validation-samples', type=int, default=200, help='Fixed sample count per language')
    parser.add_argument('--patience', type=int, default=3, help='Stop after N checks without Filipino WER improvement')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--smoke-test', action='store_true', help='Two GPU updates; do not save model or output files')
    args = parser.parse_args()
    if min(args.steps, args.accumulation) < 1 or args.learning_rate <= 0:
        raise ValueError('Training settings must be positive')
    if args.eval_every < 0 or args.validation_samples < 1 or args.patience < 1:
        raise ValueError('Invalid validation settings')
    if args.initial_model and not (args.initial_model / 'config.json').is_file():
        raise ValueError('Initial model folder must contain config.json')
    if args.smoke_test:
        args.samples, args.steps, args.accumulation = 2, 2, 1
        args.eval_every, args.validation_samples = 1, 2
    rows, manifest_hash = training_rows(args.dataset_root, args.samples, args.seed)
    validation_samples = {language: select_samples(
        args.dataset_root / f'prepared-{language}-v1' / 'validation.jsonl',
        args.validation_samples, args.seed) for language in ('fil', 'eng')} if args.eval_every else {}
    print(f'Selected {len(rows)} training clips from {len({r["speaker_id"] for r in rows})} speakers.', flush=True)
    print(f'{args.steps} optimizer attempts, microbatch 1, accumulation {args.accumulation}.', flush=True)
    if args.dry_run:
        print('Input checks passed. No training or output files.')
        return
    if not args.smoke_test and args.output.exists():
        raise ValueError('Output already exists; choose another --output folder')
    if not args.smoke_test and shutil.disk_usage(args.dataset_root).free < 3 * 1024**3:
        raise ValueError('Free at least 3 GiB before this trial')
    os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA GPU unavailable')
    torch.manual_seed(args.seed)
    # Use the same cached base-model revision as the recorded baseline.
    baseline = args.dataset_root / 'baseline-whisper-base-v2' / 'summary.json'
    if not baseline.is_file():
        baseline = args.dataset_root / 'baseline-whisper-base-v1' / 'summary.json'
    baseline_report = json.loads(baseline.read_text(encoding='utf-8'))
    if baseline_report['model'] != 'openai/whisper-base':
        raise ValueError('This trial is designed for the Whisper Base baseline')
    revision = baseline_report.get('resolved_revision')
    if not revision:
        raise ValueError('Baseline model revision is missing')
    load_options = dict(cache_dir=str(args.dataset_root / 'model-cache'), revision=revision, local_files_only=True)
    initial_model = str(args.initial_model) if args.initial_model else 'openai/whisper-base'
    if args.initial_model:
        load_options = {'local_files_only': True}
    processor = WhisperProcessor.from_pretrained(initial_model, language='tagalog', task='transcribe', **load_options)
    # The fast tokenizer can retain its cached postprocessor even when the
    # language/task attributes are supplied to from_pretrained. Rebuild it.
    processor.tokenizer.set_prefix_tokens(language='tagalog', task='transcribe', predict_timestamps=False)
    model = WhisperForConditionalGeneration.from_pretrained(initial_model, use_safetensors=True, **load_options).to('cuda')
    model.generation_config.forced_decoder_ids = None
    model.generation_config.language = None
    model.generation_config.task = 'transcribe'
    model.config.use_cache = False
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
    model.train()
    # Validate all labels before starting; never silently truncate a transcript.
    labels = []
    for row in rows:
        ids = training_label_ids(processor.tokenizer, row['text'],
                                 model.config.decoder_start_token_id, model.config.max_target_positions)
        labels.append(ids)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01, foreach=False)
    precision = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    scaler = torch.amp.GradScaler('cuda', enabled=precision == torch.float16, init_scale=128)
    print('Training precision:', precision, flush=True)
    rng = random.Random(args.seed)
    order = list(range(len(rows)))
    rng.shuffle(order)
    position = 0
    history = []
    started = time.perf_counter()
    torch.cuda.reset_peak_memory_stats()
    if not args.smoke_test:
        args.output.mkdir(parents=True)
        (args.output / 'selected-training.jsonl').write_text(
            ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')
        if validation_samples:
            (args.output / 'selected-validation.jsonl').write_text(''.join(
                json.dumps({'language': language, **row}, ensure_ascii=False) + '\n'
                for language, selected in validation_samples.items() for row in selected), encoding='utf-8')
    best_wer, best_step, stale_checks = float('inf'), None, 0
    validation_history = []

    def validate_and_checkpoint(step):
        nonlocal best_wer, best_step, stale_checks
        results = evaluate_validation(model, processor, validation_samples)
        improved = results['fil']['wer_percent'] < best_wer
        if improved:
            best_wer, best_step, stale_checks = results['fil']['wer_percent'], step, 0
            if not args.smoke_test:
                save_inference_model(model, processor, args.output / 'best-model')
        else:
            stale_checks += 1
        entry = {'step': step, 'results': results, 'improved': improved,
                 'best_step': best_step, 'best_fil_wer': best_wer}
        validation_history.append(entry)
        if not args.smoke_test:
            with (args.output / 'validation-log.jsonl').open('a', encoding='utf-8') as stream:
                stream.write(json.dumps(entry) + '\n')
        print(f"Validation {step}: FIL WER={results['fil']['wer_percent']:.2f}% | "
              f"ENG WER={results['eng']['wer_percent']:.2f}% | best step={best_step}", flush=True)
        return stale_checks >= args.patience

    if validation_samples:
        validate_and_checkpoint(0)
    for step in range(args.steps):
        optimizer.zero_grad(set_to_none=True)
        # A short warmup avoids immediately applying the maximum learning rate.
        lr = args.learning_rate * min(1.0, (step + 1) / min(10, args.steps))
        for group in optimizer.param_groups:
            group['lr'] = lr
        loss_sum = 0.0
        for _ in range(args.accumulation):
            if position == len(order):
                rng.shuffle(order)
                position = 0
            index = order[position]
            position += 1
            audio = read_audio(rows[index]['audio'])
            inputs = processor(audio, sampling_rate=16000, return_tensors='pt', return_attention_mask=True)
            inputs = {key: value.to('cuda') for key, value in inputs.items()}
            target = torch.tensor([labels[index]], dtype=torch.long, device='cuda')
            with torch.autocast(device_type='cuda', dtype=precision):
                loss = model(**inputs, labels=target).loss
            if not torch.isfinite(loss):
                raise RuntimeError('Non-finite loss; trial stopped')
            loss_sum += loss.detach().item()
            scaler.scale(loss / args.accumulation).backward()
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        old_scale = scaler.get_scale()
        scaler.step(optimizer)
        scaler.update()
        skipped = scaler.get_scale() < old_scale
        entry = {'step': step + 1, 'loss': loss_sum / args.accumulation,
                 'learning_rate': lr, 'update_skipped': skipped}
        history.append(entry)
        if not args.smoke_test:
            with (args.output / 'training-log.jsonl').open('a', encoding='utf-8') as stream:
                stream.write(json.dumps(entry) + '\n')
        if step == 0 or (step + 1) % 10 == 0 or step + 1 == args.steps:
            print(f"Step {step+1}/{args.steps} | loss {entry['loss']:.4f} | "
                  f"elapsed {(time.perf_counter()-started)/60:.1f} min | skipped={skipped}", flush=True)
        if validation_samples and ((step + 1) % args.eval_every == 0 or step + 1 == args.steps):
            optimizer.zero_grad(set_to_none=True)
            if validate_and_checkpoint(step + 1):
                print('Early stopping: Filipino validation WER has not improved.', flush=True)
                break
    updates = sum(not item['update_skipped'] for item in history)
    peak = torch.cuda.max_memory_allocated() / 1024**3
    print(f'Completed updates: {updates}; peak allocated GPU memory: {peak:.2f} GiB', flush=True)
    if not updates:
        raise RuntimeError('No optimizer updates succeeded')
    if args.smoke_test:
        print('Smoke test passed. In-memory weights discarded; no model saved.')
        return
    model.gradient_checkpointing_disable()
    model.config.use_cache = True
    model.generation_config.forced_decoder_ids = None
    model.generation_config.language = None
    model.generation_config.task = 'transcribe'
    destination = args.output / 'model'
    save_inference_model(model, processor, destination)
    report = {'base_model': 'openai/whisper-base', 'revision': revision, 'seed': args.seed,
              'label_prefix_ids': processor.tokenizer.prefix_tokens,
              'label_prefix_tokens': processor.tokenizer.convert_ids_to_tokens(processor.tokenizer.prefix_tokens),
              'training_manifest_sha256': manifest_hash, 'samples': len(rows),
              'steps': len(history), 'requested_steps': args.steps, 'completed_updates': updates, 'accumulation': args.accumulation,
              'initial_model': initial_model, 'best_step': best_step,
              'best_fil_validation_wer': best_wer if validation_samples else None,
              'validation_history': validation_history,
              'learning_rate': args.learning_rate, 'precision': str(precision), 'peak_allocated_gpu_gib': peak,
              'seconds': time.perf_counter()-started,
              'packages': {p: importlib.metadata.version(p) for p in ('torch', 'transformers', 'numpy')},
              'note': 'model = final weights; best-model = lowest sampled Filipino WER if validation enabled. No resumable optimizer checkpoint. Evaluate before using in LIRA.'}
    (args.output / 'training-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Saved model:', destination, flush=True)
    if validation_samples:
        print('Evaluate the selected best model:', args.output / 'best-model', flush=True)


if __name__ == '__main__':
    main()
