(function() {
    const API_BASE = 'https://api.musedrops.com';

    let playlist = {
        stories: [],
        allStories: [],
        shows: [],
        currentShow: null,
        title: 'Musedrops',
        image: ''
    };
    let currentIndex = -1; // Start at intro
    let currentAudio = null;
    let isPlaying = false;

    // SVG icons
    const icons = {
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        wave: '<svg viewBox="0 0 50 38.05" fill="currentColor"><style>@keyframes pulse{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.3)}}.bar-1,.bar-9{animation:pulse .4s ease-in-out infinite;transform-origin:center}.bar-2,.bar-8{animation:pulse .4s ease-in-out infinite .05s;transform-origin:center}.bar-3,.bar-7{animation:pulse .4s ease-in-out infinite .1s;transform-origin:center}.bar-4,.bar-6{animation:pulse .4s ease-in-out infinite .15s;transform-origin:center}.bar-5{animation:pulse .4s ease-in-out infinite .2s;transform-origin:center}</style><path class="bar-1" d="M.91 15L.78 15A1 1 0 0 0 0 16v6a1 1 0 1 0 2 0s0 0 0 0V16a1 1 0 0 0-1-1H.91Z"/><path class="bar-2" d="M6.91 9L6.78 9A1 1 0 0 0 6 10V28a1 1 0 1 0 2 0s0 0 0 0V10A1 1 0 0 0 7 9H6.91Z"/><path class="bar-3" d="M12.91 0L12.78 0A1 1 0 0 0 12 1V37a1 1 0 1 0 2 0s0 0 0 0V1a1 1 0 0 0-1-1H12.91Z"/><path class="bar-4" d="M18.91 10l-.12 0A1 1 0 0 0 18 11V27a1 1 0 1 0 2 0s0 0 0 0V11a1 1 0 0 0-1-1H18.91Z"/><path class="bar-5" d="M24.91 15l-.12 0A1 1 0 0 0 24 16v6a1 1 0 0 0 2 0s0 0 0 0V16a1 1 0 0 0-1-1H24.91Z"/><path class="bar-6" d="M30.91 10l-.12 0A1 1 0 0 0 30 11V27a1 1 0 1 0 2 0s0 0 0 0V11a1 1 0 0 0-1-1H30.91Z"/><path class="bar-7" d="M36.91 0L36.78 0A1 1 0 0 0 36 1V37a1 1 0 1 0 2 0s0 0 0 0V1a1 1 0 0 0-1-1H36.91Z"/><path class="bar-8" d="M42.91 9L42.78 9A1 1 0 0 0 42 10V28a1 1 0 1 0 2 0s0 0 0 0V10a1 1 0 0 0-1-1H42.91Z"/><path class="bar-9" d="M48.91 15l-.12 0A1 1 0 0 0 48 16v6a1 1 0 1 0 2 0s0 0 0 0V16a1 1 0 0 0-1-1H48.91Z"/></svg>',
        rewind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text x="12" y="15" font-size="7" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>',
        forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15" font-size="7" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>'
    };

    // Format time
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.floor(Math.abs(seconds) % 60);
        const sign = seconds < 0 ? '-' : '';
        return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Load all shows and their stories
    async function loadPlaylist() {
        // Load shows list
        const showsResponse = await fetch(`${API_BASE}/shows`);
        if (!showsResponse.ok) {
            throw new Error(`Failed to load shows (${showsResponse.status})`);
        }
        const showsData = await showsResponse.json();

        // Handle different response structures
        const shows = Array.isArray(showsData) ? showsData :
                     (showsData.data && Array.isArray(showsData.data)) ? showsData.data :
                     [];

        if (shows.length === 0) {
            console.warn('No shows found in response:', showsData);
            return [];
        }

        // Load each show's details
        const allStories = [];
        const showsList = [];

        for (const show of shows) {
            if (!show.links?.self) continue;

            try {
                const showResponse = await fetch(show.links.self);
                if (!showResponse.ok) continue;

                const showData = await showResponse.json();
                const showDetails = showData.data || showData;

                // Track show info - prioritize image from /shows API
                const showInfo = {
                    id: showDetails.id || show.id || showDetails.title,
                    title: showDetails.title || show.title || 'Unknown Show',
                    image: show.imageUrl || show.image_url || show.image || showDetails.imageUrl || showDetails.image_url || showDetails.image || ''
                };
                showsList.push(showInfo);

                // Extract stories from the show
                if (showDetails.stories && Array.isArray(showDetails.stories)) {
                    const stories = showDetails.stories.map(story => {
                        // Try different possible image field names
                        const storyImage = story.image_url || story.image || story.imageUrl ||
                                         story.thumbnail_url || story.thumbnail ||
                                         showDetails.image_url || showDetails.image || '';

                        const storyAudio = story.audio_url || story.audioUrl || story.url || '';

                        return {
                            title: story.title || 'Untitled',
                            image: storyImage,
                            audioUrl: storyAudio,
                            published: story.published || story.published_at || story.created_at || story.publishedAt || '',
                            showId: showInfo.id,
                            showTitle: showInfo.title
                        };
                    });
                    allStories.push(...stories);
                }
            } catch (error) {
                console.warn(`Failed to load show ${show.links.self}:`, error);
            }
        }

        // Sort by published date (newer first)
        allStories.sort((a, b) => {
            const dateA = new Date(a.published);
            const dateB = new Date(b.published);

            // Handle invalid dates - put them at the end
            const isValidA = !isNaN(dateA.getTime());
            const isValidB = !isNaN(dateB.getTime());

            if (!isValidA && !isValidB) return 0;
            if (!isValidA) return 1;
            if (!isValidB) return -1;

            return dateB - dateA;
        });

        return { stories: allStories, shows: showsList };
    }

    // Populate playlist
    async function populatePlaylist() {
        const data = await loadPlaylist();
        playlist.allStories = data.stories;
        playlist.stories = data.stories;
        playlist.shows = data.shows;

        // Set playlist title and image from first story if available
        if (data.stories.length > 0) {
            playlist.title = data.stories[0].showTitle || 'Musedrops';
            playlist.image = data.stories[0].image || '';
        }
    }

    // Filter playlist by show
    function filterPlaylist(showId) {
        if (showId === null) {
            // Show all stories
            playlist.stories = playlist.allStories;
            playlist.currentShow = null;
        } else {
            // Filter by show
            playlist.stories = playlist.allStories.filter(story => story.showId === showId);
            playlist.currentShow = showId;
        }
    }

    // Create intro slide
    function createIntroSlide() {
        const slide = document.createElement('div');
        slide.className = 'episode-slide intro-slide';
        slide.dataset.index = -1;
        slide.dataset.isIntro = 'true'; // Mark as intro for event delegation

        slide.innerHTML = `
            <img class="episode-bg" src="cover.png" alt="">
            <div class="episode-overlay"></div>
            <div class="intro-hint">Tap to start</div>
        `;

        return slide;
    }

    // Create end slide
    function createEndSlide() {
        const slide = document.createElement('div');
        slide.className = 'episode-slide intro-slide'; // Reuse intro-slide styles
        const endIndex = playlist.stories.length; // Index after last episode
        slide.dataset.index = endIndex;
        slide.dataset.isEnd = 'true'; // Mark as end for event delegation

        slide.innerHTML = `
            <div class="episode-overlay" style="background: #000;"></div>
            <div class="episode-content" style="justify-content: center; align-items: center; text-align: center;">
                <h1 class="episode-title">The End</h1>
            </div>
        `;

        return slide;
    }

    // Create episode slide
    function createSlide(story, index) {
        const slide = document.createElement('div');
        slide.className = 'episode-slide';
        slide.dataset.index = index;

        const imgSrc = story.image || playlist.image;

        slide.innerHTML = `
            <img class="episode-bg" src="${imgSrc}" alt="">
            <div class="episode-overlay"></div>
            <div class="tap-area"></div>
            <button class="center-play-btn" aria-label="Play">${icons.play}</button>
            <div class="episode-content">
                <div class="show-title">${story.showTitle || playlist.title}</div>
                <h1 class="episode-title">${story.title}</h1>
            </div>
            <div class="player-section">
                <div class="player-controls">
                    <button class="control-btn rewind-btn" aria-label="Rewind 10 seconds">${icons.rewind}</button>
                    <button class="control-btn forward-btn" aria-label="Forward 10 seconds">${icons.forward}</button>
                </div>
                <div class="progress-section">
                    <span class="time time-current">0:00</span>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="time time-remaining">-0:00</span>
                </div>
            </div>
            <audio preload="metadata" src="${story.audioUrl}"></audio>
        `;

        return slide;
    }

    // Update Media Session metadata
    function updateMediaSession(story, index) {
        if (!('mediaSession' in navigator)) return;

        const imgSrc = story.image || playlist.image;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: story.title,
            artist: story.showTitle || playlist.title,
            album: playlist.title,
            artwork: [
                { src: imgSrc, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        // Handle media controls
        navigator.mediaSession.setActionHandler('play', () => {
            if (currentAudio) {
                currentAudio.play();
                isPlaying = true;
                const slide = document.querySelector(`.episode-slide[data-index="${currentIndex}"]`);
                if (slide) updatePlayButton(slide, true);
            }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            if (currentAudio) {
                currentAudio.pause();
                isPlaying = false;
                const slide = document.querySelector(`.episode-slide[data-index="${currentIndex}"]`);
                if (slide) updatePlayButton(slide, false);
            }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (currentIndex > 0) {
                goToSlide(currentIndex - 1, isPlaying);
            }
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (currentIndex < playlist.stories.length - 1) {
                goToSlide(currentIndex + 1, isPlaying);
            }
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (currentAudio && details.seekTime !== undefined) {
                currentAudio.currentTime = details.seekTime;
            }
        });
    }

    // Setup player for a slide
    function setupPlayer(slide) {
        const audio = slide.querySelector('audio');
        const centerPlayBtn = slide.querySelector('.center-play-btn');
        const tapArea = slide.querySelector('.tap-area');
        const rewindBtn = slide.querySelector('.rewind-btn');
        const forwardBtn = slide.querySelector('.forward-btn');
        const progressBar = slide.querySelector('.progress-bar');
        const progressFill = slide.querySelector('.progress-fill');
        const timeCurrent = slide.querySelector('.time-current');
        const timeRemaining = slide.querySelector('.time-remaining');

        function togglePlayback() {
            if (currentAudio && currentAudio !== audio) {
                currentAudio.pause();
                updatePlayButton(currentAudio.closest('.episode-slide'), false);
            }

            if (audio.paused) {
                audio.play();
                isPlaying = true;
                currentAudio = audio;
                updatePlayButton(slide, true);
            } else {
                audio.pause();
                isPlaying = false;
                updatePlayButton(slide, false);
            }
        }

        // Play/Pause from center button
        centerPlayBtn.addEventListener('click', togglePlayback);

        // Tap anywhere to toggle
        tapArea.addEventListener('click', togglePlayback);

        // Rewind 10s
        rewindBtn.addEventListener('click', () => {
            audio.currentTime = Math.max(0, audio.currentTime - 10);
        });

        // Forward 10s
        forwardBtn.addEventListener('click', () => {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        });

        // Time update
        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            timeCurrent.textContent = formatTime(audio.currentTime);
            timeRemaining.textContent = formatTime(audio.currentTime - audio.duration);
        });

        // Loaded metadata
        audio.addEventListener('loadedmetadata', () => {
            timeRemaining.textContent = formatTime(-audio.duration);
        });

        // Seek
        function seek(clientX) {
            const rect = progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            if (audio.duration) {
                audio.currentTime = percent * audio.duration;
            }
        }

        progressBar.addEventListener('click', (e) => seek(e.clientX));

        let isSeeking = false;
        progressBar.addEventListener('touchstart', (e) => {
            isSeeking = true;
            seek(e.touches[0].clientX);
        }, { passive: true });

        progressBar.addEventListener('touchmove', (e) => {
            if (isSeeking) seek(e.touches[0].clientX);
        }, { passive: true });

        progressBar.addEventListener('touchend', () => {
            isSeeking = false;
        });

        // Ended - go to next or end slide
        audio.addEventListener('ended', () => {
            updatePlayButton(slide, false);
            if (currentIndex < playlist.stories.length - 1) {
                // Go to next episode
                goToSlide(currentIndex + 1, true);
            } else {
                // Go to end slide
                goToSlide(playlist.stories.length, false);
            }
        });
    }

    function updatePlayButton(slide, playing) {
        const centerPlayBtn = slide.querySelector('.center-play-btn');
        if (!centerPlayBtn) return; // Exit if no play button (intro/end slides)

        if (playing) {
            centerPlayBtn.innerHTML = icons.wave;
        } else {
            centerPlayBtn.innerHTML = icons.play;
        }
    }

    // Swipe handling
    let touchStartX = 0;
    let touchCurrentX = 0;
    let isSwiping = false;

    function setupSwipe(container) {
        container.addEventListener('touchstart', (e) => {
            // Ignore if touching progress bar
            if (e.target.closest('.progress-section')) return;

            touchStartX = e.touches[0].clientX;
            touchCurrentX = touchStartX;
            isSwiping = true;

            const currentSlide = container.querySelector(`.episode-slide[data-index="${currentIndex}"]`);
            if (currentSlide) currentSlide.classList.add('swiping');
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;

            touchCurrentX = e.touches[0].clientX;
            const diff = touchCurrentX - touchStartX;

            const currentSlide = container.querySelector(`.episode-slide[data-index="${currentIndex}"]`);
            if (currentSlide) {
                currentSlide.style.transform = `translateX(${diff}px)`;
            }
        }, { passive: true });

        container.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false;

            const diff = touchCurrentX - touchStartX;
            const threshold = window.innerWidth * 0.25;

            const currentSlide = container.querySelector(`.episode-slide[data-index="${currentIndex}"]`);
            if (currentSlide) {
                currentSlide.classList.remove('swiping');
                currentSlide.style.transform = '';
            }

            // Allow swiping one past the last episode to reach "The End" slide
            if (diff < -threshold && currentIndex < playlist.stories.length) {
                // Swipe left - next (continue playing if was playing)
                goToSlide(currentIndex + 1, isPlaying);
            } else if (diff > threshold && currentIndex > -1) {
                // Swipe right - previous (continue playing if was playing)
                goToSlide(currentIndex - 1, isPlaying && currentIndex > 0);
            }
        });

        // Handle intro slide tap using event delegation
        container.addEventListener('click', (e) => {
            // Check if click is on intro slide or its children
            const introSlide = e.target.closest('.intro-slide');
            if (introSlide && currentIndex === -1 && playlist.stories.length > 0) {
                goToSlide(0, true);
            }
        });
    }

    function goToSlide(newIndex, autoPlay = false) {
        const container = document.getElementById('player-container');
        const oldSlide = container.querySelector(`.episode-slide[data-index="${currentIndex}"]`);

        // Stop current audio
        if (currentAudio) {
            currentAudio.pause();
            if (oldSlide) updatePlayButton(oldSlide, false);
        }

        // Create new slide if needed
        let newSlide = container.querySelector(`.episode-slide[data-index="${newIndex}"]`);
        if (!newSlide) {
            if (newIndex === -1) {
                newSlide = createIntroSlide();
            } else if (newIndex === playlist.stories.length) {
                // End slide
                newSlide = createEndSlide();
            } else {
                newSlide = createSlide(playlist.stories[newIndex], newIndex);
                setupPlayer(newSlide);
            }
            newSlide.classList.add(newIndex > currentIndex ? 'next' : 'prev');
            container.appendChild(newSlide);
            // Force reflow
            newSlide.offsetHeight;
        }

        // Animate
        if (oldSlide) {
            oldSlide.classList.add(newIndex > currentIndex ? 'prev' : 'next');
        }
        newSlide.classList.remove('prev', 'next');

        currentIndex = newIndex;

        // Update media session for story slides (not intro or end slides)
        if (newIndex >= 0 && newIndex < playlist.stories.length) {
            updateMediaSession(playlist.stories[newIndex], newIndex);
        }

        // Auto-play if requested
        if (autoPlay && newIndex >= 0) {
            const audio = newSlide.querySelector('audio');
            audio.play();
            currentAudio = audio;
            isPlaying = true;
            updatePlayButton(newSlide, true);
        }

        // Clean up old slides after animation (keep intro slide only)
        setTimeout(() => {
            container.querySelectorAll('.episode-slide').forEach(slide => {
                const idx = parseInt(slide.dataset.index);
                const isIntro = slide.dataset.isIntro === 'true';
                // Keep current slide and intro slide (end slide index can change with playlist)
                if (idx !== currentIndex && !isIntro) {
                    slide.remove();
                }
            });
        }, 350);
    }

    // Build shows menu
    function buildShowsMenu() {
        const showsGrid = document.getElementById('shows-grid');
        showsGrid.innerHTML = '';

        // Add "All Shows" option
        const allShowsItem = document.createElement('div');
        allShowsItem.className = 'show-item';
        allShowsItem.innerHTML = `
            <img class="show-image" src="cover.png" alt="All Shows">
            <div class="show-name">All Shows</div>
        `;
        allShowsItem.addEventListener('click', () => selectShow(null));
        showsGrid.appendChild(allShowsItem);

        // Add individual shows
        playlist.shows.forEach(show => {
            const showItem = document.createElement('div');
            showItem.className = 'show-item';
            showItem.innerHTML = `
                <img class="show-image" src="${show.image}" alt="${show.title}">
                <div class="show-name">${show.title}</div>
            `;
            showItem.addEventListener('click', () => selectShow(show.id));
            showsGrid.appendChild(showItem);
        });
    }

    // Select show and filter playlist
    function selectShow(showId) {
        filterPlaylist(showId);
        closeShowsMenu();

        // Reset to intro and start playing first episode
        currentIndex = -1;
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        isPlaying = false;

        // Clear player and go to first episode
        const container = document.getElementById('player-container');
        container.innerHTML = '';
        const introSlide = createIntroSlide();
        container.appendChild(introSlide);

        // Auto-advance to first episode and play
        setTimeout(() => {
            if (playlist.stories.length > 0) {
                goToSlide(0, true);
            }
        }, 300);
    }

    // Open/close shows menu
    function openShowsMenu() {
        document.getElementById('shows-menu').classList.add('active');
        buildShowsMenu();
    }

    function closeShowsMenu() {
        document.getElementById('shows-menu').classList.remove('active');
    }

    // Render
    function render() {
        const container = document.getElementById('player-container');

        // Start with intro slide
        const introSlide = createIntroSlide();
        container.appendChild(introSlide);
        setupSwipe(container);

        container.classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');

        // Show menu button
        const menuBtn = document.getElementById('menu-btn');
        menuBtn.classList.remove('hidden');

        // Setup menu button
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openShowsMenu();
        });
        document.getElementById('close-menu-btn').addEventListener('click', closeShowsMenu);
    }

    // Show error
    function showError(message) {
        document.getElementById('loading').classList.add('hidden');
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    // Initialize
    async function init() {
        try {
            await populatePlaylist();
            render();
        } catch (error) {
            showError(`Error loading stories: ${error.message}`);
        }
    }

    init();
})();
