(function() {
    const API_BASE = 'https://api-dev.musedrops.com/shows';

    let episodes = [];
    let channelTitle = '';
    let channelImage = '';
    let currentIndex = -1; // Start at intro
    let currentAudio = null;
    let isPlaying = false;

    // SVG icons
    const icons = {
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        rewind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text x="12" y="15" font-size="7" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>',
        forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15" font-size="7" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>'
    };

    // Get show name from URL
    function getShowName() {
        const search = window.location.search;
        if (search && search.length > 1) {
            return search.substring(1);
        }
        return null;
    }

    // Format time
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.floor(Math.abs(seconds) % 60);
        const sign = seconds < 0 ? '-' : '';
        return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Parse RSS XML
    function parseRSS(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const channel = doc.querySelector('channel');
        if (!channel) throw new Error('Invalid RSS feed');

        const title = channel.querySelector('title')?.textContent || 'Untitled';
        const image = channel.querySelector('image url')?.textContent ||
                     channel.querySelector('itunes\\:image, image')?.getAttribute('href') || '';

        const items = channel.querySelectorAll('item');
        const episodeList = Array.from(items).map(item => {
            const itunesImage = item.querySelector('itunes\\:image')?.getAttribute('href') ||
                               item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || '';
            return {
                title: item.querySelector('title')?.textContent || 'Untitled',
                image: itunesImage,
                audioUrl: item.querySelector('enclosure')?.getAttribute('url') || ''
            };
        });

        return { title, image, episodes: episodeList };
    }

    // Create intro slide
    function createIntroSlide() {
        const slide = document.createElement('div');
        slide.className = 'episode-slide intro-slide';
        slide.dataset.index = -1;

        slide.innerHTML = `
            <img class="episode-bg" src="${channelImage}" alt="">
            <div class="episode-overlay"></div>
            <div class="episode-content">
                <h1 class="episode-title">${channelTitle}</h1>
                <div class="intro-subtitle">A Musedrops Production</div>
            </div>
            <div class="intro-hint">← Swipe left to start</div>
        `;

        return slide;
    }

    // Create episode slide
    function createSlide(episode, index) {
        const slide = document.createElement('div');
        slide.className = 'episode-slide';
        slide.dataset.index = index;

        const imgSrc = episode.image || channelImage;

        slide.innerHTML = `
            <img class="episode-bg" src="${imgSrc}" alt="">
            <div class="episode-overlay"></div>
            <div class="tap-area"></div>
            <button class="center-play-btn" aria-label="Play">${icons.play}</button>
            <div class="episode-content">
                <div class="show-title">${channelTitle}</div>
                <h1 class="episode-title">${episode.title}</h1>
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
            <audio preload="metadata" src="${episode.audioUrl}"></audio>
        `;

        return slide;
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

        // Ended - go to next
        audio.addEventListener('ended', () => {
            updatePlayButton(slide, false);
            if (currentIndex < episodes.length - 1) {
                goToSlide(currentIndex + 1, true);
            }
        });
    }

    function updatePlayButton(slide, playing) {
        const centerPlayBtn = slide.querySelector('.center-play-btn');
        if (playing) {
            centerPlayBtn.classList.add('hidden');
        } else {
            centerPlayBtn.classList.remove('hidden');
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

            if (diff < -threshold && currentIndex < episodes.length - 1) {
                // Swipe left - next (continue playing if was playing)
                goToSlide(currentIndex + 1, isPlaying);
            } else if (diff > threshold && currentIndex > -1) {
                // Swipe right - previous (continue playing if was playing)
                goToSlide(currentIndex - 1, isPlaying && currentIndex > 0);
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
            } else {
                newSlide = createSlide(episodes[newIndex], newIndex);
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

        // Auto-play if requested
        if (autoPlay) {
            const audio = newSlide.querySelector('audio');
            audio.play();
            currentAudio = audio;
            isPlaying = true;
            updatePlayButton(newSlide, true);
        }

        // Clean up old slides after animation
        setTimeout(() => {
            container.querySelectorAll('.episode-slide').forEach(slide => {
                const idx = parseInt(slide.dataset.index);
                if (idx !== currentIndex) {
                    slide.remove();
                }
            });
        }, 350);
    }

    // Render
    function render(data) {
        channelTitle = data.title;
        channelImage = data.image;
        episodes = data.episodes;

        const container = document.getElementById('player-container');

        // Start with intro slide
        const introSlide = createIntroSlide();
        container.appendChild(introSlide);
        setupSwipe(container);

        container.classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');
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
        const showName = getShowName();

        if (!showName) {
            showError('No show specified. Use ?show-name in the URL.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/${showName}/rss`);
            if (!response.ok) {
                throw new Error(`Failed to load RSS (${response.status})`);
            }

            const xml = await response.text();
            const data = parseRSS(xml);
            render(data);
        } catch (error) {
            showError(`Error loading podcast: ${error.message}`);
        }
    }

    init();
})();
