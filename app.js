(function() {
    const API_BASE = 'https://api-dev.musedrops.com/shows';

    let currentAudio = null;
    let currentPlayBtn = null;
    let episodes = [];
    let channelImage = '';

    // SVG icons (outline style)
    const playIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const pauseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

    // Get show name from URL
    function getShowName() {
        const search = window.location.search;
        if (search && search.length > 1) {
            return search.substring(1);
        }
        return null;
    }

    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Parse RSS XML
    function parseRSS(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const channel = doc.querySelector('channel');
        if (!channel) throw new Error('Invalid RSS feed');

        // Channel info
        const title = channel.querySelector('title')?.textContent || 'Untitled';
        const description = channel.querySelector('description')?.textContent || '';
        const image = channel.querySelector('image url')?.textContent ||
                     channel.querySelector('itunes\\:image, image')?.getAttribute('href') || '';

        // Episodes
        const items = channel.querySelectorAll('item');
        const episodeList = Array.from(items).map(item => {
            // Try multiple selectors for itunes:image (namespace handling varies)
            const itunesImage = item.querySelector('itunes\\:image')?.getAttribute('href') ||
                               item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
                               '';
            return {
                title: item.querySelector('title')?.textContent || 'Untitled',
                subtitle: item.querySelector('itunes\\:subtitle')?.textContent ||
                         item.getElementsByTagName('itunes:subtitle')[0]?.textContent ||
                         item.querySelector('description')?.textContent || '',
                image: itunesImage,
                audioUrl: item.querySelector('enclosure')?.getAttribute('url') || ''
            };
        });

        return {
            title,
            description,
            image,
            episodes: episodeList
        };
    }

    // Create episode card HTML
    function createEpisodeCard(episode, index) {
        const card = document.createElement('div');
        card.className = 'episode-card';
        card.dataset.index = index;

        const imgSrc = episode.image || channelImage;

        card.innerHTML = `
            <div class="episode-image-container">
                <img class="episode-image" src="${imgSrc}" alt="Episode artwork">
                <button class="play-btn" aria-label="Play">${playIcon}</button>
            </div>
            <div class="episode-content">
                <div class="episode-title">${episode.title}</div>
                <div class="episode-subtitle">${episode.subtitle}</div>
                <div class="player">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="time">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
            <audio preload="metadata" src="${episode.audioUrl}"></audio>
        `;

        setupPlayer(card, index);
        return card;
    }

    // Setup player controls
    function setupPlayer(card, index) {
        const audio = card.querySelector('audio');
        const playBtn = card.querySelector('.play-btn');
        const progressBar = card.querySelector('.progress-bar');
        const progressFill = card.querySelector('.progress-fill');
        const timeDisplay = card.querySelector('.time');

        // Play/Pause
        playBtn.addEventListener('click', () => {
            if (currentAudio && currentAudio !== audio) {
                currentAudio.pause();
                currentPlayBtn.innerHTML = playIcon;
            }

            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = pauseIcon;
                currentAudio = audio;
                currentPlayBtn = playBtn;
            } else {
                audio.pause();
                playBtn.innerHTML = playIcon;
            }
        });

        // Time update
        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        });

        // Loaded metadata
        audio.addEventListener('loadedmetadata', () => {
            timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });

        // Seek (click and touch)
        function seek(clientX) {
            const rect = progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            if (audio.duration) {
                audio.currentTime = percent * audio.duration;
            }
        }

        progressBar.addEventListener('click', (e) => seek(e.clientX));

        // Touch drag seeking
        let isSeeking = false;
        progressBar.addEventListener('touchstart', (e) => {
            isSeeking = true;
            seek(e.touches[0].clientX);
        }, { passive: true });

        progressBar.addEventListener('touchmove', (e) => {
            if (isSeeking) {
                seek(e.touches[0].clientX);
            }
        }, { passive: true });

        progressBar.addEventListener('touchend', () => {
            isSeeking = false;
        });

        // Ended - play next
        audio.addEventListener('ended', () => {
            playBtn.innerHTML = playIcon;
            progressFill.style.width = '0%';

            // Play next episode
            const nextIndex = index + 1;
            if (nextIndex < episodes.length) {
                const nextCard = document.querySelector(`.episode-card[data-index="${nextIndex}"]`);
                if (nextCard) {
                    nextCard.querySelector('.play-btn').click();
                }
            }
        });
    }

    // Render the page
    function render(data) {
        channelImage = data.image;
        episodes = data.episodes;

        // Header
        document.getElementById('channel-image').src = data.image;
        document.getElementById('channel-title').textContent = data.title;
        document.getElementById('channel-description').textContent = data.description;
        document.getElementById('header').classList.remove('hidden');

        // Episodes
        const container = document.getElementById('episodes');
        data.episodes.forEach((episode, index) => {
            container.appendChild(createEpisodeCard(episode, index));
        });
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
