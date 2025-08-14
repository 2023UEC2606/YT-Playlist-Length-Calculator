import React, { useState, useCallback } from 'react';
import './App.css';
const DEFAULT_API_KEY ='AIzaSyABb8KAFgjIIfeyGI9LPn4rqWmTvrZJNeo';
const cache = new Map();
interface Video {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
}
interface PlaylistResult {
  id: string;
  title: string;
  channelTitle: string;
  videoCount: number;
  totalCount: number;
  rangeInfo: string;
  durationSeconds: number;
  averageDurationSeconds: number;
  formattedDuration: string;
  formattedAverageDuration: string;
  videos?: Video[];
}
function YouTubeLogo() {
  return (
    <div className="header-logo">
      <div className="youtube-icon">
        <span className="youtube-you">You</span>
        <span className="youtube-tube">Tube</span>
      </div>
    </div>
  );
}
function GitHubButton() {
  return (
    <a href="https://github.com/Nishantnsut27" target="_blank" rel="noopener noreferrer" className="github-button" title="View GitHub Profile">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
    </a>
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
async function cachedFetch(url: string, cacheKey: string) {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const response = await fetch(url);
  const data = await response.json();
  cache.set(cacheKey, data);
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  return data;
}
async function fetchAllPlaylistItems(playlistId: string, apiKey: string) {
  const cacheKey = `playlist_${playlistId}`;
  let items: any[] = [];
  let nextPageToken = '';
  let pageCount = 0;
  do {
    const pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const pageCacheKey = `${cacheKey}_page_${pageCount}`;
    const data = await cachedFetch(pageUrl, pageCacheKey);
    if (data.error) throw new Error(data.error.message);
    items = items.concat(data.items || []);
    nextPageToken = data.nextPageToken;
    pageCount++;
    if (pageCount > 20) break;
  } while (nextPageToken);
  return items;
}
async function fetchVideoDetails(videoIds: string[], apiKey: string) {
  const details: any[] = [];
  const batchSize = 25;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batchIds = videoIds.slice(i, i + batchSize);
    const cacheKey = `videos_${batchIds.join('_')}`;
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${batchIds.join(',')}&key=${apiKey}`;
    
    const data = await cachedFetch(url, cacheKey);
    if (data.error) throw new Error(data.error.message);
    details.push(...(data.items || []));
  }
  return details;
}
async function fetchPlaylistData(playlistId: string, apiKey: string, rangeStart: number | null, rangeEnd: number | null, includeVideos: boolean = false): Promise<PlaylistResult> {
  try {
    const playlistCacheKey = `playlist_info_${playlistId}`;
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
    const playlistData = await cachedFetch(playlistUrl, playlistCacheKey);   
    if (playlistData.error) {
      throw new Error(playlistData.error.message);
    }
    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }
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
    const videos: Video[] = [];
  videoDetails.forEach((video: any) => {
    const durationSeconds = parseDuration(video.contentDetails.duration);
    totalDurationSeconds += durationSeconds;
      if (includeVideos) {
        videos.push({
          id: video.id,
          title: video.snippet.title,
          duration: formatDuration(durationSeconds),
          thumbnail: video.snippet.thumbnails?.default?.url || ''
        });
      }
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
      formattedAverageDuration: formatDuration(averageDurationSeconds),
      videos: includeVideos ? videos : undefined
  };
  } catch (error: any) {
    throw new Error(`Failed to fetch playlist data: ${error.message}`);
  }
}
function extractPlaylistId(url: string) {
  const patterns = [
    /(?:list=)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/[a-zA-Z0-9_-]+\?list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?.*list=([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const matches = url.match(pattern);
    if (matches) return matches[1];
  }
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  return null;
}
const App: React.FC = () => {
  const [playlistUrls, setPlaylistUrls] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PlaylistResult[]>([]);
  const [totals, setTotals] = useState({ videoCount: 0, duration: 0 });
  const [showVideos, setShowVideos] = useState(false);
  const handleAnalyze = useCallback(async () => {
    setError('');
    setResults([]);
    setTotals({ videoCount: 0, duration: 0 });
    setLoading(true);
    try {
      const urls = playlistUrls.trim().split('\n').filter(url => url.trim() !== '');
      if (urls.length === 0) {
        throw new Error('Please enter at least one YouTube playlist URL.');
      }
      const key = (apiKey || DEFAULT_API_KEY).trim();
      if (!key) {
        throw new Error('API key Configure error');
      }
      let totalVideos = 0;
      let totalSeconds = 0;
      const playlists: PlaylistResult[] = [];
      for (const url of urls) {
        const playlistId = extractPlaylistId(url);
        if (!playlistId) {
          throw new Error(`Invalid playlist URL or ID: ${url}`);
        }
        const data = await fetchPlaylistData(
          playlistId,
          key,
          rangeStart ? parseInt(rangeStart) : null,
          rangeEnd ? parseInt(rangeEnd) : null,
          showVideos
        );
        playlists.push(data);
        totalVideos += data.videoCount;
        totalSeconds += data.durationSeconds;
      }
      setResults(playlists);
      setTotals({ videoCount: totalVideos, duration: totalSeconds });
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the playlist.');
    } finally {
      setLoading(false);
    }
  }, [playlistUrls, rangeStart, rangeEnd, apiKey, showVideos]);
  const handleShowVideos = useCallback(async () => {
    if (results.length === 0) {
      setError('Please analyze a playlist first before showing videos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const key = (apiKey || DEFAULT_API_KEY).trim();
      const updatedResults: PlaylistResult[] = [];
      for (const result of results) {
        const data = await fetchPlaylistData(
          result.id,
          key,
          rangeStart ? parseInt(rangeStart) : null,
          rangeEnd ? parseInt(rangeEnd) : null,
          true
        );
        updatedResults.push(data);
      }
      setResults(updatedResults);
      setShowVideos(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching video details.');
    } finally {
      setLoading(false);
    }
  }, [results, rangeStart, rangeEnd, apiKey]);
  const speed = parseFloat(playbackSpeed) || 1.0;
  return (
    <div className="app-root">
      <div className="app-header">
        <div className="header-left">
          <YouTubeLogo />
          <div className="app-title" onClick={() => window.location.reload()}>
            <span className="app-name">YT Playlist Length Calculator</span>
          </div>
        </div>
        <div className="header-right">
          <GitHubButton />
        </div>
      </div>
      <div className="app-content">
        <div className="main-title">
          Find the length of any YouTube playlist:
        </div>
        <div className="instructions">
          <p>You can enter a playlist link, playlist ID or even a video link from the playlist!</p>
          <p>You can also enter a single video link or list of playlist links.</p>
        </div>
        <div className="input-section">
            <textarea
              value={playlistUrls}
              onChange={e => setPlaylistUrls(e.target.value)}
            rows={4}
            placeholder="youtube.com/playlist?list=ID1&#10;youtube.com/playlist?list=ID2"
            className="playlist-input"
          />
        </div>

        <div className="optional-instructions">
          <p>Optionally, enter a range of videos to analyze in the first link. Leave blank to analyze the entire playlist.</p>
          <p>You can also enter a custom speed (like 2.25), and a YouTube API key to use your own.</p>
        </div>
        <div className="optional-inputs">
          <div className="input-group">
            <label>Range start (1)</label>
              <input
                type="number"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
              placeholder=""
              className="optional-input"
                min={1}
              />
          </div>
          <div className="input-group">
            <label>Range end (500)</label>
              <input
                type="number"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
              placeholder=""
              className="optional-input"
                min={1}
              />
          </div>
          <div className="input-group">
            <label>Custom speed (like 2.25)</label>
              <input
                type="number"
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(e.target.value)}
                step={0.25}
                min={0.25}
              className="optional-input"
            />
          </div>
          <div className="input-group">
            <label>YouTube API key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              placeholder="Optional"
              className="optional-input"
              />
          </div>
          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={!playlistUrls.trim() || loading}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        <div className="video-toggle">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showVideos}
              onChange={e => {
                const checked = e.target.checked;
                setShowVideos(checked);
                if (checked) {
                  handleShowVideos();
                }
              }}
            />
            Show video list
          </label>
        </div>
        {error && <div className="error-message">{error}</div>} 
        {results.length > 0 && !loading && (
          <div className="results-section">
            <h2>Results</h2>
            <div className="stats-summary">
              <div className="stat-item">
                <span>Videos:</span> <b>{totals.videoCount}</b>
              </div>
              <div className="stat-item">
                <span>Total Duration:</span> <b>{formatDuration(totals.duration)}</b>
              </div>
            </div>
            <div className="playlists-grid">
              {results.map((playlist) => (
                <div className="playlist-card" key={playlist.id}>
                  <h3>Playlist : {playlist.title}</h3>
                  <div className="playlist-details">
                    <p><b>ID :</b> {playlist.id}</p>
                    <p><b>Creator :</b> {playlist.channelTitle}</p>
                    <p><b>Video count :</b> {playlist.videoCount} (from {rangeStart || 1} to {rangeEnd || playlist.totalCount}) (0 unavailable)</p>
                    <p><b>Average video length :</b> {playlist.formattedAverageDuration}</p>
                    <p><b>Total length :</b> {playlist.formattedDuration}</p>
                  </div>
                  <div className="speed-calculations">
                    <h4>Playback Speed Calculations:</h4>
                    <div className="speed-grid">
                      <div className="speed-item">
                        <span>At 1.25x :</span> <b>{formatDuration(playlist.durationSeconds / 1.25)}</b>
                      </div>
                      <div className="speed-item">
                        <span>At 1.50x :</span> <b>{formatDuration(playlist.durationSeconds / 1.5)}</b>
                      </div>
                      <div className="speed-item">
                        <span>At 1.75x :</span> <b>{formatDuration(playlist.durationSeconds / 1.75)}</b>
                      </div>
                      <div className="speed-item">
                        <span>At 2.00x :</span> <b>{formatDuration(playlist.durationSeconds / 2)}</b>
                      </div>
                      {speed !== 1 && (
                        <div className="speed-item custom-speed">
                          <span>At {speed.toFixed(2)}x :</span> <b>{formatDuration(playlist.durationSeconds / speed)}</b>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {showVideos && playlist.videos && playlist.videos.length > 0 && (
                    <div className="video-list">
                      <h4>Videos in Range:</h4>
                      <div className="videos-container">
                        {playlist.videos.map((video) => (
                          <div className="video-item" key={video.id}>
                            <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                            <div className="video-info">
                              <div className="video-title">{video.title}</div>
                              <div className="video-duration">{video.duration}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            Made with <span className="heart">❤️</span> by <a href="https://github.com/Nishantnsut27" target="_blank" rel="noopener noreferrer">Nishant Raj</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;