// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- Initialize Firebase ---
let app, auth, db;
if (window.firebase) {
    app = window.firebase.initializeApp(firebaseConfig);
    auth = window.firebase.getAuth(app);
    db = window.firebase.getFirestore(app);
}


document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const GNEWS_API_KEY = '49b135654e17bcdff699bb810e7d3686';
    const HUMOR_API_KEY = '62a6af561a6a4b3fae853a6197816e59';

    // --- Common Page Elements ---
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('loginModal');
    const postModal = document.getElementById('postModal');
    const loginForm = document.getElementById('login-form');
    const postForm = document.getElementById('post-form');
    const cancelLoginBtn = document.getElementById('cancel-login');
    const cancelPostBtn = document.getElementById('cancel-post');
    const loginError = document.getElementById('login-error');
    const audio = document.getElementById('background-music');
    const muteBtn = document.getElementById('mute-btn');
    const volumeOnIcon = document.getElementById('volume-on-icon');
    const volumeOffIcon = document.getElementById('volume-off-icon');

    // --- Dynamic Content Elements ---
    const ipInfo = document.getElementById('ip-info');
    const locationInfo = document.getElementById('location-info');
    const timeInfo = document.getElementById('time-info');
    
    // --- Page-Specific Elements ---
    const newsFeed = document.getElementById('news-feed');
    const miscContent = document.getElementById('misc-content');
    const addPostBtn = document.getElementById('add-post-btn');

    /**
     * Updates the time display every second.
     */
    function updateTime() {
        const now = new Date();
        if (timeInfo) timeInfo.textContent = `Time: ${now.toLocaleString()}`;
    }

    /**
     * Fetches user's IP and Location data.
     */
    async function fetchSystemInfo() {
        if (!ipInfo || !locationInfo) return;
        try {
            const response = await fetch('https://ip-api.com/json');
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();
            ipInfo.textContent = `IP: ${data.query}`;
            locationInfo.textContent = `Location: ${data.city}, ${data.country}`;
        } catch (error) {
            console.error("Failed to fetch system info:", error);
            ipInfo.textContent = 'IP: UNKNOWN';
            locationInfo.textContent = 'Location: Peterlee, England'; // Fallback
        }
    }

    /**
     * Fetches top news headlines from GNews and injects memes.
     */
    async function fetchNews() {
        if (!newsFeed) return;
        const gnewsUrl = `https://gnews.io/api/v4/top-headlines?lang=en&token=${GNEWS_API_KEY}`;
        
        try {
            const newsResponse = await fetch(gnewsUrl);
            if (!newsResponse.ok) throw new Error(`GNews API Error: ${newsResponse.statusText}`);
            const newsData = await newsResponse.json();

            newsFeed.innerHTML = ''; // Clear loading message

            if (newsData.articles && newsData.articles.length > 0) {
                const articles = newsData.articles.slice(0, 10);
                
                for (let i = 0; i < articles.length; i++) {
                    const article = articles[i];
                    // Append the news article
                    const articleElement = document.createElement('div');
                    articleElement.className = 'news-article';
                    articleElement.innerHTML = `
                        <h3 class="font-bold text-lg text-teal-300">${article.title}</h3>
                        <p class="text-sm mt-1 text-gray-400">Source: ${article.source.name}</p>
                        <p class="mt-2 text-gray-300">${article.description}</p>
                        <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block">Read More >></a>
                    `;
                    newsFeed.appendChild(articleElement);

                    // Append a meme after every other article
                    if ((i + 1) % 2 === 0) {
                        try {
                            const memeUrl = `https://api.humorapi.com/memes/random?api-key=${HUMOR_API_KEY}&media-type=image&max-file-size=500000`;
                            const memeResponse = await fetch(memeUrl);
                            if (!memeResponse.ok) throw new Error('Meme API Error');
                            const memeData = await memeResponse.json();

                            const memeElement = document.createElement('div');
                            memeElement.className = 'post';
                            memeElement.innerHTML = `<img src="${memeData.url}" alt="Humor Break" style="max-width: 100%; margin-top: 1rem; border: 1px solid #a78bfa;">`;
                            newsFeed.appendChild(memeElement);
                        } catch (memeError) {
                            console.error("Could not fetch a meme:", memeError);
                        }
                    }
                }
            } else {
                 newsFeed.innerHTML = '<p>No articles found in data stream.</p>';
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
            newsFeed.innerHTML = '<p class="text-red-400">> CRITICAL ERROR: Could not load news feed. Check connection or API Key.</p>';
        }
    }
    
    /**
     * Renders posts from firestore to the misc page
     */
     function renderPosts(posts){
        miscContent.innerHTML = '';
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post';

            const textElement = document.createElement('p');
            textElement.className = 'text-gray-300';
            textElement.textContent = post.text;
            postElement.appendChild(textElement);

            if (post.imageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = post.imageUrl;
                imgElement.onerror = () => {
                    imgElement.alt = 'Image failed to load';
                    imgElement.src = `https://placehold.co/600x400/0d0221/2dd4bf?text=CORRUPT+DATA`;
                };
                postElement.appendChild(imgElement);
            }
            miscContent.appendChild(postElement);
        });
     }

    /**
     * Loads posts from Firestore.
     */
    async function loadPosts() {
        if (!miscContent || !db) return;
        
        const postsCol = window.firebase.collection(db, 'posts');
        window.firebase.onSnapshot(postsCol, (snapshot) => {
            const posts = [];
            snapshot.forEach(doc => posts.push(doc.data()));
            renderPosts(posts);
        });
    }


    /**
     * Updates UI elements based on the admin's login status from localStorage.
     */
    function updateAdminUI() {
        const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
        if (loginBtn && logoutBtn) {
            if (isLoggedIn) {
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
                if (addPostBtn) addPostBtn.classList.remove('hidden'); 
            } else {
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
                if (addPostBtn) addPostBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Handles the login form submission.
     */
    function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username === 'Admin' && password === 'Admin') {
            localStorage.setItem('isAdminLoggedIn', 'true');
            if(loginModal) loginModal.classList.add('hidden');
            if(loginForm) loginForm.reset();
            if(loginError) loginError.classList.add('hidden');
            updateAdminUI();
        } else {
            if(loginError) loginError.classList.remove('hidden');
        }
    }

    /**
     * Handles the logout button click.
     */
    function handleLogout() {
        localStorage.removeItem('isAdminLoggedIn');
        updateAdminUI();
    }

    /**
     * Handles submission of the 'Inject Data' form.
     */
    async function handlePostSubmit(event) {
        event.preventDefault();
        if (!miscContent || !db) return;

        const postText = document.getElementById('post-text').value;
        const postImageUrl = document.getElementById('post-image').value;

        try {
            await window.firebase.addDoc(window.firebase.collection(db, 'posts'), {
                text: postText,
                imageUrl: postImageUrl,
                createdAt: new Date()
            });
        } catch (error) {
            console.error("Error adding document: ", error);
        }

        if (postModal) postModal.classList.add('hidden');
        if (postForm) postForm.reset();
    }

    /**
     * Toggles the background music mute state.
     */
    function toggleMute() {
        if (!audio || !volumeOnIcon || !volumeOffIcon) return;
        audio.muted = !audio.muted;
        if (audio.muted) {
            volumeOnIcon.classList.add('hidden');
            volumeOffIcon.classList.remove('hidden');
        } else {
            volumeOnIcon.classList.remove('hidden');
            volumeOffIcon.classList.add('hidden');
        }
    }

    // --- Event Listeners ---
    if (loginBtn) loginBtn.addEventListener('click', () => {
        if (loginModal) loginModal.classList.remove('hidden');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (cancelLoginBtn) cancelLoginBtn.addEventListener('click', () => {
        if (loginModal) loginModal.classList.add('hidden');
        if (loginError) loginError.classList.add('hidden');
        if (loginForm) loginForm.reset();
    });
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    if (addPostBtn) addPostBtn.addEventListener('click', () => {
        if (postModal) postModal.classList.remove('hidden');
    });
    if (cancelPostBtn) cancelPostBtn.addEventListener('click', () => {
       if (postModal) postModal.classList.add('hidden');
       if (postForm) postForm.reset();
    });
    if (postForm) postForm.addEventListener('submit', handlePostSubmit);
    
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);

    // --- Initial Setup ---
    updateAdminUI();
    updateTime();
    setInterval(updateTime, 1000);
    fetchSystemInfo();
    fetchNews();

    if (auth) {
        window.firebase.onAuthStateChanged(auth, user => {
            if (user) {
                loadPosts();
            } else {
                window.firebase.signInAnonymously(auth).catch(error => {
                    console.error("Anonymous sign in failed:", error);
                });
            }
        });
    }
    
    if (audio) {
        audio.play().catch(error => {
            console.log("Autoplay was prevented. Muting audio by default.");
            if (!audio.muted) {
                audio.muted = true;
                toggleMute();
            }
        });
    }
});
