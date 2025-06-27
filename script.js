document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const config = {
        apiKeys: {
            news: '49b135654e17bcdff699bb810e7d3686',
            weather: 'f12b4a245bdffefc7f8d909fbae0f1b1',
            flights: 'd355638cb87371016b1ee79f42fa6f2d'
        },
        // Using a reliable proxy to prevent CORS errors.
        proxyUrl: 'https://thingproxy.freeboard.io/fetch/',
    };

    // --- DOM ELEMENT SELECTORS ---
    const elements = {
        clock: document.getElementById('clock'),
        footerText: document.getElementById('footer-text'),
        musicControl: document.getElementById('music-control'),
        audio: document.getElementById('background-music'),
        weatherIcon: document.getElementById('weather-icon'),
        weatherContent: document.getElementById('weather-content'),
        flightsList: document.getElementById('flights-list'),
        newsColumn: document.getElementById('main-news-column')
    };

    /**
     * Fetches data from a given URL via a CORS proxy.
     * @param {string} url - The API URL to fetch.
     * @returns {Promise<any>} - The JSON response from the API.
     */
    async function fetchData(url) {
        // The proxy expects the raw URL of the API endpoint.
        const response = await fetch(`${config.proxyUrl}${url}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
        return response.json();
    }

    /**
     * Fetches and displays weather for Peterlee (postcode SR8).
     */
    async function updateWeather() {
        showLoading(elements.weatherContent);
        elements.weatherIcon.className = 'wi'; // Reset icon
        try {
            const url = `http://api.weatherstack.com/current?access_key=${config.apiKeys.weather}&query=SR8`;
            const data = await fetchData(url);

            if (data.success === false || !data.current) {
                throw new Error(data.error?.info || 'Invalid weather data format.');
            }
            const { location, current } = data;
            
            elements.weatherIcon.className = `wi ${getWeatherIconClass(current.weather_code, current.is_day)}`;
            elements.weatherContent.innerHTML = `
                <strong>${location.name}</strong><br>
                ${current.temperature}°C, Feels Like ${current.feelslike}°C<br>
                ${current.weather_descriptions[0]}<br>
                Wind: ${current.wind_speed}km/h ${current.wind_dir}
            `;
        } catch (error) {
            console.error("Weather fetch failed:", error);
            showError(elements.weatherContent, 'WEATHER UNAVAILABLE');
            elements.weatherIcon.className = 'wi wi-na';
        }
    }

    /**
     * Maps weatherstack API codes to Weather Icons class names.
     * @param {number} code - The weather code from the API.
     * @returns {string} The corresponding Weather Icons class.
     */
    function getWeatherIconClass(code) {
        const iconMapping = {
            113: 'wi-day-sunny', 116: 'wi-day-cloudy', 119: 'wi-cloudy', 122: 'wi-cloudy-gusts',
            143: 'wi-day-fog', 176: 'wi-day-showers', 179: 'wi-day-snow', 182: 'wi-day-sleet',
            200: 'wi-day-thunderstorm', 227: 'wi-snow-wind', 230: 'wi-snow', 248: 'wi-fog',
            260: 'wi-fog', 263: 'wi-day-sprinkle', 266: 'wi-sprinkle', 281: 'wi-sleet',
            293: 'wi-showers', 296: 'wi-showers', 299: 'wi-rain', 302: 'wi-rain',
            305: 'wi-rain-wind', 308: 'wi-rain', 323: 'wi-day-sleet', 326: 'wi-sleet',
            329: 'wi-snow', 332: 'wi-snow', 335: 'wi-snow-wind', 338: 'wi-snow',
            350: 'wi-sleet', 353: 'wi-day-showers', 356: 'wi-showers', 359: 'wi-rain',
            368: 'wi-day-sleet', 371: 'wi-sleet', 386: 'wi-day-storm-showers',
            389: 'wi-thunderstorm', 392: 'wi-day-snow-thunderstorm', 395: 'wi-snow-thunderstorm',
        };
        return iconMapping[code] || 'wi-na';
    }

    /**
     * Fetches and displays flight departures from London Heathrow (LHR).
     */
    async function updateFlights() {
        showLoading(elements.flightsList);
        try {
            const url = `http://api.aviationstack.com/v1/flights?access_key=${config.apiKeys.flights}&dep_iata=LHR&flight_status=scheduled&limit=8`;
            const data = await fetchData(url);

            if (!data.data || data.data.length === 0) {
                showError(elements.flightsList, 'No scheduled flights found.');
                return;
            }
            elements.flightsList.innerHTML = '';
            data.data.forEach(flight => {
                const li = document.createElement('li');
                const flightNo = flight.flight.iata || 'N/A';
                const destination = flight.arrival.iata || 'N/A';
                const time = new Date(flight.departure.scheduled).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                
                li.innerHTML = `<span style="color:var(--teletext-yellow)">${time}</span> ${flightNo} to ${destination} - <span style="color:var(--teletext-cyan)">Scheduled</span>`;
                elements.flightsList.appendChild(li);
            });
        } catch (error) {
            console.error("Flights fetch failed:", error);
            showError(elements.flightsList, 'FLIGHT DATA UNAVAILABLE');
        }
    }
    
    /**
     * Fetches general news, displays a lead story, and groups the rest by outlet.
     */
    async function updateNews() {
        try {
            const url = `https://gnews.io/api/v4/top-headlines?apikey=${config.apiKeys.news}&category=general&country=gb&max=15`;
            const data = await fetchData(url);

            if (!data.articles || data.articles.length === 0) {
                showError(elements.newsColumn, 'No headlines could be retrieved.');
                return;
            }

            elements.newsColumn.innerHTML = ''; // Clear loading message

            // 1. Create and display the Lead Story
            const leadArticle = data.articles[0];
            if (leadArticle) {
                const leadStoryDiv = document.createElement('div');
                leadStoryDiv.className = 'lead-story';
                leadStoryDiv.innerHTML = `
                    <div class="lead-story-header">LEAD STORY</div>
                    <div class="lead-story-title">${leadArticle.title}</div>
                    <div class="lead-story-description">${leadArticle.description || ''} <a href="${leadArticle.url}" target="_blank" rel="noopener noreferrer">-&gt; more</a></div>
                `;
                elements.newsColumn.appendChild(leadStoryDiv);
            }

            // 2. Group the rest of the articles by source
            const otherArticles = data.articles.slice(1);
            const articlesBySource = otherArticles.reduce((acc, article) => {
                const sourceName = article.source.name || 'Unknown Source';
                if (!acc[sourceName]) acc[sourceName] = [];
                acc[sourceName].push(article);
                return acc;
            }, {});

            // 3. Create and append a section for each news source
            for (const [sourceName, articles] of Object.entries(articlesBySource)) {
                const section = document.createElement('section');
                section.className = 'news-outlet';
                const h2 = document.createElement('h2');
                h2.textContent = sourceName;
                
                const ul = document.createElement('ul');
                articles.forEach((article, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="headline-number">${index + 1}</div>
                        <div class="headline-text">${article.title} <a href="${article.url}" target="_blank" rel="noopener noreferrer">-&gt;</a></div>`;
                    ul.appendChild(li);
                });

                section.appendChild(h2);
                section.appendChild(ul);
                elements.newsColumn.appendChild(section);
            }

        } catch (error) {
            console.error("News fetch failed:", error);
            showError(elements.newsColumn, 'NEWS FEED UNAVAILABLE. CHECK CONSOLE.');
        }
    }

    // --- DOM MANIPULATION & UTILITIES ---
    function showLoading(element) {
        if (!element) return;
        element.innerHTML = `<span class="loading-message">Loading...<span class="blinking-cursor">_</span></span>`;
    }

    function showError(element, message) {
        if (!element) return;
        element.innerHTML = `<span class="error-message">${message}</span>`;
    }

    function updateClock() {
        elements.clock.textContent = new Date().toLocaleTimeString('en-GB');
    }

    // --- INITIALIZATION ---
    function init() {
        // Start the clock
        updateClock();
        setInterval(updateClock, 1000);

        // Setup music control
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

        // Fetch all data ONCE on page load
        elements.footerText.textContent = "STATUS: FETCHING LATEST DATA...";
        Promise.allSettled([
            updateNews(),
            updateWeather(),
            updateFlights()
        ]).then(() => {
            elements.footerText.textContent = "STATUS: ONLINE. Last update: " + new Date().toLocaleTimeString('en-GB');
        });
    }

    // Start the application
    init();
});
