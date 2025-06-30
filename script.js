document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const config = {
        rssFeeds: {
            news: [
                { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
                { name: 'Reuters UK', url: 'http://feeds.reuters.com/reuters/UKTopNews' },
                { name: 'The Guardian', url: 'https://www.theguardian.com/uk/rss' },
                { name: 'Ars Technica', url: 'http://feeds.arstechnica.com/arstechnica/index' },
            ],
            tv: { url: 'https://showrss.info/user/290448.rss?magnets=true&namespaces=false&name=clean&quality=null&re=null' },
            weather: { url: 'https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/ne' },
            travelTours: { url: 'https://www.travelagentcentral.com/rss/tours/xml' },
            travelHotels: { url: 'https://www.travelagentcentral.com/rss/hotels/xml' },
        },
        rssToJsonService: 'https://api.rss2json.com/v1/api.json?rss_url=',
    };

    // --- PAGE ROUTER ---
    // This function checks which page is currently loaded and calls the appropriate functions.
    function pageRouter() {
        updateClock(); // Universal for all pages
        
        if (document.getElementById('news-page')) {
            updateNews();
        }
        if (document.getElementById('travel-page')) {
            updateTravel();
        }
        if (document.getElementById('tv-page')) {
            updateTvListings();
        }
        if (document.getElementById('weather-page')) {
            updateWeather();
        }
        // The index and channels pages are static and don't require JS data loading.
    }

    // --- RSS FETCHER ---
    async function fetchRss(feedUrl) {
        const encodedUrl = encodeURIComponent(feedUrl);
        const response = await fetch(`${config.rssToJsonService}${encodedUrl}`);
        if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
        return response.json();
    }

    // --- PAGE-SPECIFIC UPDATE FUNCTIONS ---

    async function updateNews() {
        const container = document.getElementById('main-news-column');
        try {
            const feedPromises = config.rssFeeds.news.map(feed => fetchRss(feed.url).catch(e => null));
            const results = await Promise.all(feedPromises);

            let allArticles = [];
            results.forEach((result, index) => {
                if (result && result.status === 'ok') {
                    result.items.forEach(item => {
                        item.sourceName = config.rssFeeds.news[index].name;
                        allArticles.push(item);
                    });
                }
            });

            if (allArticles.length === 0) throw new Error('No articles retrieved.');
            
            allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            container.innerHTML = '';

            // Render Lead Story
            const leadArticle = allArticles[0];
            const leadStoryDiv = document.createElement('div');
            leadStoryDiv.className = 'lead-story';
            const cleanDescription = leadArticle.description.replace(/<[^>]*>?/gm, '');
            leadStoryDiv.innerHTML = `
                <div class="lead-story-header">LEAD STORY - ${leadArticle.sourceName}</div>
                <div class="lead-story-title">${leadArticle.title}</div>
                <div class="lead-story-description">${cleanDescription.substring(0, 200)}... <a href="${leadArticle.link}" target="_blank" rel="noopener noreferrer">-&gt; more</a></div>`;
            container.appendChild(leadStoryDiv);

            // Group and render other articles
            const otherArticles = allArticles.slice(1);
            const articlesBySource = otherArticles.reduce((acc, article) => {
                if (!acc[article.sourceName]) acc[article.sourceName] = [];
                acc[article.sourceName].push(article);
                return acc;
            }, {});

            for (const [sourceName, articles] of Object.entries(articlesBySource)) {
                const section = document.createElement('section');
                section.className = 'news-outlet';
                section.innerHTML = `<h2>${sourceName}</h2>`;
                const ul = document.createElement('ul');
                articles.slice(0, 3).forEach((article, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="headline-number">${index + 1}</div><div class="headline-text">${article.title} <a href="${article.link}" target="_blank" rel="noopener noreferrer">-&gt;</a></div>`;
                    ul.appendChild(li);
                });
                section.appendChild(ul);
                container.appendChild(section);
            }
        } catch (error) {
            showError(container, 'NEWS FEED UNAVAILABLE.');
            console.error("News update failed:", error);
        }
    }

    async function updateTravel() {
        const toursList = document.getElementById('travel-list-tours');
        const hotelsList = document.getElementById('travel-list-hotels');
        showLoading(toursList);
        showLoading(hotelsList);

        try {
            const toursData = await fetchRss(config.rssFeeds.travelTours.url);
            toursList.innerHTML = '';
            if (toursData.status === 'ok') {
                toursData.items.slice(0, 4).forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `${item.title.substring(0, 50)}... <span>-&gt;</span>`;
                    toursList.appendChild(li);
                });
            } else {
                showError(toursList, 'Tour feed unavailable.');
            }
        } catch (e) {
            showError(toursList, 'Tour feed error.');
        }

        try {
            const hotelsData = await fetchRss(config.rssFeeds.travelHotels.url);
            hotelsList.innerHTML = '';
            if (hotelsData.status === 'ok') {
                hotelsData.items.slice(0, 4).forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `${item.title.substring(0, 50)}... <span>-&gt;</span>`;
                    hotelsList.appendChild(li);
                });
            } else {
                showError(hotelsList, 'Hotel feed unavailable.');
            }
        } catch (e) {
            showError(hotelsList, 'Hotel feed error.');
        }
    }

    async function updateTvListings() {
        const container = document.getElementById('tv-listings-container');
        try {
            const data = await fetchRss(config.rssFeeds.tv.url);
            if (data.status !== 'ok' || data.items.length === 0) throw new Error('TV feed unavailable.');
            
            container.innerHTML = '';
            data.items.slice(0, 10).forEach(item => {
                const div = document.createElement('div');
                div.className = 'tv-listing';
                div.innerHTML = `<div class="tv-listing-title">${item.title}</div>`;
                container.appendChild(div);
            });
        } catch (error) {
            showError(container, 'TV LISTINGS UNAVAILABLE.');
            console.error("TV update failed:", error);
        }
    }

    async function updateWeather() {
        const container = document.getElementById('weather-warnings-container');
        try {
            const data = await fetchRss(config.rssFeeds.weather.url);
            if (data.status !== 'ok' || data.items.length === 0) {
                container.innerHTML = '<div class="weather-warning"><div class="weather-warning-title">No warnings in effect for North East England.</div></div>';
                return;
            }

            container.innerHTML = '';
            data.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'weather-warning';
                const cleanDescription = item.description.replace(/<[^>]*>?/gm, '');
                div.innerHTML = `
                    <div class="weather-warning-title">${item.title}</div>
                    <div class="weather-warning-description">${cleanDescription}</div>`;
                container.appendChild(div);
            });
        } catch (error) {
            showError(container, 'WEATHER WARNINGS UNAVAILABLE.');
            console.error("Weather update failed:", error);
        }
    }

    // --- UTILITIES ---
    function showLoading(element) {
        if (!element) return;
        element.innerHTML = `<li class="loading-message">Loading...<span class="blinking-cursor">_</span></li>`;
    }

    function showError(element, message) {
        if (!element) return;
        element.innerHTML = `<div class="error-message">${message}</div>`;
    }

    function updateClock() {
        const clockElement = document.getElementById('clock');
        if (clockElement) {
            setInterval(() => {
                clockElement.textContent = new Date().toLocaleTimeString('en-GB');
            }, 1000);
        }
    }

    // --- INITIALIZATION ---
    function init() {
        pageRouter(); // Run the correct functions for the current page
        
        const footer = document.querySelector('.page-footer');
        if (footer) {
             footer.insertAdjacentHTML('beforeend', '<button id="music-control">MUSIC OFF</button>');
             const musicControl = document.getElementById('music-control');
             const audio = document.createElement('audio');
             audio.id = 'background-music';
             audio.loop = true;
             document.body.appendChild(audio);

             musicControl.addEventListener('click', () => {
                 if(!audio.src) audio.src = "https://www.myinstants.com/media/sounds/ceefax-pages-from-history-opening-titles-1983.mp3";
                 const isPlaying = audio.paused;
                 if (isPlaying) audio.play().catch(e => console.error("Audio play failed", e));
                 else audio.pause();
                 musicControl.textContent = isPlaying ? 'MUSIC ON' : 'MUSIC OFF';
             });
        }
    }

    init();
});
