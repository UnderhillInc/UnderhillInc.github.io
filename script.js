document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const config = {
        // List of RSS feeds for the main news column.
        newsFeeds: [
            { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
            { name: 'Reuters UK', url: 'http://feeds.reuters.com/reuters/UKTopNews' },
            { name: 'The Guardian', url: 'https://www.theguardian.com/uk/rss' },
            { name: 'Ars Technica', url: 'http://feeds.arstechnica.com/arstechnica/index' },
            { name: 'TVLine', url: 'https://tvline.com/feed/' }
        ],
        // Separate feed for the sidebar TV listings.
        tvEpisodesFeed: { name: 'AniDB', url: 'https://anidb.net/rss/latest_episodes.xml' },
        // Using a reliable RSS-to-JSON converter service to bypass CORS.
        rssToJsonService: 'https://api.rss2json.com/v1/api.json?rss_url=',
    };

    // --- DOM ELEMENT SELECTORS ---
    const elements = {
        clock: document.getElementById('clock'),
        footerText: document.getElementById('footer-text'),
        musicControl: document.getElementById('music-control'),
        audio: document.getElementById('background-music'),
        newsColumn: document.getElementById('main-news-column'),
        tvEpisodesList: document.getElementById('tv-episodes-list')
    };

    /**
     * Fetches and parses an RSS feed using an external service.
     * @param {string} feedUrl - The URL of the RSS feed.
     * @returns {Promise<object>} - The parsed JSON response from the service.
     */
    async function fetchRss(feedUrl) {
        const encodedUrl = encodeURIComponent(feedUrl);
        const response = await fetch(`${config.rssToJsonService}${encodedUrl}`);
        if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
        }
        return response.json();
    }
    
    /**
     * Fetches news from all configured RSS feeds and renders them.
     */
    async function updateNews() {
        try {
            // Fetch all main news feeds concurrently.
            const feedPromises = config.newsFeeds.map(feed => 
                fetchRss(feed.url).catch(e => {
                    console.error(`Failed to fetch ${feed.name}:`, e);
                    return null; // Return null on failure to not break Promise.all
                })
            );
            const results = await Promise.all(feedPromises);

            let allArticles = [];
            results.forEach((result, index) => {
                if (result && result.status === 'ok') {
                    result.items.forEach(item => {
                        item.sourceName = config.newsFeeds[index].name;
                        allArticles.push(item);
                    });
                }
            });

            if (allArticles.length === 0) {
                showError(elements.newsColumn, 'No headlines could be retrieved.');
                return;
            }

            // Sort all articles by publication date, newest first.
            allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

            elements.newsColumn.innerHTML = ''; // Clear loading message

            // Create and display the Lead Story.
            const leadArticle = allArticles[0];
            if (leadArticle) {
                const leadStoryDiv = document.createElement('div');
                leadStoryDiv.className = 'lead-story';
                const cleanDescription = leadArticle.description.replace(/<[^>]*>?/gm, '');
                leadStoryDiv.innerHTML = `
                    <div class="lead-story-header">LEAD STORY - ${leadArticle.sourceName}</div>
                    <div class="lead-story-title">${leadArticle.title}</div>
                    <div class="lead-story-description">${cleanDescription.substring(0, 200)}... <a href="${leadArticle.link}" target="_blank" rel="noopener noreferrer">-&gt; more</a></div>
                `;
                elements.newsColumn.appendChild(leadStoryDiv);
            }

            // Group the rest of the articles by source.
            const otherArticles = allArticles.slice(1);
            const articlesBySource = otherArticles.reduce((acc, article) => {
                if (!acc[article.sourceName]) acc[article.sourceName] = [];
                acc[article.sourceName].push(article);
                return acc;
            }, {});

            // Create and append a section for each remaining news source.
            for (const [sourceName, articles] of Object.entries(articlesBySource)) {
                const section = document.createElement('section');
                section.className = 'news-outlet';
                const h2 = document.createElement('h2');
                h2.textContent = sourceName;
                
                const ul = document.createElement('ul');
                articles.slice(0, 4).forEach((article, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="headline-number">${index + 1}</div>
                        <div class="headline-text">${article.title} <a href="${article.link}" target="_blank" rel="noopener noreferrer">-&gt;</a></div>`;
                    ul.appendChild(li);
                });

                section.appendChild(h2);
                section.appendChild(ul);
                elements.newsColumn.appendChild(section);
            }

        } catch (error) {
            console.error("News processing failed:", error);
            showError(elements.newsColumn, 'NEWS FEED UNAVAILABLE. CHECK CONSOLE.');
        }
    }

    /**
     * Fetches and displays the latest TV episodes in the sidebar.
     */
    async function updateTvEpisodes() {
        showLoading(elements.tvEpisodesList);
        try {
            const data = await fetchRss(config.tvEpisodesFeed.url);
            if (data.status !== 'ok' || data.items.length === 0) {
                showError(elements.tvEpisodesList, 'Feed unavailable.');
                return;
            }

            elements.tvEpisodesList.innerHTML = ''; // Clear loading
            data.items.slice(0, 6).forEach(item => { // Show top 6
                const li = document.createElement('li');
                // Title format from AniDB is often "[Show] - [Episode Number]"
                // We'll try to split it for better formatting.
                const parts = item.title.split(' - ');
                const showName = parts[0];
                const episodeInfo = parts.length > 1 ? parts[1] : '';

                li.innerHTML = `<span class="episode-title">${showName}</span><br>- Ep ${episodeInfo}`;
                elements.tvEpisodesList.appendChild(li);
            });

        } catch (error) {
            console.error("TV Episodes fetch failed:", error);
            showError(elements.tvEpisodesList, 'EPISODE DATA UNAVAILABLE');
        }
    }

    // --- UTILITIES ---
    function showLoading(element) {
        if (!element) return;
        element.innerHTML = `<li class="loading-message">Loading...<span class="blinking-cursor">_</span></li>`;
    }

    function showError(element, message) {
        if (!element) return;
        element.innerHTML = `<li class="error-message">${message}</li>`;
    }

    function updateClock() {
        elements.clock.textContent = new Date().toLocaleTimeString('en-GB');
    }

    // --- INITIALIZATION ---
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        elements.musicControl.addEventListener('click', () => {
             if(elements.audio.src.includes('#')) {
                alert("To enable music, please edit the HTML and replace the '#' in the <audio> tag's src attribute with a direct link to an audio file (.mp3, .ogg, etc.).");
                return;
            }
            const isPlaying = elements.audio.paused;
            if (isPlaying) elements.audio.play().catch(e => console.error("Audio play failed", e));
            else elements.audio.pause();
            elements.musicControl.textContent = isPlaying ? 'MUSIC ON' : 'MUSIC OFF';
        });

        // Fetch all data ONCE on page load.
        elements.footerText.textContent = "STATUS: FETCHING LATEST DATA...";
        Promise.allSettled([
            updateNews(),
            updateTvEpisodes()
        ]).then(() => {
             elements.footerText.textContent = "STATUS: ONLINE. Last update: " + new Date().toLocaleTimeString('en-GB');
        });
    }

    // Start the application
    init();
});
