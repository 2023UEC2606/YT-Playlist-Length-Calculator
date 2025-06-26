# YouTube Playlist Duration Calculator

A modern, visually stunning web application that calculates the total duration of YouTube playlists with advanced features and a dynamic dark theme interface.



## ✨ Features

- *Multiple Playlist Support*: Analyze one or more YouTube playlists simultaneously
- *Video Range Selection*: Calculate duration for specific video ranges within playlists
- *Custom Playback Speed*: See adjusted durations based on your preferred playback speed
- *Advanced Statistics*:
  - Total video count and duration
  - Average video length
  - Duration at various playback speeds (0.75x to 2.0x)
- *Creator Information*: Displays playlist creator/channel details
- *Secure API Usage*: Pre-configured API key with option to use your own

## 🎨 Design Elements

- *Dark Theme*: Full black background with sleek modern interface
- *Animated Lightning Border*: Dynamic glowing effect around the main container
- *Gradient Typography*: Vibrant animated text gradients for headings
- *Hover Animations*: Smooth interactive effects throughout the interface
- *Responsive Layout*: Fully optimized for all devices from mobile to desktop
- *Loading Indicators*: Animated spinner while fetching playlist data

## 🚀 Quick Start

1. Clone or download this repository
2. Open index.html in any modern web browser
3. Paste one or more YouTube playlist URLs (one per line)
4. Optionally set:
   - Range start and end values
   - Custom playback speed
   - Your own YouTube API key (optional)
5. Click "ANALYZE" to see detailed results

## 🔑 YouTube API Key

The application includes a pre-configured API key, but you can use your own:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > Library
4. Search for and enable "YouTube Data API v3"
5. Create credentials (API key)
6. Enter your key in the application (optional)

## 🧩 How It Works

1. The application extracts playlist IDs from the URLs you provide
2. It fetches playlist metadata and video details using the YouTube Data API
3. ISO 8601 duration formats are parsed into seconds
4. Total and average durations are calculated
5. Results are displayed with adjustments for custom playback speeds

## 📱 Responsive Design

- *Desktop*: Full-width layout with optimized spacing
- *Tablet*: Adjusted grid layouts and font sizes
- *Mobile*: Single-column layout with appropriately sized elements
- *Extra Small Devices*: Further optimized for very small screens

## ⚠ Limitations

- YouTube API quotas may limit the number of requests per day
- Very large playlists might require more processing time
- Some private or restricted videos may not be accessible

## 🔮 Future Enhancements

- Offline analysis capability
- Playlist comparison feature
- Saving favorites for quick re-analysis
- Export results to different formats
- Dark/light theme toggle

## 💻 Technologies Used

- HTML5 for structure
- CSS3 for styling (custom animations, no frameworks)
- Vanilla JavaScript for functionality
- YouTube Data API v3 for data retrieval


Made with ❤ by Nishant Raj
