import { useEffect, useRef, useState } from 'react';
import { getSession } from '../utils/session';
import { liraAlert } from '../utils/alerts';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function TeacherRecording({ resultId, count, onDeleted }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const players = useRef(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      setVisible(true);
    } catch (requestError) {
      loaded.forEach((url) => URL.revokeObjectURL(url));
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (visible) {
      players.current?.querySelectorAll('audio').forEach((audio) => audio.pause());
      setVisible(false);
    } else if (urls.length) {
      setVisible(true);
    } else {
      load();
    }
  };

  const deleteRecording = async () => {
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/story-results/${resultId}/recording`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getSession()?.token || ''}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Could not delete the recording. Please try again.');
      }
      resources.current.urls.forEach((url) => URL.revokeObjectURL(url));
      resources.current.urls = [];
      setUrls([]);
      setVisible(false);
      setConfirmDelete(false);
      onDeleted?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const requestDeleteRecording = async () => {
    setConfirmDelete(true);
    try {
      const result = await liraAlert.fire({
        icon: 'warning',
        title: 'Delete this recording?',
        text: 'All audio for this attempt will be permanently deleted. Scores and reading results will be kept.',
        showCancelButton: true,
        confirmButtonText: 'Delete permanently',
        cancelButtonText: 'Cancel',
        focusCancel: true,
      });
      if (result.isConfirmed) await deleteRecording();
    } finally {
      setConfirmDelete(false);
    }
  };

  if (!count) return <span>No recording available for this attempt.</span>;
  return <div ref={players}>
    <button type="button" onClick={toggleRecording} aria-expanded={visible} disabled={loading || deleting || confirmDelete} className="rounded-full px-3 py-1.5 font-semibold border cursor-pointer">
      {loading ? 'Loading recording…' : visible ? 'Hide recording' : 'Listen to reading'}
    </button>
    <button type="button" onClick={requestDeleteRecording} disabled={loading || deleting || confirmDelete} className="ml-2 rounded-full px-3 py-1.5 font-semibold border text-red-700 cursor-pointer">
      {deleting ? 'Deleting…' : 'Delete recording'}
    </button>
    {error && <p role="alert">{error}</p>}
    {urls.map((url, index) => <div key={url} className="mt-2" hidden={!visible}>
      <label>Reading recording{count > 1 ? ` — part ${index + 1} of ${count}` : ''}</label>
      <audio controls controlsList="nodownload" preload="metadata" src={url} aria-label={`Reading recording part ${index + 1}`} />
    </div>)}
  </div>;
}
