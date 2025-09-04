import React, { useState, useCallback, useEffect } from 'react';

const Loading7: React.FC<{ size?: number; color?: string; speed?: string }> = ({ 
  size = 24, 
  color = '#ffffff', 
  speed = '0.9s' 
}) => {
  const dotSize = size / 3;
  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${dotSize * 0.3}px`
      }}
    >
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            borderRadius: '50%',
            animation: `loading7-bounce ${speed} infinite`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
      <style>{`
        @keyframes loading7-bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

const DEFAULT_API_KEY ='AIzaSyABb8KAFgjIIfeyGI9LPn4rqWmTvrZJNeo';
const cache = new Map();

interface Video {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  url: string;
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
          thumbnail: video.snippet.thumbnails?.default?.url || '',
          url: `https://www.youtube.com/watch?v=${video.id}`
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

function extractVideoId(url: string) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const matches = url.match(pattern);
    if (matches) return matches[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  return null;
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

async function fetchSingleVideoData(videoId: string, apiKey: string, includeVideos: boolean = false): Promise<PlaylistResult> {
  try {
    const videoDetails = await fetchVideoDetails([videoId], apiKey);
    if (!videoDetails || videoDetails.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    const video = videoDetails[0];
    const durationSeconds = parseDuration(video.contentDetails.duration);
    
    const result: PlaylistResult = {
      id: videoId,
      title: `Single Video: ${video.snippet.title}`,
      channelTitle: video.snippet.channelTitle,
      videoCount: 1,
      totalCount: 1,
      rangeInfo: 'Single video',
      durationSeconds: durationSeconds,
      averageDurationSeconds: durationSeconds,
      formattedDuration: formatDuration(durationSeconds),
      formattedAverageDuration: formatDuration(durationSeconds)
    };
    
    if (includeVideos) {
      result.videos = [{
        id: video.id,
        title: video.snippet.title,
        duration: formatDuration(durationSeconds),
        thumbnail: video.snippet.thumbnails?.default?.url || '',
        url: `https://www.youtube.com/watch?v=${video.id}`
      }];
    }
    
    return result;
  } catch (error: any) {
    throw new Error(`Failed to fetch video data: ${error.message}`);
  }
}

const PlaylistLength: React.FC = () => {
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
  const [fadeIn, setFadeIn] = useState(false);
  
  useEffect(() => {
    setFadeIn(true);
  }, []);
  
  const handleAnalyze = useCallback(async () => {
    setError('');
    setResults([]);
    setTotals({ videoCount: 0, duration: 0 });
    setLoading(true);
    try {
      const urls = playlistUrls.trim().split('\n').filter(url => url.trim() !== '');
      if (urls.length === 0) {
        throw new Error('Please enter at least one YouTube video or playlist URL.');
      }
      const key = (apiKey || DEFAULT_API_KEY).trim();
      if (!key) {
        throw new Error('API key Configure error');
      }
      let totalVideos = 0;
      let totalSeconds = 0;
      const results: PlaylistResult[] = [];
      
      for (const url of urls) {
        const playlistId = extractPlaylistId(url);
        
        if (playlistId) {
          const data = await fetchPlaylistData(
            playlistId,
            key,
            rangeStart ? parseInt(rangeStart) : null,
            rangeEnd ? parseInt(rangeEnd) : null,
            showVideos
          );
          results.push(data);
          totalVideos += data.videoCount;
          totalSeconds += data.durationSeconds;
        } else {
          const videoId = extractVideoId(url);
          
          if (videoId) {
            const data = await fetchSingleVideoData(videoId, key, showVideos);
            results.push(data);
            totalVideos += data.videoCount;
            totalSeconds += data.durationSeconds;
          } else {
            throw new Error(`Invalid YouTube URL or ID: ${url}. Please provide a valid YouTube video or playlist URL.`);
          }
        }
      }
      
      setResults(results);
      setTotals({ videoCount: totalVideos, duration: totalSeconds });
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the content.');
    } finally {
      setLoading(false);
    }
  }, [playlistUrls, rangeStart, rangeEnd, apiKey, showVideos]);

  const handleShowVideos = useCallback(async () => {
    if (results.length === 0) {
      setError('Please analyze content first before showing videos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const key = (apiKey || DEFAULT_API_KEY).trim();
      const updatedResults: PlaylistResult[] = [];
      
      for (const result of results) {
        if (result.id.length === 11) {
          const data = await fetchSingleVideoData(result.id, key, true);
          updatedResults.push(data);
        } else {
          const data = await fetchPlaylistData(
            result.id,
            key,
            rangeStart ? parseInt(rangeStart) : null,
            rangeEnd ? parseInt(rangeEnd) : null,
            true
          );
          updatedResults.push(data);
        }
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
    <div 
      style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}>
      <div className="main-title">
        Analyze YouTube videos and playlists:
      </div>
      <div className="instructions">
        <p>You can enter video links, playlist links, video IDs, or playlist IDs!</p>
        <p>Mix and match: analyze individual videos, entire playlists, or both together.</p>
      </div>
      <div className="input-section">
          <textarea
            value={playlistUrls}
            onChange={e => setPlaylistUrls(e.target.value)}
          rows={4}
          placeholder="Paste Your youtube link"
          className="playlist-input"
        />
      </div>

      <div className="optional-instructions">
        <p>Optionally, enter a range of videos to analyze for playlists (range applies to first playlist only). Leave blank to analyze entire content.</p>
        <p>You can also enter a custom playback speed (like 2.25), and a YouTube API key to use your own quota.</p>
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
          {loading ? (
            <>
              <Loading7 size={24} color="#ffffff" speed="0.9s" />
              Analyzing...
            </>
          ) : (
            <>
              Analyze
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '6px' }}>
                <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" />
              </svg>
            </>
          )}
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
              if (checked && results.length > 0) {
                handleShowVideos();
              }
            }}
            disabled={loading || results.length === 0}
          />
          {loading && showVideos ? (
            <div className="loading-container">
              <Loading7 size={24} color="#ffffff" speed="0.9s" />
              Loading videos...
            </div>
          ) : `Show video list ${results.length === 0 ? '(analyze a playlist first)' : ''}`}
        </label>
      </div>
      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z"/>
          </svg>
          {error}
        </div>
      )}
      {loading && !results.length && (
        <div className="loading-container" style={{ marginTop: '30px' }}>
          <Loading7 size={60} color="#ff0000" speed="0.9s" />
        </div>
      )}
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
            {results.map((result) => (
              <div className="playlist-card" key={result.id}>
                <h3>{result.title.startsWith('Single Video:') ? 'Video' : 'Playlist'} : {result.title.replace('Single Video: ', '')}</h3>
                <div className="playlist-details">
                  <p><b>ID :</b> {result.id}</p>
                  <p><b>Creator :</b> {result.channelTitle}</p>
                  <p><b>Content type :</b> {result.videoCount === 1 && result.totalCount === 1 ? 'Single Video' : `Playlist with ${result.totalCount} videos`}</p>
                  {result.rangeInfo !== 'Single video' && (
                    <p><b>Range analyzed :</b> {result.rangeInfo}</p>
                  )}
                  <p><b>Video count analyzed :</b> {result.videoCount}</p>
                  {result.videoCount > 1 && (
                    <p><b>Average video length :</b> {result.formattedAverageDuration}</p>
                  )}
                  <p><b>Total length :</b> {result.formattedDuration}</p>
                </div>
                <div className="speed-calculations">
                  <h4>Playback Speed Calculations:</h4>
                  <div className="speed-grid">
                    <div className="speed-item">
                      <span>At 1.25x :</span> <b>{formatDuration(result.durationSeconds / 1.25)}</b>
                    </div>
                    <div className="speed-item">
                      <span>At 1.50x :</span> <b>{formatDuration(result.durationSeconds / 1.5)}</b>
                    </div>
                    <div className="speed-item">
                      <span>At 1.75x :</span> <b>{formatDuration(result.durationSeconds / 1.75)}</b>
                    </div>
                    <div className="speed-item">
                      <span>At 2.00x :</span> <b>{formatDuration(result.durationSeconds / 2)}</b>
                    </div>
                    {speed !== 1 && (
                      <div className="speed-item custom-speed">
                        <span>At {speed.toFixed(2)}x :</span> <b>{formatDuration(result.durationSeconds / speed)}</b>
                      </div>
                    )}
                  </div>
                </div>
                
                {showVideos && result.videos && result.videos.length > 0 && (
                  <div className="video-list">
                    <h4>{result.videoCount === 1 ? 'Video Details:' : `Videos in Range: (${result.videos.length} videos)`}</h4>
                    <div className="videos-container">
                      {result.videos.map((video, videoIndex) => (
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="video-item" 
                          key={video.id}
                          title="Click to watch on YouTube"
                          style={{
                            opacity: 1,
                            transform: 'translateY(0)',
                            animation: `fadeInUp 0.6s ease forwards ${videoIndex * 0.08}s`
                          }}
                        >
                          <div className="video-thumbnail-container">
                            <img 
                              src={video.thumbnail.replace('default', 'mqdefault')} 
                              alt={video.title} 
                              className="video-thumbnail"
                              onError={(e) => {
                                e.currentTarget.src = video.thumbnail;
                              }}
                            />
                            <div className="video-play-button"></div>
                            <div className="duration-badge">{video.duration}</div>
                          </div>
                          <div className="video-info">
                            <div className="video-title">{video.title}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {showVideos && (!result.videos || result.videos.length === 0) && (
                  <div className="video-list">
                    <h4>{result.videoCount === 1 ? 'Video Details:' : 'Videos in Range:'}</h4>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                      No video details found or unable to load. This might be due to API limitations or the content being private/unavailable.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistLength;
