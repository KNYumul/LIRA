"""Prepare local UP-DSP Filipino or English manifests without copying audio."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import random
import re
import unicodedata
import wave

ROW = re.compile(r'\s*(\S+\.wav)\s+"([^"]*)"\s+"(.*)"\s*', re.I)
META = re.compile(r'\s*(\w+)\s*=\s*(.*?)\s*$')


def normalize(text):
    # Preserve accents, punctuation and case; do not guess what was spoken.
    return ' '.join(unicodedata.normalize('NFC', text).split())


def review_reason(text, category, language='fil'):
    if not text:
        return 'empty_transcript'
    if any(c in text for c in '()[]{}<>/|'):
        return 'annotation_or_alternative'
    if not any(c.isalpha() or c.isdigit() for c in text):
        return 'no_words'
    category = category.lower()
    if 'minpairs' in category:
        return 'minimal_pairs_need_review'
    if 'spontaneous' in category or category.startswith(('tgl_spo_', 'eng_sp')):
        return 'spontaneous_prompt_needs_review'
    if language == 'fil' and '_eng' in category:
        return 'explicit_english_category'
    if not category:
        return 'missing_prompt_category'
    return None


def audio_info(path):
    with wave.open(str(path), 'rb') as audio:
        channels, width, rate, frames, compression, _ = audio.getparams()
        if (channels, width, rate, compression) != (1, 2, 16000, 'NONE'):
            raise ValueError('unsupported_audio_format')
        duration = frames / rate
        if not 0.2 <= duration <= 30:
            raise ValueError('duration_outside_0.2_to_30_seconds')
        data = audio.readframes(frames)
        if len(data) != frames * width * channels:
            raise ValueError('truncated_audio')
        if not any(data):
            raise ValueError('digital_silence')
        return duration, hashlib.sha256(data).hexdigest()


def speaker_splits(speakers, seed):
    speakers = sorted(set(speakers))
    if len(speakers) < 3:
        raise ValueError('At least three eligible speakers are required')
    random.Random(seed).shuffle(speakers)
    holdout = max(1, round(len(speakers) * 0.1))
    return {speaker: ('test' if i < holdout else 'validation' if i < 2 * holdout else 'train')
            for i, speaker in enumerate(speakers)}


def write_jsonl(path, rows):
    with path.open('w', encoding='utf-8') as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False) + '\n')


def prepare(source, output, seed, language='fil'):
    if language not in ('fil', 'eng'):
        raise ValueError('Language must be fil or eng')
    source = source.resolve()
    if not source.is_dir():
        raise ValueError('Source folder does not exist')
    if output.exists():
        raise ValueError('Output already exists; choose a new output directory')
    logs = sorted(source.rglob('*.log'))
    if not logs:
        raise ValueError('No LOG files found')
    eligible, excluded = [], []
    referenced, seen_paths, seen_hashes = set(), set(), set()
    age_by_speaker = {}
    for log in logs:
        lines = log.read_text(encoding='utf-8-sig').splitlines()
        metadata = {}
        for line in lines:
            match = META.fullmatch(line)
            if match:
                metadata[match[1]] = match[2].strip('"')
        speaker = metadata.get('SpeakerID')
        if not speaker or speaker != log.parent.name:
            raise ValueError(f'Speaker identity mismatch: {log}')
        age = metadata.get('SpeakerAge', '')
        if age.isdigit():
            age_by_speaker[speaker] = int(age)
        for number, line in enumerate(lines, 1):
            if not line.strip() or META.fullmatch(line):
                continue
            location = {'source_log': log.relative_to(source).as_posix(), 'line': number}
            match = ROW.fullmatch(line)
            if not match:
                excluded.append({**location, 'reason': 'unparsed_line', 'raw_line': line})
                continue
            filename, category, raw_text = match.groups()
            if Path(filename).name != filename or '/' in filename or '\\' in filename or ':' in filename:
                raise ValueError(f'Unsafe filename in {log}:{number}')
            path = (log.parent / filename).resolve()
            if not path.is_relative_to(source):
                raise ValueError('Audio path leaves source directory')
            referenced.add(path)
            row = {**location, 'audio': path.as_posix(), 'text': normalize(raw_text),
                   'raw_text': raw_text, 'speaker_id': speaker, 'prompt_category': category}
            reason = None
            if path in seen_paths:
                reason = 'duplicate_audio_reference'
            elif not path.is_file():
                reason = 'missing_audio'
            else:
                seen_paths.add(path)
                reason = review_reason(row['text'], category, language)
            if not reason:
                try:
                    duration, digest = audio_info(path)
                    row.update(duration_seconds=round(duration, 6), sample_rate=16000,
                               audio_sha256=digest)
                    if digest in seen_hashes:
                        reason = 'duplicate_audio_content'
                    else:
                        seen_hashes.add(digest)
                except ValueError as error:
                    reason = str(error)
                except (wave.Error, EOFError, OSError) as error:
                    reason = 'unreadable_audio'
                    row['detail'] = str(error)
            if reason:
                excluded.append({**row, 'reason': reason})
            else:
                eligible.append(row)
        print(f'Checked {log.relative_to(source)}; eligible={len(eligible)}', flush=True)
    for path in sorted(source.rglob('*.wav')):
        if path.resolve() not in referenced:
            excluded.append({'audio': path.as_posix(), 'reason': 'audio_without_log_entry'})
    assignment = speaker_splits((row['speaker_id'] for row in eligible), seed)
    splits = {name: [] for name in ('train', 'validation', 'test')}
    for row in eligible:
        splits[assignment[row['speaker_id']]].append(row)
    report = {'source': str(source), 'language': language, 'seed': seed, 'logs': len(logs),
              'wav_files': sum(1 for _ in source.rglob('*.wav')),
              'eligible_recordings': len(eligible), 'excluded_records': len(excluded),
              'exclusion_reasons': dict(Counter(row['reason'] for row in excluded)),
              'speaker_age_range': [min(age_by_speaker.values()), max(age_by_speaker.values())] if age_by_speaker else None,
              'normalization': 'NFC and whitespace only; original text retained',
              'limitations': ['LOG text is a prompt, not independently verified speech.',
                             'Annotations and ambiguous prompt categories are excluded for review.',
                             'No listening review, noise assessment or pronunciation assessment performed.',
                             'Splits separate speakers, but shared reading prompts can occur across splits.',
                             'No audio copied or converted; no model training performed.'],
              'splits': {}}
    for name, rows in splits.items():
        speakers = sorted({row['speaker_id'] for row in rows})
        report['splits'][name] = {'recordings': len(rows), 'hours': round(sum(r['duration_seconds'] for r in rows) / 3600, 3),
                                'speakers': speakers,
                                'prompt_categories': dict(Counter(r['prompt_category'] for r in rows))}
    output.mkdir(parents=True)
    for name, rows in splits.items():
        write_jsonl(output / f'{name}.jsonl', rows)
    write_jsonl(output / 'review.jsonl', excluded)
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({name: {k: v for k, v in stats.items() if k != 'prompt_categories'}
                      for name, stats in report['splits'].items()}, indent=2))
    print('Excluded:', report['exclusion_reasons'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--language', choices=('fil', 'eng'), default='fil')
    args = parser.parse_args()
    prepare(args.source, args.output, args.seed, args.language)
