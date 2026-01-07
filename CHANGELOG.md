# API Update - Stream Endpoint & Terminology

## Changes Made

### 1. API Endpoint Update
- Changed from `/v1/feed` → `/v1/stream`
- Updated API base URL for local testing: `http://localhost:8081`

### 2. Terminology Updates
**Shows → Channels:**
- `playlist.shows` → `playlist.channels`
- `showSlug` → `chSlug`
- `showName` → `chName`
- `showId` → `channelId`
- `showTitle` → `channelTitle`
- All show-related functions renamed (e.g., `selectShow` → `selectChannel`)

**Stories → Drops:**
- `playlist.stories` → `playlist.drops`
- `playlist.allStories` → `playlist.allDrops`
- `data.stories` → `data.drops`
- All story-related variables and comments updated

### 3. LocalStorage Key Update
- `musedrops_unfollowed_shows` → `musedrops_unfollowed_channels`

### 4. Function Renames
- `buildShowsMenu()` → `buildChannelsMenu()`
- `openShowsMenu()` → `openChannelsMenu()`
- `closeShowsMenu()` → `closeChannelsMenu()`
- `selectShow()` → `selectChannel()`
- `isShowFollowed()` → `isChannelFollowed()`
- `toggleFollowShow()` → `toggleFollowChannel()`
- `loadUnfollowedShows()` → `loadUnfollowedChannels()`
- `saveUnfollowedShows()` → `saveUnfollowedChannels()`

### 5. API Response Field Mapping
Updated to match new API schema:
- `story.showSlug` → `drop.chSlug`
- `story.showName` → `drop.chName`
- `/v1/shows/` → `/v1/channels/`
- `/v1/stories/` → `/v1/drops/`

## Testing
The application now:
- Fetches from `/v1/stream` endpoint
- Uses `chSlug` and `chName` from the response
- Constructs URLs using `/v1/channels/` and `/v1/drops/`
- Displays "Channels" terminology in the UI

## Note
API base URL is temporarily set to `http://localhost:8081` for local development.
For production, change back to `https://api.musedrops.com`.
