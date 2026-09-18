import { useEffect, useRef, useState } from 'react';
import { getSession } from '../utils/session';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function TeacherRecording({ resultId, count }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resources = useRef({ urls: [], controller: null });
  useEffect(() => {
    const current = resources.current;
    return () => {
      current.controller?.abort();
      current.urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    resources.current.controller = controller;
    const loaded = [];
    try {
      for (let index = 0; index < count; index += 1) {
        const response = await fetch(`${API_URL}/api/story-results/${resultId}/recording/${index}`, {
          headers: { Authorization: `Bearer ${getSession()?.token || ''}` },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Could not load recording.');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        loaded.push(url);
        resources.current.urls.push(url);
      }
      setUrls(loaded);
    } catch (requestError) {
      loaded.forEach((url) => URL.revokeObjectURL(url));
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  if (!count) return <span>No recording available for this attempt.</span>;
  return <div>
    {!urls.length && <button type="button" onClick={load} disabled={loading} className="rounded-full px-3 py-1.5 font-semibold border cursor-pointer">
      {loading ? 'Loading recording…' : 'Listen to reading'}
    </button>}
    {error && <p role="alert">{error}</p>}
    {urls.map((url, index) => <div key={url} className="mt-2">
      <label>Reading recording{count > 1 ? ` — part ${index + 1} of ${count}` : ''}</label>
      <audio controls controlsList="nodownload" preload="metadata" src={url} aria-label={`Reading recording part ${index + 1}`} />
    </div>)}
  </div>;
}
