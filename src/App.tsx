import React, { useState } from 'react';
import './App.css';

const DEFAULT_API_KEY = 'AIzaSyBf4m_h1koNH3G2GxVqc9xFLrEVaacpyKc';

function YouTubeLogo() {
  return (
    <svg className="youtube-logo" viewBox="0 0 90 20" preserveAspectRatio="xMidYMid meet" style={{ width: 80, height: 20 }}>
      <g>
        <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000"/>
        <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
      </g>
    </svg>
  );
}

function formatDuration(seconds: number) {
  seconds = Math.round(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map(n => n.toString().padStart(2, '0')).join(':');
}

function parseDuration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string) {
  let items: any[] = [];
  let nextPageToken = '';
  do {
    const pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const response = await fetch(pageUrl);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    items = items.concat(data.items || []);
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  return items;
}

async function fetchVideoDetails(videoIds: string[], apiKey: string) {
  const details: any[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batchIds = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds.join(',')}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    details.push(...(data.items || []));
  }
  return details;
}

async function fetchPlaylistData(playlistId: string, apiKey: string, rangeStart: number | null, rangeEnd: number | null) {
  const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`);
  const playlistData = await playlistResponse.json();
  if (playlistData.error) throw new Error(playlistData.error.message);
  if (!playlistData.items || playlistData.items.length === 0) throw new Error(`Playlist not found: ${playlistId}`);
  const playlistTitle = playlistData.items[0].snippet.title;
  const channelTitle = playlistData.items[0].snippet.channelTitle;
  const items = await fetchAllPlaylistItems(playlistId, apiKey);
  let filteredItems = items;
  let rangeInfo = 'Full playlist';
  if (rangeStart !== null || rangeEnd !== null) {
    const start = rangeStart !== null ? rangeStart - 1 : 0;
    const end = rangeEnd !== null ? rangeEnd : items.length;
    filteredItems = items.slice(start, end);
    rangeInfo = `Videos ${start + 1} to ${Math.min(end, items.length)} of ${items.length}`;
  }
  const videoIds = filteredItems.map((item: any) => item.snippet.resourceId.videoId);
  const videoDetails = await fetchVideoDetails(videoIds, apiKey);
  let totalDurationSeconds = 0;
  videoDetails.forEach((video: any) => {
    const durationSeconds = parseDuration(video.contentDetails.duration);
    totalDurationSeconds += durationSeconds;
  });
  const averageDurationSeconds = filteredItems.length > 0 ? totalDurationSeconds / filteredItems.length : 0;
  return {
    id: playlistId,
    title: playlistTitle,
    channelTitle: channelTitle,
    videoCount: filteredItems.length,
    totalCount: items.length,
    rangeInfo: rangeInfo,
    durationSeconds: totalDurationSeconds,
    averageDurationSeconds: averageDurationSeconds,
    formattedDuration: formatDuration(totalDurationSeconds),
    formattedAverageDuration: formatDuration(averageDurationSeconds)
  };
}

function extractPlaylistId(url: string) {
  const playlistRegex = /(?:list=)([a-zA-Z0-9_-]+)/;
  const matches = url.match(playlistRegex);
  return matches ? matches[1] : null;
}

const App: React.FC = () => {
  const [playlistUrls, setPlaylistUrls] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [totals, setTotals] = useState({ videoCount: 0, duration: 0 });

  const handleAnalyze = async () => {
    setError('');
    setResults([]);
    setTotals({ videoCount: 0, duration: 0 });
    setLoading(true);
    try {
      const urls = playlistUrls.trim().split('\n').filter(url => url.trim() !== '');
      if (urls.length === 0) throw new Error('Please enter at least one YouTube playlist URL.');
      const key = apiKey.trim() || DEFAULT_API_KEY;
      if (!key) throw new Error('API key error. Please refresh the page or provide your own key.');
      let totalVideos = 0;
      let totalSeconds = 0;
      const playlists = [];
      for (const url of urls) {
        const playlistId = extractPlaylistId(url);
        if (!playlistId) throw new Error(`Invalid playlist URL: ${url}`);
        const data = await fetchPlaylistData(
          playlistId,
          key,
          rangeStart ? parseInt(rangeStart) : null,
          rangeEnd ? parseInt(rangeEnd) : null
        );
        playlists.push(data);
        totalVideos += data.videoCount;
        totalSeconds += data.durationSeconds;
      }
      setResults(playlists);
      setTotals({ videoCount: totalVideos, duration: totalSeconds });
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const speed = parseFloat(playbackSpeed) || 1.0;

  return (
    <div className="ytpdc-root">
      <div className="ytpdc-container">
        <div className="ytpdc-header">
          <YouTubeLogo />
          <h1>Playlist Duration Calculator</h1>
        </div>
        <div className="ytpdc-inputs">
          <label>
            Playlist URLs (one per line):
            <textarea
              value={playlistUrls}
              onChange={e => setPlaylistUrls(e.target.value)}
              rows={3}
              placeholder="https://www.youtube.com/playlist?list=PLxxxxxx\n..."
              className="ytpdc-textarea"
            />
          </label>
          <div className="ytpdc-row">
            <label>
              Range Start:
              <input
                type="number"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
                placeholder="Optional"
                className="ytpdc-input"
                min={1}
              />
            </label>
            <label>
              Range End:
              <input
                type="number"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
                placeholder="Optional"
                className="ytpdc-input"
                min={1}
              />
            </label>
          </div>
          <div className="ytpdc-row">
            <label>
              Playback Speed:
              <input
                type="number"
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(e.target.value)}
                step={0.25}
                min={0.25}
                className="ytpdc-input"
              />
            </label>
            <label>
              API Key <span className="ytpdc-optional">(Optional)</span>:
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="API Key is pre-configured"
                className="ytpdc-input"
              />
            </label>
          </div>
          <button
            className="ytpdc-analyze-btn"
            onClick={handleAnalyze}
            disabled={!playlistUrls.trim() || loading}
          >
            {loading ? 'Analyzing...' : 'ANALYZE'}
          </button>
        </div>
        {error && <div className="ytpdc-error">{error}</div>}
        {results.length > 0 && !loading && (
          <div className="ytpdc-results">
            <h2>Results</h2>
            <div className="ytpdc-stats">
              <div>
                <span>Videos:</span> <b>{totals.videoCount}</b>
              </div>
              <div>
                <span>Total Duration:</span> <b>{formatDuration(totals.duration)}</b>
              </div>
              <div>
                <span>At {speed.toFixed(2)}x Speed:</span> <b>{formatDuration(totals.duration / speed)}</b>
              </div>
            </div>
            <div className="ytpdc-playlists">
              {results.map((playlist, idx) => (
                <div className="ytpdc-playlist-card" key={playlist.id}>
                  <h3>{playlist.title}</h3>
                  <p><b>Channel:</b> {playlist.channelTitle}</p>
                  <p><b>Range:</b> {playlist.rangeInfo}</p>
                  <p><b>Videos:</b> {playlist.videoCount}</p>
                  <p><b>Total Duration:</b> {playlist.formattedDuration}</p>
                  <p><b>Avg. Duration:</b> {playlist.formattedAverageDuration}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <footer className="ytpdc-footer">
          Made with <span className="ytpdc-heart">❤️</span> by <a href="https://github.com/nishant-raj" target="_blank" rel="noopener noreferrer">Nishant Raj</a>
        </footer>
      </div>
    </div>
  );
};

export default App;
