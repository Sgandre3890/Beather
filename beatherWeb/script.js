
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
	lift: -1.8,
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
			$('#game-score').text('Score: ' + gameScore + ' (FRENZY)');
			spawnGameIcons();
			return;
		}
		// Normal behavior: add sun points and record timestamp
		gameScore += gameIcons[0].points;
		$('#game-score').text('Score: ' + gameScore);
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
				$('#game-score').text('Score: ' + gameScore + ' (FRENZY)');
				spawnGameIcons();
				return;
			}
			gameScore += iconData.points;
			$('#game-score').text('Score: ' + gameScore);
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
		$('#city-input-btn').off('click').on('click', function () {
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
	if (flappy.frameCount % 90 === 0) {
		const topH = 40 + Math.floor(Math.random() * (flappy.height - flappy.pipeGap - 80));
		flappy.pipes.push({ x: flappy.width, top: topH, passed: false });
	}

	// move pipes and check score
	for (let i = flappy.pipes.length - 1; i >= 0; i--) {
		const p = flappy.pipes[i];
		p.x -= 2.5;
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
				$('#game-score').text('Score: ' + flappy.score);
				$('#best-score').text('Best: ' + (getBestScore('flappy') === null ? 0 : getBestScore('flappy')));
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
		const bottomRect = { x: p.x, y: p.top + flappy.pipeGap, w: flappy.pipeWidth, h: flappy.height - (p.top + flappy.pipeGap) };
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

	// If we're in veryhappy state, a collision downgrades to happy and grants 3s invulnerability
	if (flappy.state === 'veryhappy') {
		flappy.state = 'happy';
		flappy.currentImg = flappy.cloudImgs.happy;
		flappy.invulnerable = true;
		flappy._blink = false;
		// clear any previous timeout
		if (flappy._invulTimeout) clearTimeout(flappy._invulTimeout);
		// start flashing for 3 seconds
		const start = Date.now();
		flappy._blinkInterval = setInterval(() => {
			if (!flappy.ctx) return clearInterval(flappy._blinkInterval);
			flappy._blink = !flappy._blink;
		}, 150);
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
	if (flappy._invulTimeout) {
		clearTimeout(flappy._invulTimeout);
		flappy._invulTimeout = null;
	}
	if (flappy._blinkInterval) {
		clearInterval(flappy._blinkInterval);
		flappy._blinkInterval = null;
	}
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
		if (flappy.pipeBackImg) {
			ctx.drawImage(flappy.pipeBackImg, p.x - 4, 0, flappy.pipeWidth + 8, p.top);
			ctx.drawImage(flappy.pipeBackImg, p.x - 4, p.top + flappy.pipeGap, flappy.pipeWidth + 8, flappy.height - (p.top + flappy.pipeGap));
		} else {
			ctx.fillStyle = '#2e8b57';
			ctx.fillRect(p.x, 0, flappy.pipeWidth, p.top);
			ctx.fillRect(p.x, p.top + flappy.pipeGap, flappy.pipeWidth, flappy.height - (p.top + flappy.pipeGap));
		}
		// draw front overlay
		if (flappy.pipeFrontImg) {
			ctx.drawImage(flappy.pipeFrontImg, p.x, 0, flappy.pipeWidth, p.top);
			ctx.drawImage(flappy.pipeFrontImg, p.x, p.top + flappy.pipeGap, flappy.pipeWidth, flappy.height - (p.top + flappy.pipeGap));
		}
	}
	// draw cloud (blink if invulnerable)
	const img = flappy.currentImg || flappy.cloudImgs.happy;
	const cloudW = flappy.cloudDrawW, cloudH = flappy.cloudDrawH;
	if (!flappy._blink) ctx.globalAlpha = 1.0;
	else ctx.globalAlpha = 0.25;
	try { ctx.drawImage(img, flappy.cloudX, flappy.cloudY, cloudW, cloudH); } catch (e) { /* ignore until image loads */ }
	ctx.globalAlpha = 1.0;

	// if gameOver, draw GAME OVER text above the score area
	if (flappy.gameOver) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.font = 'bold 28px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('GAME OVER', flappy.width / 2, 32);
	}
}
