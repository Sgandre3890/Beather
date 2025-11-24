
// --- Sunny Clicker Game (v2) ---
let gameActive = false;
let gameScore = 0;
let gameTime = 100;
let gameTimerInterval = null;
const gameIcons = [
	{ src: '../Images/WebAssets/SunnyIcon.svg', type: 'sun', points: +1 },
	{ src: '../Images/WebAssets/cloud.svg', type: 'cloud', points: -1 },
	{ src: '../Images/WebAssets/PartlySunnyIcon.svg', type: 'partly', points: -1 },
	{ src: '../Images/WebAssets/SunnyIconV2.svg', type: 'sun2', points: +1 },
	// Add more distractors if available
];

function showGameOverlay() {
	$('#game-overlay').removeClass('hidden');
	$('.controls').hide();
	gameActive = true;
	startGame();
}

function hideGameOverlay() {
	$('#game-overlay').addClass('hidden');
	$('.controls').show();
	gameActive = false;
	stopGame();
}

function startGame() {
	gameScore = 0;
	gameTime = 100;
	sunClickTimestamps = [];
	$('#game-score').text('Score: 0');
	$('#game-timer').text(gameTime);
	let bestScore = 0;
	$('#game-area').empty();
	spawnGameIcons();
	gameTimerInterval = setInterval(() => {
		gameTime--;
		$('#game-timer').text(gameTime);
		// Load best score from localStorage
		bestScore = parseInt(localStorage.getItem('beather_best_score') || '0', 10);
		if (gameTime <= 0) {
			endGame();
		}
	}, 1000);
}

function stopGame() {
	clearInterval(gameTimerInterval);
	$('#game-area').empty();
}

function endGame() {
	stopGame();
	$('#game-timer').text('Time Up!');
	$('#game-area').html('<div style="font-size:1.3em;margin-top:18px;">Final Score: ' + gameScore + '</div>');
		let newBest = false;
		if (gameScore > bestScore) {
			bestScore = gameScore;
			localStorage.setItem('beather_best_score', bestScore);
			newBest = true;
		}
}

function spawnGameIcons() {
	if (!gameActive || gameTime <= 0) return;
	const area = $('#game-area');
	area.empty();
	// Always spawn one sun icon
	let positions = [];
	const maxX = area.width() - 56;
	const maxY = area.height() - 56;
	// Place sun icon first
	let sunX, sunY, tries = 0;
	do {
		sunX = Math.floor(Math.random() * maxX);
		sunY = Math.floor(Math.random() * maxY);
		tries++;
	} while (tries < 10 && positions.some(pos => Math.abs(pos.x - sunX) < 60 && Math.abs(pos.y - sunY) < 60));
	positions.push({ x: sunX, y: sunY });
	const sunIcon = $('<img class="sunny-icon" src="' + gameIcons[0].src + '" alt="sun">');
	sunIcon.css({ left: sunX + 'px', top: sunY + 'px' });
	sunIcon.on('click', function () {
		if (!gameActive || gameTime <= 0) return;
		gameScore += gameIcons[0].points;
		$('#game-score').text('Score: ' + gameScore);
		// 记录点击时间戳
		const now = Date.now();
		sunClickTimestamps.push(now);
		// 移除超过5秒的点击
		sunClickTimestamps = sunClickTimestamps.filter(ts => now - ts <= 5000);
		if (sunClickTimestamps.length >= 10) {
			gameTime += 2;
			$('#game-timer').text(gameTime + ' (+2s!)');
			sunClickTimestamps = [];
		}
		spawnGameIcons();
	});
	area.append(sunIcon);

	// Spawn 3–5 random distractors (not sun)
	const distractors = gameIcons.filter(ic => ic.points < 0);
	const numDistractors = 3 + Math.floor(Math.random() * 3); // 3–5
	for (let i = 0; i < numDistractors; i++) {
		let iconData = distractors[Math.floor(Math.random() * distractors.length)];
		let x, y, tries = 0;
		do {
			x = Math.floor(Math.random() * maxX);
			y = Math.floor(Math.random() * maxY);
			tries++;
		} while (positions.some(pos => Math.abs(pos.x - x) < 60 && Math.abs(pos.y - y) < 60) && tries < 10);
		positions.push({ x, y });
		const icon = $('<img class="sunny-icon" src="' + iconData.src + '" alt="' + iconData.type + '">');
		icon.css({ left: x + 'px', top: y + 'px' });
		icon.on('click', function () {
			if (!gameActive || gameTime <= 0) return;
			gameScore += iconData.points;
			$('#game-score').text('Score: ' + gameScore);
			spawnGameIcons();
		});
		area.append(icon);
	}
}

$(document).ready(function () {
	// Gamepad button toggles game overlay
	$('#gamepad-btn, #gamepad-btn-mini').on('click', function () {
		if (!gameActive) {
			showGameOverlay();
		} else {
			hideGameOverlay();
		}
	});
	// Exit button in game overlay
	$('#game-exit').on('click', function () {
		hideGameOverlay();
	});
});
const url =
	'https://api.openweathermap.org/data/2.5/weather';
const apiKey =
	'04b2c70f5678cb788cb9d62c0325ef32';

// Weather to background/audio mapping
const weatherThemeMap = {
	clear: { video: 'clear.mp4', audio: 'sunny.wav' },
	clouds: { video: 'cloudy.mp4', audio: 'wind.wav' },
	rain: { video: 'rain.mp4', audio: 'rain.wav' },
	drizzle: { video: 'drizzle.mp4', audio: 'drizzle.wav' },
	thunderstorm: { video: 'thunderstorm.mp4', audio: 'thunderstorm.wav' },
	snow: { video: 'snow.mp4', audio: 'snow.wav' },
	fog: { video: 'fog.mp4', audio: 'fog.wav' },
	mist: { video: 'fog.mp4', audio: 'fog.wav' },
	haze: { video: 'fog.mp4', audio: 'fog.wav' },
	smoke: { video: 'fog.mp4', audio: 'fog.wav' },
	dust: { video: 'fog.mp4', audio: 'fog.wav' }
};

// Default background and audio (video is now an MP4 loop)
const defaultTheme = { video: 'background.mp4', audio: 'backgroundmusic.mp3' };

// State management
const weatherState = {
	audioEnabled: true,
	backgroundEnabled: true,
	currentVideo: defaultTheme.video,
	currentAudio: defaultTheme.audio,
	videoPlaying: false,
	audioPlaying: false,
	audioPosition: 0
};

// Asset base path
const assetBasePath = '../Images/weatherbackground/';

// Initialize splash screen animation and then app
function initSplashScreen() {
	const splashScreen = $('#splash-screen');
	// Remove splash after animation duration (2s)
	setTimeout(function () {
		splashScreen.fadeOut(300, function () {
			$(this).remove();
				// After splash is removed, show and play the default background video
				// (Don't try to use the MP4 as a CSS background image)
				try {
					const videoEl = document.getElementById('weather-video');
					if (videoEl) {
						videoEl.classList.remove('hidden');
						// Ensure defaults are set before playing
						weatherState.currentVideo = defaultTheme.video;
						weatherState.currentAudio = defaultTheme.audio;
						playVideo();
					} else {
						// Fallback: leave #page-bg as-is or set a neutral background color
						const pageBg = document.getElementById('page-bg');
						if (pageBg) pageBg.style.background = '#111';
					}
				} catch (e) {
					console.warn('Could not start background video:', e);
				}

				// (Defaults already set above when starting the video)

			// Try to play background audio (may be blocked by autoplay policies)
			const audioEl = document.getElementById('weather-audio');
			const enableBtn = document.getElementById('enable-sound');
			if (audioEl) {
				audioEl.loop = true;
				audioEl.volume = 0.6;
				audioEl.play().then(() => {
					// audio started
					if (enableBtn) enableBtn.style.display = 'none';
				}).catch(err => {
					console.log('Autoplay blocked for background audio:', err);
					// show enable button
					if (enableBtn) enableBtn.style.display = 'inline-flex';
				});

				// Wire enable button to start audio if user clicks
				if (enableBtn) {
					enableBtn.addEventListener('click', function () {
						audioEl.play().then(() => {
							enableBtn.style.display = 'none';
						}).catch(e => console.error(e));
					});
				}
			}
		});
	}, 2000);
}

$(document).ready(function () {
	// Show splash first
	initSplashScreen();
	// Initialize controls and wait for user to request weather
	setTimeout(function () {
		initControls();
		// Wire up city input button
		$('#city-input-btn').on('click', function () {
			const city = $('#city-input').val().trim();
			if (city) {
				weatherFn(city);
			} else {
				alert('Please enter a city name.');
			}
		});

		// Detect-location button: toggles detection when clicked
		$('#detect-location').on('click', function () {
			const btn = $(this);
			// If already enabled, do nothing (or you could disable)
			if (!btn.hasClass('enabled')) {
				// enable UI
				btn.addClass('enabled');
				// attempt geolocation
				if (navigator.geolocation) {
					navigator.geolocation.getCurrentPosition(function (pos) {
						const lat = pos.coords.latitude;
						const lon = pos.coords.longitude;
						// Call weather API using lat/lon
						weatherFn({ lat, lon });
					}, function (err) {
						alert('Unable to retrieve location: ' + err.message);
					});
				} else {
					alert('Geolocation is not supported by your browser.');
				}
			}
		});
	}, 500);
});

// Initialize control buttons
function initControls() {
	const audioBtn = $('#toggle-audio');
	const bgBtn = $('#toggle-background');

	audioBtn.on('click', function () {
		weatherState.audioEnabled = !weatherState.audioEnabled;
		updateAudioState();
		updateButtonState(audioBtn, weatherState.audioEnabled);
	});

	bgBtn.on('click', function () {
		weatherState.backgroundEnabled = !weatherState.backgroundEnabled;
		updateVideoState();
		updateButtonState(bgBtn, weatherState.backgroundEnabled);
	});

	// Initialize button states
	updateButtonState(audioBtn, weatherState.audioEnabled);
	updateButtonState(bgBtn, weatherState.backgroundEnabled);
}

// Update button style
function updateButtonState(btn, isEnabled) {
	if (isEnabled) {
		btn.removeClass('disabled');
	} else {
		btn.addClass('disabled');
	}
}

// Play background media
function playBackgroundMedia() {
	playVideo();
	playAudio();
}

// Play video
function playVideo() {
	const videoEl = document.getElementById('weather-video');
	const videoSrc = assetBasePath + weatherState.currentVideo;
	
	if (videoEl.src !== videoSrc) {
		videoEl.src = videoSrc;
		videoEl.load();
	}

	if (weatherState.backgroundEnabled) {
		videoEl.play().catch(err => {
			console.log('Video autoplay prevented:', err);
		});
		weatherState.videoPlaying = true;
	} else {
		videoEl.pause();
		weatherState.videoPlaying = false;
	}
}

// Play audio
function playAudio() {
	const audioEl = document.getElementById('weather-audio');
	const audioSrc = assetBasePath + weatherState.currentAudio;

	// If the source changed, update it and reset stored position
	const currentSrc = audioEl.getAttribute('src') || audioEl.src || '';
	if (!currentSrc.endsWith(audioSrc)) {
		audioEl.src = audioSrc;
		audioEl.load();
		// reset stored position because this is a new track
		weatherState.audioPosition = 0;
	}

	if (weatherState.audioEnabled) {
		// restore position if we have one
		if (weatherState.audioPosition && audioEl.currentTime !== weatherState.audioPosition) {
			try { audioEl.currentTime = weatherState.audioPosition; } catch (e) { /* ignore */ }
		}
		audioEl.play().catch(err => {
			console.log('Audio autoplay prevented:', err);
		});
		weatherState.audioPlaying = true;
	} else {
		// store current time so we can resume later
		try { weatherState.audioPosition = audioEl.currentTime; } catch (e) { weatherState.audioPosition = 0; }
		audioEl.pause();
		weatherState.audioPlaying = false;
	}
}

// Update video state
function updateVideoState() {
	const videoEl = document.getElementById('weather-video');
	if (weatherState.backgroundEnabled) {
		videoEl.classList.remove('hidden');
		playVideo();
	} else {
		videoEl.classList.add('hidden');
		videoEl.pause();
		weatherState.videoPlaying = false;
	}
}

// Update audio state
function updateAudioState() {
	const audioEl = document.getElementById('weather-audio');
	if (weatherState.audioEnabled) {
		// resume from last position
		if (audioEl) {
			try {
				if (weatherState.audioPosition) audioEl.currentTime = weatherState.audioPosition;
			} catch (e) { /* ignore */ }
		}
		playAudio();
	} else {
		if (audioEl) {
			try { weatherState.audioPosition = audioEl.currentTime; } catch (e) { weatherState.audioPosition = 0; }
			audioEl.pause();
		}
		weatherState.audioPlaying = false;
	}
}

// Fetch weather and switch background/audio
async function weatherFn(query) {
	let endpoint;
	if (typeof query === 'string') {
		endpoint = `${url}?q=${encodeURIComponent(query)}&appid=${apiKey}&units=imperial`;
	} else if (query && query.lat !== undefined && query.lon !== undefined) {
		endpoint = `${url}?lat=${query.lat}&lon=${query.lon}&appid=${apiKey}&units=imperial`;
	} else {
		console.error('Invalid weather query:', query);
		return;
	}

	try {
		const res = await fetch(endpoint);
		const data = await res.json();
		if (res.ok) {
			// Get weather main category and switch background/audio
			const weatherMain = data.weather[0].main.toLowerCase();
			switchWeatherTheme(weatherMain);

			weatherShowFn(data);
		} else {
			alert('City not found. Please try again.');
		}
	} catch (error) {
		console.error('Error fetching weather data:', error);
	}
}

// Switch weather theme
function switchWeatherTheme(weatherMain) {
	const theme = weatherThemeMap[weatherMain] || defaultTheme;
	
	// Only reload if theme changes
	if (weatherState.currentVideo !== theme.video || weatherState.currentAudio !== theme.audio) {
		weatherState.currentVideo = theme.video;
		weatherState.currentAudio = theme.audio;
		
		playBackgroundMedia();
	}
}

// Live clock handling
let clockInterval = null;
let currentTimezoneOffset = null; // seconds offset from UTC

function startClock(timezoneOffsetSeconds) {
	stopClock();
	currentTimezoneOffset = typeof timezoneOffsetSeconds === 'number' ? timezoneOffsetSeconds : null;
	updateClock();
	clockInterval = setInterval(updateClock, 1000);
}

function stopClock() {
	if (clockInterval) {
		clearInterval(clockInterval);
		clockInterval = null;
	}
}

function updateClock() {
	let now = new Date();
	if (currentTimezoneOffset !== null) {
		// Convert to UTC then apply offset
		const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
		const target = new Date(utc + currentTimezoneOffset * 1000);
		$('#date').text(moment(target).format('MMMM Do YYYY, h:mm:ss a'));
	} else {
		$('#date').text(moment(now).format('MMMM Do YYYY, h:mm:ss a'));
	}
}

function weatherShowFn(data) {
	$('#city-name').text(data.name);
	// Start live clock using city's timezone offset (seconds)
	if (data && data.timezone !== undefined) {
		startClock(data.timezone);
	} else {
		startClock(null);
	}
	$('#temperature').
		html(`${Math.round(data.main.temp)}°F`);
	$('#description').
		text(data.weather[0].description);
	$('#wind-speed').
		html(`Wind Speed: ${data.wind.speed} m/s`);
    $('#city-input-btn').on('click', function () {
    let cityName = $('#city-input').val();
    if (cityName) {
        weatherFn(cityName);
    } else {
        alert("Please enter a city name.");
    }
});

	$('#weather-info').fadeIn();
}