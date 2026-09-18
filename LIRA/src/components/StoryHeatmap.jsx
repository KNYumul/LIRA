import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { normalizedWord } from '../utils/readingTracking';
import { heatLevel, wordHeatmap } from '../utils/wordHeatmap';
import './StoryHeatmap.css';

function HeatmapSelect({ label, value, options, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const expanded = open && !disabled;
  useEffect(() => {
    if (!expanded) return;
    root.current?.querySelector('[aria-selected="true"]')?.focus();
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [expanded]);
  return (
    <div className="heatmap-select" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <span id={`${id}-label`} className="heatmap-select-label">{label}</span>
      <button ref={trigger} type="button" className="heatmap-select-trigger"
        aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox"
        aria-expanded={expanded} aria-controls={expanded ? id : undefined} disabled={disabled}
        onClick={() => setOpen(!open)} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}>
        <span id={`${id}-value`}>{options.find((option) => option.value === value)?.label || placeholder}</span>
        <ChevronDown size={14} className={expanded ? 'is-open' : ''} />
      </button>
      {expanded && <div id={id} role="listbox" aria-labelledby={`${id}-label`} className="heatmap-select-menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
          }
          const items = Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
          const index = items.indexOf(document.activeElement);
          const next = { ArrowDown: (index + 1) % items.length, ArrowUp: (index - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[event.key];
          if (next !== undefined) {
            event.preventDefault();
            items[next]?.focus();
          }
        }}>
        {options.map((option) => <button key={option.value} type="button" role="option"
          aria-selected={option.value === value} tabIndex={option.value === value ? 0 : -1}
          className="heatmap-select-option" onClick={() => {
            onChange(option.value);
            setOpen(false);
            trigger.current?.focus();
          }}>{option.label}</button>)}
      </div>}
    </div>
  );
}

export default function StoryHeatmap({ students, sections, sectionName, onSectionChange, teacherId }) {
  const [stories, setStories] = useState([]);
  const [storyId, setStoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
      return fetch(`${import.meta.env.VITE_API_URL || ''}/api/stories`, {
      headers: { 'X-Teacher-Id': teacherId || '' }, signal: controller.signal,
      });
    }).then(async (response) => {
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error('Could not load stories.');
      const data = await response.json();
      if (!controller.signal.aborted) setStories(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [teacherId, reload]);
  const story = stories.find((item) => item._id === storyId) || stories[0];
  const stats = useMemo(() => wordHeatmap(students, story?._id), [students, story?._id]);
  return (
    <section className="dashboard-bottom-card dashboard-heatmap-card word-heatmap">
      <h2 className="dashboard-heatmap-title">Reading Heatmap</h2>
      <div className="word-heatmap-filters">
        <HeatmapSelect label="Section" value={sectionName} onChange={onSectionChange}
          options={sections.map((name) => ({ value: name, label: name }))}
          disabled={!sections.length} placeholder="No sections" />
        <HeatmapSelect label="Story" value={story?._id || ''} onChange={setStoryId}
          options={stories.map((item) => ({ value: item._id, label: `${item.title} (${item.lang})` }))}
          disabled={loading || !stories.length || Boolean(error)} placeholder={loading ? 'Loading stories…' : 'No stories'} />
      </div>
      <p className="word-heatmap-caption">Share of assessed students who needed a retry for each word. Uses each student's selected attempt; repeated words are combined.</p>
      <div className="word-heatmap-legend" aria-label="Word difficulty scale">
        {[['none', 'No word data'], ['easy', '0%'], ['low', '1–25%'], ['medium', '26–50%'], ['high', 'Over 50%']].map(([level, label]) =>
          <span key={level}><i className={`word-heat-${level}`} />{label}</span>)}
      </div>
      {error ? <p role="alert">{error} <button type="button" onClick={() => setReload((value) => value + 1)}>Retry</button></p>
        : loading ? <p role="status">Loading stories…</p>
          : !story ? <p>Add a story to view its word heatmap.</p>
            : <>
              {!stats.size && <p role="status">No word data for this section and story yet. Complete a new read-aloud to see highlights.</p>}
              <div className="word-heatmap-passage" tabIndex={0} aria-label={`${story.title} word heatmap`}>
                <h3>{story.title}</h3>
                {(story.pages || []).map((page, index) => <p key={index}>{String(page.text || '').split(/([\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*)/gu).map((part, token) => {
                  if (token % 2 === 0) return part;
                  const stat = stats.get(normalizedWord(part));
                  const description = stat ? `${stat.struggling} of ${stat.readers} students needed a retry (${Math.round(stat.struggling / stat.readers * 100)}%)` : 'No word data';
                  return <span key={token} className={`word-heat-token word-heat-${heatLevel(stat)}`} title={`${part}: ${description}`} aria-label={`${part}: ${description}`}>{part}</span>;
                })}</p>)}
              </div>
            </>}
    </section>
  );
}
