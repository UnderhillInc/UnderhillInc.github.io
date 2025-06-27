document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const config = {
        apiKeys: {
            news: '49b135654e17bcdff699bb810e7d3686',
            weather: 'f12b4a245bdffefc7f8d909fbae0f1b1',
            flights: 'd355638cb87371016b1ee79f42fa6f2d'
        },
        proxyUrl: 'https://api.allorigins.win/raw?url=',
        refreshInterval: 900000, // 15 minutes
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
        newsColumns: document.getElementById('newspaper-columns')
    };

    // --- API FETCHING LOGIC ---

    /**
     * Fetches data from a given URL, prepending the proxy to avoid CORS issues.
     * @param {string} url - The API URL to fetch.
     * @returns {Promise<any>} - The JSON response from the API.
     */
    async function fetchData(url) {
        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`${config.proxyUrl}${encodedUrl}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
        return response.json();
    }

    /**
     * Fetches and displays weather for a given location (e.g., postcode or city).
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

            // Map weather description to Weather Icons class
            const iconClass = getWeatherIconClass(current.weather_code, current.is_day);
            elements.weatherIcon.classList.add('wi-day-sunny'); // Placeholder
            elements.weatherIcon.className = `wi ${iconClass}`;
            
            elements.weatherContent.innerHTML = `
                <strong>${location.name}</strong><br>
                ${current.temperature}°C, Feels Like ${current.feelslike}°C<br>
                ${current.weather_descriptions[0]}<br>
                Wind: ${current.wind_speed}km/h ${current.wind_dir}
            `;
        } catch (error) {
            console.error("Weather fetch failed:", error);
            showError(elements.weatherContent, 'WEATHER UNAVAILABLE');
            elements.weatherIcon.className = 'wi wi-na'; // "Not Available" icon
        }
    }

    /**
     * Maps weatherstack API weather codes to Weather Icons classes.
     * @param {number} code - The weather code from the API.
     * @param {string} is_day - 'yes' or 'no' from the API.
     * @returns {string} The corresponding Weather Icons class.
     */
    function getWeatherIconClass(code, is_day = 'yes') {
        const time = is_day === 'yes' ? 'day' : 'night';
        const iconMapping = {
            113: `wi-${time}-sunny`, // Clear/Sunny
            116: `wi-${time}-cloudy`, // Partly Cloudy
            119: 'wi-cloudy', // Cloudy
            122: 'wi-cloudy-gusts', // Overcast
            143: `wi-${time}-fog`, // Mist
            176: `wi-${time}-showers`, // Patchy rain
            179: `wi-${time}-snow`, // Patchy snow
            182: `wi-${time}-sleet`, // Patchy sleet
            200: `wi-${time}-thunderstorm`, // Thundery outbreaks
            227: 'wi-snow-wind', // Blowing snow
            230: 'wi-snow', // Blizzard
            248: 'wi-fog', // Fog
            260: 'wi-fog', // Freezing fog
            263: `wi-${time}-sprinkle`, // Patchy light drizzle
            266: `wi-sprinkle`, // Light drizzle
            281: `wi-sleet`, // Freezing drizzle
            293: `wi-showers`, // Patchy light rain
            296: `wi-showers`, // Light rain
            299: `wi-rain`, // Moderate rain at times
            302: 'wi-rain', // Moderate rain
            305: `wi-rain-wind`, // Heavy rain at times
            308: 'wi-rain', // Heavy rain
            323: `wi-${time}-sleet`, // Patchy light snow
            326: `wi-sleet`, // Light snow
            329: `wi-snow`, // Patchy moderate snow
            332: 'wi-snow', // Moderate snow
            335: 'wi-snow-wind', // Patchy heavy snow
            338: 'wi-snow', // Heavy snow
            350: 'wi-sleet', // Ice pellets
            353: `wi-${time}-showers`, // Light rain shower
            356: `wi-showers`, // Moderate or heavy rain shower
            359: 'wi-rain', // Torrential rain shower
            368: `wi-${time}-sleet`, // Light sleet showers
            371: 'wi-sleet', // Moderate or heavy sleet showers
            386: `wi-${time}-storm-showers`, // Patchy light rain with thunder
            389: 'wi-thunderstorm', // Moderate or heavy rain with thunder
            392: `wi-${time}-snow-thunderstorm`, // Patchy light snow with thunder
            395: 'wi-snow-thunderstorm', // Moderate or heavy snow with thunder
        };
        return iconMapping[code] || 'wi-na'; // Default to "Not Available"
    }


    /**
     * Fetches and displays flight data from London Heathrow (LHR).
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
     * Fetches general news and groups it by the publishing source.
     */
    async function updateNews() {
        elements.newsColumns.innerHTML = `<div class="loading-message">Fetching headlines... <span class="blinking-cursor">_</span></div>`;
        try {
            // Fetch a larger batch of general news from the UK
            const url = `https://gnews.io/api/v4/top-headlines?apikey=${config.apiKeys.news}&category=general&country=gb&max=20`;
            const data = await fetchData(url);

            if (!data.articles || data.articles.length === 0) {
                showError(elements.newsColumns, 'No headlines could be retrieved.');
                return;
            }

            // Group articles by their source name
            const articlesBySource = data.articles.reduce((acc, article) => {
                const sourceName = article.source.name || 'Unknown Source';
                if (!acc[sourceName]) {
                    acc[sourceName] = [];
                }
                acc[sourceName].push(article);
                return acc;
            }, {});

            elements.newsColumns.innerHTML = ''; // Clear loading message
            
            let pageCounter = 101;
            // Create and append a section for each news source
            for (const [sourceName, articles] of Object.entries(articlesBySource)) {
                const section = document.createElement('section');
                section.className = 'news-outlet';

                const h2 = document.createElement('h2');
                h2.innerHTML = `<span>${sourceName}</span> <span>p.${pageCounter++}</span>`;
                
                const ul = document.createElement('ul');
                articles.forEach((article, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="headline-number">${index + 1}.</span>
                        <span class="headline-text">${article.title} <a href="${article.url}" target="_blank" rel="noopener noreferrer">-&gt;</a></span>`;
                    ul.appendChild(li);
                });

                section.appendChild(h2);
                section.appendChild(ul);
                elements.newsColumns.appendChild(section);
            }

        } catch (error) {
            console.error("News fetch failed:", error);
            showError(elements.newsColumns, 'NEWS FEED UNAVAILABLE');
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

    /**
     * Main function to fetch all data sources.
     */
    function fetchAllData() {
        elements.footerText.textContent = "STATUS: FETCHING LATEST DATA...";
        Promise.allSettled([
            updateNews(),
            updateWeather(),
            updateFlights()
        ]).then(() => {
            elements.footerText.textContent = "STATUS: ONLINE. Last update: " + new Date().toLocaleTimeString('en-GB');
        });
    }

    /**
     * Set up event listeners and initial state.
     */
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        elements.musicControl.addEventListener('click', () => {
             if(elements.audio.src.includes('#')) {
                alert("To enable music, please edit the HTML and replace the '#' in the <audio> tag's src attribute with a direct link to an audio file (.mp3, .ogg, etc.).");
                return;
            }
            const isPlaying = elements.audio.paused;
            if (isPlaying) {
                elements.audio.play().catch(e => console.error("Audio play failed", e));
            } else {
                elements.audio.pause();
            }
            elements.musicControl.textContent = isPlaying ? 'MUSIC ON' : 'MUSIC OFF';
        });

        fetchAllData();
        setInterval(fetchAllData, config.refreshInterval);
    }

    // Start the application
    init();
});
