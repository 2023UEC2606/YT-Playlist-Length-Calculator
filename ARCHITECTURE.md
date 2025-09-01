# Component Architecture Map

## Visual Component Tree
```
App.tsx (Main Container)
│
├── Header Section
│   ├── YouTubeLogo Component
│   │   └── YouTube Icon (You + Tube styling)
│   ├── App Title (clickable refresh)
│   └── GitHubButton Component
│       └── GitHub SVG Icon
│
├── Content Section
│   ├── Title & Instructions
│   ├── Input Section
│   │   └── Playlist URLs Textarea
│   ├── Optional Inputs
│   │   ├── Range Start Input
│   │   ├── Range End Input  
│   │   ├── Playback Speed Input
│   │   └── API Key Input
│   ├── Analyze Button
│   ├── Video Toggle Checkbox
│   ├── Error Message (conditional)
│   └── Results Section (conditional)
│       ├── Stats Summary
│       └── Playlist Cards
│           ├── Playlist Details
│           ├── Speed Calculations Grid
│           └── Video List (conditional)
│               └── Video Items
│                   ├── Thumbnail Image
│                   ├── Video Title
│                   └── Duration Badge
│
└── Footer Section
    └── Creator Attribution
```

## State Management Flow
```
User Actions → State Updates → API Calls → UI Re-render
     │              │             │           │
     ├── Input changes      ├── fetchPlaylistData
     ├── Button clicks      ├── fetchAllPlaylistItems  
     ├── Checkbox toggle    ├── fetchVideoDetails
     └── Form submission    └── cachedFetch
```

## Key State Variables
- `playlistUrls` - User input (string)
- `rangeStart/End` - Video range (string)
- `playbackSpeed` - Custom speed (string)
- `apiKey` - Custom API key (string)
- `loading` - Loading state (boolean)
- `error` - Error messages (string)
- `results` - Playlist data (PlaylistResult[])
- `totals` - Aggregate stats (object)
- `showVideos` - Video list toggle (boolean)

## Data Transformation Pipeline
```
Raw YouTube API Response
           ↓
    Parse & Structure
           ↓
    Calculate Durations  
           ↓
    Format for Display
           ↓
    Render UI Components
```

## API Call Sequence
1. User submits playlist URLs
2. Extract playlist IDs from URLs
3. For each playlist:
   - Fetch playlist metadata
   - Fetch all playlist items (paginated)
   - Filter by range if specified
   - Batch fetch video details
   - Calculate durations
4. Aggregate results and update UI

## Error Handling Strategy
- API errors → User-friendly messages
- Invalid URLs → Specific validation errors
- Network issues → Retry suggestions
- Rate limiting → Caching prevents most issues

This architecture provides a clear separation between UI components, state management, and data processing while maintaining simplicity appropriate for the application's scope.