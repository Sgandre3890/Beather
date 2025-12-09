
// --- Sunny Clicker Game (v2) ---
let gameActive = false;
let gameScore = 0;
let gameTime = 100;
let gameTimerInterval = null;
// persisted best score
// helper for per-game best score storage
function getBestScore(game) {
	const v = localStorage.getItem('beather_best_score_' + game);
	return v === null ? null : parseInt(v, 10);
}
function setBestScore(game, score) {
	localStorage.setItem('beather_best_score_' + game, score);
}

// Update displayed score and persist best score immediately when surpassed
function updateScoreAndBest(game, currentScore) {
	if (game === 'sunny') {
		gameScore = currentScore;
		$('#game-score').text('Score: ' + gameScore);
	} else if (game === 'flappy') {
		flappy.score = currentScore;
		$('#game-score').text('Score: ' + flappy.score);
	}
	const stored = getBestScore(game);
	if (stored === null) {
		// first run: set and show so player sees a target
		setBestScore(game, currentScore);
		$('#best-score').text('Best: ' + currentScore);
	} else if (currentScore > stored) {
		// player surpassed stored best during play — update immediately
		setBestScore(game, currentScore);
		$('#best-score').text('Best: ' + currentScore);
	}
}
// click timestamps for sun clicks
let sunClickTimestamps = [];
// frenzy state
let frenzyActive = false;
let frenzyTimeout = null;
const gameIcons = [
	{ src: '../Images/WebAssets/SunnyIcon.svg', type: 'sun', points: +1 },
	{ src: '../Images/WebAssets/cloud.svg', type: 'cloud', points: -1 },
	{ src: '../Images/WebAssets/PartlySunnyIcon.svg', type: 'partly', points: -1 },
	{ src: '../Images/WebAssets/SunnyIconV2.svg', type: 'sun2', points: +1 },
	// Add more distractors if available
];

// Active game identifier: 'sunny' or 'flappy'
let activeGame = null;

// Flappy Cloud game state
let flappy = {
	canvas: null,
	ctx: null,
	width: 520,
	height: 360,
	cloudY: 180,
	cloudX: 100,
	velocity: 0,
	// stronger gravity for more challenge; smaller lift so clicks produce smaller hops
	gravity: 0.45,
	// increase lift so the cloud can actually clear pipes when player clicks
	lift: -4.2,
	// per-game tunables
	pipeSpeed: 3.8,
	spawnRate: 75,
	pipes: [],
	pipeGap: 120,
	pipeWidth: 52,
	frameCount: 0,
	score: 0,
	running: false,
	loopId: null
};

function showGameOverlay() {
	$('#game-menu').addClass('hidden');
	$('#game-overlay').removeClass('hidden');
	$('.controls').hide();
	gameActive = true;
	// start the selected game
	if (!activeGame) activeGame = 'sunny';
	if (activeGame === 'sunny') startGame();
	if (activeGame === 'flappy') startFlappy();
}

function hideGameOverlay() {
	$('#game-overlay').addClass('hidden');
	$('.controls').show();
	gameActive = false;
	// stop whatever game is running
	if (activeGame === 'sunny') stopGame();
	if (activeGame === 'flappy') stopFlappy();
}

function startGame() {
	gameScore = 0;
	gameTime = 100;
	sunClickTimestamps = [];
	// reload best score from storage at start (show 0 if none)
	const bs = getBestScore('sunny');
	const displayBest = bs === null ? 0 : bs;
	$('#best-score').text('Best: ' + displayBest);
	$('#game-score').text('Score: 0');
	$('#game-timer').text(gameTime);
	$('#game-area').empty();
	spawnGameIcons();
	gameTimerInterval = setInterval(() => {
		gameTime--;
		$('#game-timer').text(gameTime);
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
        	// Persist best score for sunny: if none exists, set to this run; otherwise update only when exceeded
        	const stored = getBestScore('sunny');
        	if (stored === null) {
        		setBestScore('sunny', gameScore);
        	} else if (gameScore > stored) {
        		setBestScore('sunny', gameScore);
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
		// If frenzy active, every click gives +1
		if (frenzyActive) {
				gameScore += 1;
				updateScoreAndBest('sunny', gameScore);
				$('#game-score').text('Score: ' + gameScore + ' (FRENZY)');
			spawnGameIcons();
			return;
		}
		// Normal behavior: add sun points and record timestamp
			gameScore += gameIcons[0].points;
			updateScoreAndBest('sunny', gameScore);
		const now = Date.now();
		sunClickTimestamps.push(now);
		// Count within 5s and 10s windows
		const count5 = sunClickTimestamps.filter(ts => now - ts <= 5000).length;
		const count10 = sunClickTimestamps.filter(ts => now - ts <= 10000).length;
		// 10 clicks in 5s => +2s
		if (count5 >= 10) {
			gameTime += 2;
			$('#game-timer').text(gameTime + ' (+2s!)');
			// clear 5s-like timestamps to avoid repeat
			sunClickTimestamps = [];
		} else if (count10 >= 15) {
			// Trigger frenzy: pause timer for 5s and enable frenzy behavior
			if (!frenzyActive) {
				frenzyActive = true;
				clearInterval(gameTimerInterval);
				$('#frenzy-banner').removeClass('hidden');
				// clear timestamps so it doesn't immediately retrigger
				sunClickTimestamps = [];
				frenzyTimeout = setTimeout(() => {
					frenzyActive = false;
					$('#frenzy-banner').addClass('hidden');
					// resume timer
					gameTimerInterval = setInterval(() => {
						gameTime--;
						$('#game-timer').text(gameTime);
						if (gameTime <= 0) endGame();
					}, 1000);
				}, 5000);
			}
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
			if (frenzyActive) {
				gameScore += 1; // any click adds during frenzy
				updateScoreAndBest('sunny', gameScore);
				$('#game-score').text('Score: ' + gameScore + ' (FRENZY)');
				spawnGameIcons();
				return;
			}
			gameScore += iconData.points;
			updateScoreAndBest('sunny', gameScore);
			spawnGameIcons();
		});
		area.append(icon);
	}
}

$(document).ready(function () {
	// Gamepad button toggles game overlay
	// Show game selection on gamepad click
	$('#gamepad-btn').on('click', function () {
		$('#game-menu').removeClass('hidden');
	});

	// Menu card selection
	$(document).on('click', '.game-card', function () {
		const g = $(this).data('game');
		activeGame = g;
		// set title and reset area
		$('#game-title').text(g === 'sunny' ? 'Sunny Clicker' : 'Flappy Cloud');
		$('#game-area').removeClass('flappy');
		$('#frenzy-banner').addClass('hidden');
		$('#best-score').text('Best: ' + (localStorage.getItem('beather_best_score_' + g) || '0'));
		// Show overlay and start game
		showGameOverlay();
	});

	$('#game-menu-cancel').on('click', function () { $('#game-menu').addClass('hidden'); });
	// Exit button in game overlay
	$('#game-exit').on('click', function () {
		hideGameOverlay();
	});
	// Restart button
	$('#game-restart').on('click', function () {
		if (activeGame === 'sunny') {
			stopGame(); startGame();
		} else if (activeGame === 'flappy') {
			stopFlappy(); startFlappy();
		}
	});
});
const url =
	'https://api.openweathermap.org/data/2.5/weather';
const geoUrl = 'https://api.openweathermap.org/geo/1.0/direct';
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
// Note: audio filename uses capital 'B' per repository: 'Backgroundmusic.mp3'
const defaultTheme = { video: 'background.mp4', audio: 'Backgroundmusic.mp3' };

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
						// Ensure defaults are set before playing
						weatherState.currentVideo = defaultTheme.video;
						weatherState.currentAudio = defaultTheme.audio;
						// Show video only when it can play to avoid initial flash
						videoEl.addEventListener('canplay', function onCanPlay() {
							videoEl.classList.add('visible');
							videoEl.removeEventListener('canplay', onCanPlay);
						});
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
			if (audioEl) {
				audioEl.loop = true;
				audioEl.volume = 0.6;
				audioEl.play().then(() => {
					// audio started
					weatherState.audioPlaying = true;
				}).catch(err => {
					console.log('Autoplay blocked for background audio:', err);
					// mark audio as not playing and ensure toggle shows disabled state
					weatherState.audioPlaying = false;
					weatherState.audioEnabled = false;
					try { updateButtonState($('#toggle-audio'), false); } catch (e) { }
				});
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
		// Wire up city input button (use off/on to avoid duplicate handlers)
		// init language selector from storage
		const savedLang = localStorage.getItem('beather_lang') || 'en';
		$('#lang-select').val(savedLang);
		// apply initial i18n
		applyI18n(savedLang);
		$('#lang-select').on('change', function(){
			const val = $(this).val();
			localStorage.setItem('beather_lang', val);
			applyI18n(val);
		});

		$('#city-input-btn').off('click').on('click', function () {
			const city = $('#city-input').val().trim();
			if (city) {
				const langSel = $('#lang-select').val() || 'en';
				weatherFn(city, { lang: langSel });
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
							const langSel = $('#lang-select').val() || localStorage.getItem('beather_lang') || 'en';
							weatherFn({ lat, lon }, { lang: langSel });
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
		const audioEl = document.getElementById('weather-audio');
		// If audio isn't playing (autoplay blocked), try to start audio on this explicit user gesture
		if (!weatherState.audioPlaying) {
			weatherState.audioEnabled = true;
			updateAudioState();
			updateButtonState(audioBtn, true);
			return;
		}
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

// --- Lightweight i18n ---
const i18n = {
	en: {
		'nav.home': 'Home',
		'nav.map': 'Weather Map',
		'game.choose': 'Choose a Game',
		'game.sunny.title': 'Sunny Clicker',
		'game.sunny.desc': 'Click suns, avoid distractors. Frenzy & bonuses included.',
		'game.flappy.title': 'Flappy Cloud',
		'game.flappy.desc': "Tap to fly the cloud. Don't hit the ground or the pillars.",
		'btn.cancel': 'Cancel',
		'game.title': 'Game',
		'btn.exit': 'Exit Game',
		'btn.restart': 'Restart',
		'btn.getWeather': 'Get Weather',
		'input.city': 'Enter city name'
	},
	zh_cn: {
		'nav.home': '首页',
		'nav.map': '天气地图',
		'game.choose': '选择游戏',
		'game.sunny.title': '阳光点击',
		'game.sunny.desc': '点击太阳，避开干扰。含狂热与加成。',
		'game.flappy.title': '飞云冒险',
		'game.flappy.desc': '点击使云飞起，别撞到地面或水管。',
		'btn.cancel': '取消',
		'game.title': '游戏',
		'btn.exit': '退出游戏',
		'btn.restart': '重新开始',
		'btn.getWeather': '查询天气',
		'input.city': '输入城市名称'
	},
	es: {
		'nav.home': 'Inicio',
		'nav.map': 'Mapa del clima',
		'game.choose': 'Elige un juego',
		'game.sunny.title': 'Clic del Sol',
		'game.sunny.desc': 'Haz clic en soles, evita distracciones. Con frenesí y bonificaciones.',
		'game.flappy.title': 'Nube Voladora',
		'game.flappy.desc': 'Toca para volar la nube. No choques con el suelo ni los pilares.',
		'btn.cancel': 'Cancelar',
		'game.title': 'Juego',
		'btn.exit': 'Salir del juego',
		'btn.restart': 'Reiniciar',
		'btn.getWeather': 'Obtener clima',
		'input.city': 'Ingresa el nombre de la ciudad'
	}
};

function applyI18n(lang) {
	const dict = i18n[lang] || i18n.en;
	// text content
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.getAttribute('data-i18n');
		if (key && dict[key] !== undefined) {
			el.textContent = dict[key];
		}
	});
	// placeholders
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		const key = el.getAttribute('data-i18n-placeholder');
		if (key && dict[key] !== undefined) {
			el.setAttribute('placeholder', dict[key]);
		}
	});
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
		// If video is already loaded enough, show immediately
		if (videoEl.readyState >= 3) { // HAVE_FUTURE_DATA
			videoEl.classList.add('visible');
		}
		playVideo();
	} else {
		// Hide video smoothly and pause
		videoEl.classList.remove('visible');
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
async function weatherFn(query, options = {}) {
	// language code (e.g., 'en', 'zh_cn', 'es'); default to browser language
	const lang = options.lang || (navigator.language ? navigator.language.toLowerCase().replace('-', '_') : 'en');

	let coords = null;
	try {
		if (typeof query === 'string') {
			// Resolve city name in any language using geocoding API
			const geoEndpoint = `${geoUrl}?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
			const gres = await fetch(geoEndpoint);
			const gdata = await gres.json();
			if (Array.isArray(gdata) && gdata.length > 0) {
				coords = { lat: gdata[0].lat, lon: gdata[0].lon };
			} else {
				alert('City not found. Please try again.');
				return;
			}
		} else if (query && query.lat !== undefined && query.lon !== undefined) {
			coords = { lat: query.lat, lon: query.lon };
		} else {
			console.error('Invalid weather query:', query);
			return;
		}

		const endpoint = `${url}?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=imperial&lang=${encodeURIComponent(lang)}`;
		const res = await fetch(endpoint);
		const data = await res.json();
		if (res.ok) {
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

	$('#weather-info').fadeIn();
}

// ------------------ Flappy Cloud implementation ------------------
// Configuration: you can set `pipeImageSrc` to a URL of a pipe texture.
// By default use the sample SVG we added to the repo.
// Use layered pipe images (back + front) for better depth
const pipeImageSrc = '../Images/pipes/pipe_back.svg';
const pipeFrontImageSrc = '../Images/pipes/pipe_front.svg';

function startFlappy() {
	// reset state
	flappy.pipes = [];
	flappy.frameCount = 0;
	flappy.score = 0;
	flappy.velocity = 0;
	flappy.cloudY = flappy.height / 2;
	flappy.running = true;
	// state machine: 'happy' (initial), 'veryhappy' (after 20 passes)
	flappy.state = 'happy';
	flappy.totalPassed = 0;
	flappy.invulnerable = false;
	flappy._invulTimeout = null;

	$('#game-area').addClass('flappy');
	$('#game-area').empty();
	$('#game-score').text('Score: 0');
	const best = getBestScore('flappy');
	$('#best-score').text('Best: ' + (best === null ? 0 : best));

	// create canvas
	const canvas = document.createElement('canvas');
	canvas.width = flappy.width;
	canvas.height = flappy.height;
	canvas.style.background = 'linear-gradient(#87CEEB,#B0E0E6)';
	canvas.style.display = 'block';
	canvas.style.margin = '0 auto';
	$('#game-area').append(canvas);
	flappy.canvas = canvas;
	flappy.ctx = canvas.getContext('2d');

	// load cloud images
	flappy.cloudImgs = {
		happy: new Image(),
		sad: new Image(),
		veryhappy: new Image()
	};
	flappy.cloudImgs.happy.src = '../Images/clouds/happycloud.svg';
	flappy.cloudImgs.sad.src = '../Images/clouds/sadcloud.svg';
	flappy.cloudImgs.veryhappy.src = '../Images/clouds/veryhappycloud.svg';
	flappy.currentImg = flappy.cloudImgs.happy;
	// cloud drawing size (smaller) and collision inset
	flappy.cloudDrawW = 42;
	flappy.cloudDrawH = 36;
	flappy.collisionInset = 8; // shrink collision box by inset on each side
	flappy.gameOver = false;
	flappy._blink = false;
	flappy.groundHeight = 26;

	// optional pipe image
	if (pipeImageSrc) {
		flappy.pipeBackImg = new Image();
		flappy.pipeBackImg.src = pipeImageSrc;
	}
	if (pipeFrontImageSrc) {
		flappy.pipeFrontImg = new Image();
		flappy.pipeFrontImg.src = pipeFrontImageSrc;
	}

	// input handlers
	function flapHandler(e) {
		flappy.velocity = flappy.lift;
		e && e.preventDefault && e.preventDefault();
	}
	canvas.addEventListener('mousedown', flapHandler);
	canvas.addEventListener('touchstart', flapHandler);
	flappy._keydownHandler = function (e) {
		if (e.code === 'Space' || e.key === ' ') flapHandler(e);
	};
	document.addEventListener('keydown', flappy._keydownHandler);

	// start loop
	function loop() {
		if (!flappy.running) return;
		flappy.loopId = requestAnimationFrame(loop);
		updateFlappy();
		drawFlappy();
	}
	loop();
}

function stopFlappy() {
	flappy.running = false;
	if (flappy.loopId) cancelAnimationFrame(flappy.loopId);
	// remove canvas and handlers
	if (flappy.canvas) {
		try { flappy.canvas.remove(); } catch (e) { }
		flappy.canvas = null;
		flappy.ctx = null;
	}
	if (flappy._keydownHandler) {
		try { document.removeEventListener('keydown', flappy._keydownHandler); } catch (e) { }
		flappy._keydownHandler = null;
	}
}

function updateFlappy() {
	// if gameOver, freeze physics/spawning but keep drawing so user sees final state
	if (flappy.gameOver) return;
	// physics
	flappy.velocity += flappy.gravity;
	flappy.cloudY += flappy.velocity;
	// ceiling clamp
	if (flappy.cloudY < 0) {
		flappy.cloudY = 0;
		flappy.velocity = 0;
	}
	const cloudH = flappy.cloudDrawH;
	const groundY = flappy.height - (flappy.groundHeight || 26);
	if (flappy.cloudY + cloudH > groundY) {
		// hit ground
		handleFlappyCollision('ground');
	}

	// spawn pipes
	flappy.frameCount++;
	if (flappy.frameCount % (flappy.spawnRate || 75) === 0) {
		// Normalize pipe gap: consistent bounds and slight tightening over progress
		const progressFactor = Math.min(1, (flappy.totalPassed || 0) / 40); // 0..1
		const baseMinGap = Math.max(Math.floor(flappy.cloudDrawH * 2.0), 64);
		const baseMaxGap = Math.min(Math.floor(flappy.cloudDrawH * 3.5), flappy.height - 140);
		// reduce max gap as player progresses, but never below min
		const dynamicMaxGap = Math.max(baseMinGap + 10, Math.floor(baseMaxGap - progressFactor * 40));
		const minGap = baseMinGap;
		const maxGap = dynamicMaxGap;
		const gapRange = Math.max(1, maxGap - minGap);
		const gap = Math.floor(minGap + Math.random() * gapRange);

		// Ensure top height leaves enough space for gap and margins
		const safeMarginTop = 24;
		const safeMarginBottom = 24;
		const maxTopH = Math.max(20, flappy.height - (gap + safeMarginTop + safeMarginBottom));
		const topH = safeMarginTop + Math.floor(Math.random() * Math.max(1, maxTopH));
		flappy.pipes.push({ x: flappy.width, top: topH, gap: gap, passed: false });
	}

	// move pipes and check score
	for (let i = flappy.pipes.length - 1; i >= 0; i--) {
		const p = flappy.pipes[i];
		p.x -= (flappy.pipeSpeed || 3.8);
		// passed check
			if (!p.passed && (p.x + flappy.pipeWidth) < flappy.cloudX) {
				p.passed = true;
				// increment total passed and score depending on state
				flappy.totalPassed = (flappy.totalPassed || 0) + 1;
				if (flappy.state === 'happy') {
					flappy.score += 1;
				} else if (flappy.state === 'veryhappy') {
					flappy.score += 2;
				}
				// transition to veryhappy after 20 passed
				if (flappy.totalPassed >= 20 && flappy.state !== 'veryhappy') {
					flappy.state = 'veryhappy';
					flappy.currentImg = flappy.cloudImgs.veryhappy;
				}
				// update score display and best immediately
				updateScoreAndBest('flappy', flappy.score);
			}
		// remove off-screen
		if (p.x + flappy.pipeWidth < -50) flappy.pipes.splice(i, 1);
		// collision detection (AABB) using smaller collision rect (inset)
		const cloudW = flappy.cloudDrawW;
		const cloudH2 = flappy.cloudDrawH;
		const cloudRect = {
			x: flappy.cloudX + flappy.collisionInset,
			y: flappy.cloudY + flappy.collisionInset,
			w: Math.max(8, cloudW - flappy.collisionInset * 2),
			h: Math.max(8, cloudH2 - flappy.collisionInset * 2)
		};
		const topRect = { x: p.x, y: 0, w: flappy.pipeWidth, h: p.top };
		const bottomRect = { x: p.x, y: p.top + (p.gap || flappy.pipeGap), w: flappy.pipeWidth, h: flappy.height - (p.top + (p.gap || flappy.pipeGap)) };
		if (!flappy.invulnerable && rectsOverlap(cloudRect, topRect)) {
			handleFlappyCollision('pipe');
		}
		if (!flappy.invulnerable && rectsOverlap(cloudRect, bottomRect)) {
			handleFlappyCollision('pipe');
		}
	}
}

function handleFlappyCollision(type) {
	// if currently invulnerable, ignore collisions
	if (flappy.invulnerable) return;

	if (flappy.state === 'veryhappy') {
		// downgrade to happy, grant 3s invulnerability with blinking
		flappy.state = 'happy';
		flappy.currentImg = flappy.cloudImgs.happy;

		// clear any previous timers
		if (flappy._invulTimeout) {
			clearTimeout(flappy._invulTimeout);
			flappy._invulTimeout = null;
		}
		if (flappy._blinkInterval) {
			clearInterval(flappy._blinkInterval);
			flappy._blinkInterval = null;
		}

		flappy.invulnerable = true;
		flappy._blink = false;
		// start blink interval
		flappy._blinkInterval = setInterval(() => {
			if (!flappy.ctx) return clearInterval(flappy._blinkInterval);
			flappy._blink = !flappy._blink;
		}, 150);
		// end invulnerability after 3s
		flappy._invulTimeout = setTimeout(() => {
			if (flappy._blinkInterval) clearInterval(flappy._blinkInterval);
			flappy.invulnerable = false;
			flappy._blink = false;
			flappy._invulTimeout = null;
			flappy._blinkInterval = null;
		}, 3000);

		return;
	}


	// Otherwise (state is 'happy' or invulnerability expired) -> game over
	flappy.currentImg = flappy.cloudImgs.sad;
	flappy.gameOver = true;
	flappy.running = true; // keep drawing so final frame is visible
	// persist best
	const stored = getBestScore('flappy');
	if (stored === null) setBestScore('flappy', flappy.score);
	else if (flappy.score > stored) setBestScore('flappy', flappy.score);
}

function rectsOverlap(a, b) {
	return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function drawFlappy() {
	const ctx = flappy.ctx;
	if (!ctx) return;
	ctx.clearRect(0, 0, flappy.width, flappy.height);
	// richer background: vertical gradient sky + subtle distant hills + layered clouds
	const skyGrad = ctx.createLinearGradient(0, 0, 0, flappy.height);
	skyGrad.addColorStop(0, '#a6e0ff');
	skyGrad.addColorStop(0.6, '#dbefff');
	skyGrad.addColorStop(1, '#f7fdff');
	ctx.fillStyle = skyGrad;
	ctx.fillRect(0, 0, flappy.width, flappy.height);
	// distant hills
	ctx.fillStyle = '#c7e6d9';
	ctx.beginPath(); ctx.ellipse(120, flappy.height - 40, 260, 60, 0, Math.PI, 2*Math.PI); ctx.fill();
	ctx.fillStyle = '#b8dfc9';
	ctx.beginPath(); ctx.ellipse(380, flappy.height - 30, 220, 52, 0, Math.PI, 2*Math.PI); ctx.fill();
	// ground strip
	const groundH = 26;
	ctx.fillStyle = '#6bb45a';
	ctx.fillRect(0, flappy.height - groundH, flappy.width, groundH);
	// small grass strokes
	ctx.fillStyle = '#4f8b3f';
	for (let gx = 0; gx < flappy.width; gx += 14) {
		ctx.fillRect(gx + 6, flappy.height - groundH, 2, 8);
	}
	// layered decorative clouds (parallax feel)
	ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(110,50,46,20,0,0,Math.PI*2); ctx.fill();
	ctx.beginPath(); ctx.ellipse(170,70,36,16,0,0,Math.PI*2); ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(300,40,34,14,0,0,Math.PI*2); ctx.fill();

	// draw pipes
	for (const p of flappy.pipes) {
		const gap = p.gap || flappy.pipeGap;
		if (flappy.pipeBackImg) {
			ctx.drawImage(flappy.pipeBackImg, p.x - 4, 0, flappy.pipeWidth + 8, p.top);
			ctx.drawImage(flappy.pipeBackImg, p.x - 4, p.top + gap, flappy.pipeWidth + 8, flappy.height - (p.top + gap));
		} else {
			ctx.fillStyle = '#2e8b57';
			ctx.fillRect(p.x, 0, flappy.pipeWidth, p.top);
			ctx.fillRect(p.x, p.top + gap, flappy.pipeWidth, flappy.height - (p.top + gap));
		}
		// draw front overlay
		if (flappy.pipeFrontImg) {
			ctx.drawImage(flappy.pipeFrontImg, p.x, 0, flappy.pipeWidth, p.top);
			ctx.drawImage(flappy.pipeFrontImg, p.x, p.top + gap, flappy.pipeWidth, flappy.height - (p.top + gap));
		}
	}
	// draw cloud (blink if invulnerable)
	const img = flappy.currentImg || flappy.cloudImgs.happy;
	const cloudW = flappy.cloudDrawW, cloudH = flappy.cloudDrawH;
	if (!flappy._blink) ctx.globalAlpha = 1.0;
	else ctx.globalAlpha = 0.25;
	// soft glow behind cloud
	ctx.save();
	ctx.globalAlpha = 0.25;
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.ellipse(flappy.cloudX + cloudW/2, flappy.cloudY + cloudH/2, cloudW*0.6, cloudH*0.5, 0, 0, Math.PI*2);
	ctx.fill();
	ctx.restore();
	// subtle drop shadow
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.25)';
	ctx.shadowBlur = 8;
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 3;
	try { ctx.drawImage(img, flappy.cloudX, flappy.cloudY, cloudW, cloudH); } catch (e) { /* ignore until image loads */ }
	ctx.restore();
	ctx.globalAlpha = 1.0;

	// if gameOver, draw GAME OVER text above the score area
	if (flappy.gameOver) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.font = 'bold 28px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('GAME OVER', flappy.width / 2, 32);
	}
}
