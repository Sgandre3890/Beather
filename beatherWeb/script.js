
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
		const langSel = getLang();
		$('#game-score').text(getT(langSel,'label.score','Score') + ': ' + gameScore);
	} else if (game === 'flappy') {
		flappy.score = currentScore;
		const langSel = getLang();
		$('#game-score').text(getT(langSel,'label.score','Score') + ': ' + flappy.score);
	}
	const stored = getBestScore(game);
	if (stored === null) {
		// first run: set and show so player sees a target
		setBestScore(game, currentScore);
		const langSel = getLang();
		$('#best-score').text(getT(langSel,'label.best','Best') + ': ' + currentScore);
	} else if (currentScore > stored) {
		// player surpassed stored best during play — update immediately
		setBestScore(game, currentScore);
		const langSel = getLang();
		$('#best-score').text(getT(langSel,'label.best','Best') + ': ' + currentScore);
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
	// tuned gravity/lift to feel fair and allow clearing pipes
	gravity: 0.38,
	// slightly stronger lift so clicking raises a bit more
	lift: -5.2,
	// per-game tunables
	pipeSpeed: 3.2,
	spawnRate: 75,
	pipes: [],
	pipeGap: 140,
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
	// Ensure timer is visible for Sunny Clicker
	$('#game-timer').show();
	// reload best score from storage at start (show 0 if none)
	const bs = getBestScore('sunny');
	const displayBest = bs === null ? 0 : bs;
	const langSel = getLang();
	$('#best-score').text(getT(getLang(),'label.best','Best') + ': ' + displayBest);
	$('#game-score').text(getT(getLang(),'label.score','Score') + ': 0');
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
	const langSel = getLang();
	$('#game-timer').text(getT(langSel,'label.timeup','Time Up!'));
	$('#game-area').html('<div style="font-size:1.3em;margin-top:18px;">' + getT(langSel,'label.score','Score') + ': ' + gameScore + '</div>');
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
				const langSel = getLang();
				$('#game-score').text(getT(langSel,'label.score','Score') + ': ' + gameScore + ' ' + getT(langSel,'frenzy.suffix','(FRENZY)'));
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
			$('#game-timer').text(gameTime + ' ' + getT(getLang(),'bonus.plus2s','(+2s!)'));
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
				const langSel = getLang();
				$('#game-score').text(getT(langSel,'label.score','Score') + ': ' + gameScore + ' ' + getT(langSel,'frenzy.suffix','(FRENZY)'));
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
		const langSel = getLang();
		$('#game-title').text(g === 'sunny' ? getT(langSel,'game.sunny.title','Sunny Clicker') : getT(langSel,'game.flappy.title','Flappy Cloud'));
		$('#game-area').removeClass('flappy');
		$('#frenzy-banner').addClass('hidden');
		$('#best-score').text(getT(langSel,'label.best','Best') + ': ' + (localStorage.getItem('beather_best_score_' + g) || '0'));
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

// Remember last fetched coordinates to update weather on language change
let lastCoords = null;
let lastPlaceMeta = null;

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

// Minimal country name localization (extend as needed)
const countryNames = {
	'US': { en: 'United States', zh_cn: '美国', es: 'Estados Unidos' },
	'GB': { en: 'United Kingdom', zh_cn: '英国', es: 'Reino Unido' },
	'CN': { en: 'China', zh_cn: '中国', es: 'China' },
	'JP': { en: 'Japan', zh_cn: '日本', es: 'Japón' },
	'KR': { en: 'South Korea', zh_cn: '韩国', es: 'Corea del Sur' },
	'FR': { en: 'France', zh_cn: '法国', es: 'Francia' },
	'DE': { en: 'Germany', zh_cn: '德国', es: 'Alemania' },
	'ES': { en: 'Spain', zh_cn: '西班牙', es: 'España' },
	'IT': { en: 'Italy', zh_cn: '意大利', es: 'Italia' },
	'RU': { en: 'Russia', zh_cn: '俄罗斯', es: 'Rusia' },
	'IN': { en: 'India', zh_cn: '印度', es: 'India' },
	'BR': { en: 'Brazil', zh_cn: '巴西', es: 'Brasil' },
	'CA': { en: 'Canada', zh_cn: '加拿大', es: 'Canadá' },
	'AU': { en: 'Australia', zh_cn: '澳大利亚', es: 'Australia' }
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

// Asset base path (runtime-detected)
let IMAGES_BASE = '../Images/';
let assetBasePath = IMAGES_BASE + 'weatherbackground/';

function resolvePath(p) {
	if (!p) return p;
	if (p.startsWith('../Images/')) return IMAGES_BASE + p.substring('../Images/'.length);
	if (p.startsWith('Images/')) return IMAGES_BASE + p.substring('Images/'.length);
	return p;
}

function detectImagesBase(callback) {
	// Try ../Images/ first, then fallback to Images/
	const testFile = 'BeatherLogo2.png';
	const img = new Image();
	img.onload = function () {
		IMAGES_BASE = '../Images/';
		assetBasePath = IMAGES_BASE + 'weatherbackground/';
		try { rewriteDOMAssetPaths(); } catch (_) {}
		if (typeof callback === 'function') callback();
	};
	img.onerror = function () {
		const img2 = new Image();
		img2.onload = function () {
			IMAGES_BASE = 'Images/';
			assetBasePath = IMAGES_BASE + 'weatherbackground/';
			try { rewriteDOMAssetPaths(); } catch (_) {}
			if (typeof callback === 'function') callback();
		};
		img2.onerror = function () {
			// Couldn't resolve either; proceed with default
			if (typeof callback === 'function') callback();
		};
		img2.src = 'Images/' + testFile;
	};
	img.src = '../Images/' + testFile;
}

function rewriteDOMAssetPaths() {
	// Update existing DOM elements that referenced Images/ at build time
	document.querySelectorAll('img').forEach(el => {
		const s = el.getAttribute('src');
		if (s && (s.startsWith('../Images/') || s.startsWith('Images/'))) {
			el.src = resolvePath(s);
		}
	});
	document.querySelectorAll('source').forEach(el => {
		const s = el.getAttribute('src');
		if (s && (s.startsWith('../Images/') || s.startsWith('Images/'))) {
			el.src = resolvePath(s);
		}
	});
	// Remap in-memory game icon definitions
	try {
		if (Array.isArray(gameIcons)) {
			for (const ic of gameIcons) {
				if (ic && typeof ic.src === 'string') ic.src = resolvePath(ic.src);
			}
		}
	} catch (_) {}
	// Recompute weather media base
	assetBasePath = IMAGES_BASE + 'weatherbackground/';
}

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
	// Detect Images base as early as possible so splash/logo/media paths resolve both in repo and in downloaded zips
	detectImagesBase(function(){
		try { rewriteDOMAssetPaths(); } catch(_){}
	});
	// Show splash first
	initSplashScreen();
	// Initialize controls and wait for user to request weather
	setTimeout(function () {
		// Default enable audio/video at startup
		localStorage.setItem('beather_audio','true');
		localStorage.setItem('beather_bgvideo','true');
		initControls();
		// Wire settings modal after controls init so it can reflect current state
		try { setupSettingsUI(); } catch(_) {}
		// After detection, ensure current weather media sources are re-evaluated
		try { playBackgroundMedia(); updateVideoState(); } catch (_) {}
		// Apply language from storage and i18n once on startup; future changes via Settings modal
		const savedLang = localStorage.getItem('beather_lang') || 'en';
		applyI18n(savedLang);
		// Default display preference
		const displayPref = localStorage.getItem('beather_display') || 'temp';
		if (displayPref === 'temp') { $('#temperature').show(); $('#wind-speed').hide(); }
		else { $('#wind-speed').show(); $('#temperature').hide(); }

		$('#city-input-btn').off('click').on('click', function () {
			const city = $('#city-input').val().trim();
			if (city) {
				const langSel = getLang();
				weatherFn(city, { lang: langSel });
			} else {
				alert(getT(getLang(), 'alert.enterCity', 'Please enter a city name.'));
			}
		});

		// Detect location handled via Settings modal now
	}, 500);
});

// Initialize control buttons
function initControls() {
	const audioBtn = $('#toggle-audio');
	const bgBtn = $('#toggle-background');

	// Apply persisted preferences
	try {
		const storedAudio = localStorage.getItem('beather_audio');
		if (storedAudio !== null) weatherState.audioEnabled = (storedAudio === 'true');
		const storedBg = localStorage.getItem('beather_bgvideo');
		if (storedBg !== null) weatherState.backgroundEnabled = (storedBg === 'true');
		const storedVol = parseFloat(localStorage.getItem('beather_volume'));
		if (!isNaN(storedVol)) {
			const audioEl = document.getElementById('weather-audio');
			if (audioEl) audioEl.volume = Math.min(1, Math.max(0, storedVol));
		}
	} catch(_) {}

	// Legacy buttons (may not exist) — keep harmless bindings
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

	// Initialize states
	updateAudioState();
	updateVideoState();
	// Initialize button visuals if present
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
		'btn.showTemp': 'Show Temperature',
		'btn.showWind': 'Show Wind',
		'input.city': 'Enter city name',
		'headline': 'Weather App — The best weather app',
		'label.date': 'Date',
		'label.temperature': 'Temperature',
		'label.description': 'Description',
		'label.wind': 'Wind',
		'label.windSpeed': 'Wind Speed',
		'label.score': 'Score',
		'label.best': 'Best',
		'label.timeup': 'Time Up!',
		'alert.enterCity': 'Please enter a city name.',
		'alert.cityNotFound': 'City not found. Please try again.',
		'alert.geoUnsupported': 'Geolocation is not supported by your browser.',
		'alert.geoError': 'Unable to retrieve location: ',
		'ctrl.playGame': 'Play Game',
		'ctrl.detectLocation': 'Detect Location',
		'ctrl.toggleAudio': 'Toggle Audio',
		'ctrl.toggleBackground': 'Toggle Background',
		'ctrl.language': 'Language',
		'frenzy.banner': 'FRENZY! +5s paused — All clicks +1',
		'frenzy.suffix': '(FRENZY)',
		'bonus.plus2s': '(+2s!)',
		'flappy.gameOver': 'GAME OVER',
		'units.title': 'Units',
		'units.auto': 'Auto',
		'units.metric': 'Metric (°C, m/s)',
		'units.imperial': 'Imperial (°F, mph)',
		'settings.title': 'Settings',
		'settings.media': 'Media',
		'settings.audio': 'Enable Audio',
		'settings.video': 'Enable Background Video',
		'settings.volume': 'Volume',
		'settings.localization': 'Localization',
		'settings.display': 'Display',
		'settings.location': 'Location',
		'settings.autoDetect': 'Auto detect location',
		'settings.detectNow': 'Detect Now',
		'settings.manualCity': 'Manual city',
		'settings.fetchWeather': 'Fetch Weather',
		'settings.save': 'Save'
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
		'btn.showTemp': '显示气温',
		'btn.showWind': '显示风速',
		'input.city': '输入城市名称',
		'headline': '天气应用 — 最好的天气应用',
		'label.date': '日期',
		'label.temperature': '气温',
		'label.description': '描述',
		'label.wind': '风',
		'label.windSpeed': '风速',
		'label.score': '分数',
		'label.best': '最高',
		'label.timeup': '时间到！',
		'alert.enterCity': '请输入城市名称。',
		'alert.cityNotFound': '未找到城市，请重试。',
		'alert.geoUnsupported': '您的浏览器不支持地理定位。',
		'alert.geoError': '无法获取位置：',
		'ctrl.playGame': '开始游戏',
		'ctrl.detectLocation': '定位',
		'ctrl.toggleAudio': '切换音频',
		'ctrl.toggleBackground': '切换背景',
		'ctrl.language': '语言',
		'frenzy.banner': '狂热！暂停5秒 — 所有点击+1',
		'frenzy.suffix': '（狂热）',
		'bonus.plus2s': '（+2秒！）',
		'flappy.gameOver': '游戏结束',
		'units.title': '单位',
		'units.auto': '自动',
		'units.metric': '公制（°C，m/s）',
		'units.imperial': '英制（°F，mph）',
		'settings.title': '设置',
		'settings.media': '媒体',
		'settings.audio': '开启音频',
		'settings.video': '开启背景视频',
		'settings.volume': '音量',
		'settings.localization': '本地化',
		'settings.display': '显示',
		'settings.location': '定位',
		'settings.autoDetect': '自动定位',
		'settings.detectNow': '立刻定位',
		'settings.manualCity': '手动输入城市',
		'settings.fetchWeather': '获取天气',
		'settings.save': '保存'
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
		'btn.showTemp': 'Mostrar temperatura',
		'btn.showWind': 'Mostrar viento',
		'input.city': 'Ingresa el nombre de la ciudad',
		'headline': 'Aplicación del clima — La mejor app del clima',
		'label.date': 'Fecha',
		'label.temperature': 'Temperatura',
		'label.description': 'Descripción',
		'label.wind': 'Viento',
		'label.windSpeed': 'Velocidad del viento',
		'label.score': 'Puntaje',
		'label.best': 'Mejor',
		'label.timeup': '¡Tiempo!',
		'alert.enterCity': 'Por favor ingresa una ciudad.',
		'alert.cityNotFound': 'Ciudad no encontrada. Inténtalo de nuevo.',
		'alert.geoUnsupported': 'Tu navegador no soporta geolocalización.',
		'alert.geoError': 'No se puede obtener la ubicación: ',
		'ctrl.playGame': 'Jugar',
		'ctrl.detectLocation': 'Detectar ubicación',
		'ctrl.toggleAudio': 'Alternar audio',
		'ctrl.toggleBackground': 'Alternar fondo',
		'ctrl.language': 'Idioma',
		'frenzy.banner': '¡FRENESÍ! pausa de 5s — Todos los clics +1',
		'frenzy.suffix': '(FRENESÍ)',
		'bonus.plus2s': '(+2s!)',
		'flappy.gameOver': 'FIN DEL JUEGO',
		'units.title': 'Unidades',
		'units.auto': 'Auto',
		'units.metric': 'Métrico (°C, m/s)',
		'units.imperial': 'Imperial (°F, mph)',
		'settings.title': 'Configuración',
		'settings.media': 'Medios',
		'settings.audio': 'Habilitar audio',
		'settings.video': 'Habilitar video de fondo',
		'settings.volume': 'Volumen',
		'settings.localization': 'Localización',
		'settings.display': 'Mostrar',
		'settings.location': 'Ubicación',
		'settings.autoDetect': 'Detección automática',
		'settings.detectNow': 'Detectar ahora',
		'settings.manualCity': 'Ciudad manual',
		'settings.fetchWeather': 'Obtener clima',
		'settings.save': 'Guardar'
	}
};

function getLang() {
    return localStorage.getItem('beather_lang') || 'en';
}

function getT(lang, key, fallback) {
    const dict = i18n[lang] || i18n.en;
    const val = dict[key];
    return (val === undefined || val === null) ? (fallback !== undefined ? fallback : key) : val;
}

function applyI18n(lang) {
	const dict = i18n[lang] || i18n.en;
	const skipDynamicIds = new Set(['date','temperature','description','wind-speed','city-name']);
	// text content
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.getAttribute('data-i18n');
		if (key) {
			if (el.id && skipDynamicIds.has(el.id)) return; // don't overwrite dynamic values
			const txt = dict[key] !== undefined ? dict[key] : (i18n.en[key] !== undefined ? i18n.en[key] : el.textContent);
			if (txt !== undefined) el.textContent = txt;
		}
	});
	// placeholders
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		const key = el.getAttribute('data-i18n-placeholder');
		if (key) {
			const txt = dict[key] !== undefined ? dict[key] : (i18n.en[key] !== undefined ? i18n.en[key] : el.getAttribute('placeholder'));
			if (txt !== undefined) el.setAttribute('placeholder', txt);
		}
	});

	// Control button titles
	$('#gamepad-btn').attr('title', getT(lang, 'ctrl.playGame', 'Play Game'));
	$('#settings-btn').attr('title', getT(lang, 'settings.title', 'Settings'));

	// Frenzy banner
	$('#frenzy-banner').text(getT(lang, 'frenzy.banner', 'FRENZY! +5s paused — All clicks +1'));

	// Settings modal i18n
	$('#settings-modal [data-i18n]').each(function(){
		const el = this; const key = el.getAttribute('data-i18n'); if (!key) return;
		el.textContent = getT(lang, key, el.textContent);
	});
	$('#settings-modal [data-i18n-placeholder]').each(function(){
		const el = this; const key = el.getAttribute('data-i18n-placeholder'); if (!key) return;
		el.setAttribute('placeholder', getT(lang, key, el.getAttribute('placeholder')));
	});
	// Units options inside settings modal
	$('#set-units option[value="auto"]').text(getT(lang,'units.auto','Auto'));
	$('#set-units option[value="metric"]').text(getT(lang,'units.metric','Metric (°C, m/s)'));
	$('#set-units option[value="imperial"]').text(getT(lang,'units.imperial','Imperial (°F, mph)'));

	// Buttons text that may miss data-i18n in HTML
	$('#game-menu-cancel').text(getT(lang,'btn.cancel','Cancel'));
	$('#game-exit').text(getT(lang,'btn.exit','Exit Game'));
	$('#game-restart').text(getT(lang,'btn.restart','Restart'));
	$('#city-input-btn').text(getT(lang,'btn.getWeather','Get Weather'));
	// If no game selected yet, set a generic title
	if (!window.activeGame) {
		$('#game-title').text(getT(lang, 'game.title', 'Game'));
	}

	// Update date locale immediately
	try {
		moment && moment.locale && moment.locale(mapLangToMoment(lang));
		updateClock();
	} catch (_) {}
}
// Units preference: auto/metric/imperial
function getPreferredUnits(lang) {
	const saved = localStorage.getItem('beather_units') || 'auto';
	if (saved !== 'auto') return saved; // user-specified
	// Auto by language: zh/es => metric, en => imperial (customize as needed)
	const l = (lang || 'en').toLowerCase();
	if (l.startsWith('zh') || l.startsWith('es') || l.startsWith('fr') || l.startsWith('de') || l.startsWith('it')) return 'metric';
	return 'imperial';
}

function formatTemperature(tempK, units) {
	// OpenWeather returns temp according to 'units' we request
	return tempK; // temp will already be in selected units
}

function unitSymbols(units) {
	return {
		temperature: units === 'metric' ? '°C' : '°F',
		windSpeed: units === 'metric' ? 'm/s' : 'mph'
	};
}

// Map our lang codes to moment locales
function mapLangToMoment(lang) {
    if (!lang) return 'en';
    if (lang.toLowerCase() === 'zh_cn') return 'zh-cn';
    return lang.toLowerCase();
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

// Geolocate and fetch weather
function detectLocationAndFetch() {
	const langSel = getLang();
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (pos) {
			const lat = pos.coords.latitude;
			const lon = pos.coords.longitude;
			const units = getPreferredUnits(langSel);
			weatherFn({ lat, lon }, { lang: langSel, units });
		}, function (err) {
			alert(getT(langSel, 'alert.geoError', 'Unable to retrieve location: ') + err.message);
		});
	} else {
		alert(getT(langSel, 'alert.geoUnsupported', 'Geolocation is not supported by your browser.'));
	}
}

// Settings modal wiring
function setupSettingsUI() {
	const modal = document.getElementById('settings-modal');
	const btn = document.getElementById('settings-btn');
	const closeBtn = document.getElementById('settings-cancel') || document.getElementById('settings-close');
	const saveBtn = document.getElementById('settings-save');
	if (!modal || !btn || !closeBtn || !saveBtn) return;

	function syncFromStorage() {
		// reflect current storage/state into controls
		const audioChk = document.getElementById('set-audio-enabled');
		const videoChk = document.getElementById('set-video-enabled');
		const volEl = document.getElementById('set-volume');
		const langEl = document.getElementById('set-language');
		const unitsEl = document.getElementById('set-units');
		const autoEl = document.getElementById('set-auto-detect');
		const cityEl = document.getElementById('set-manual-city');
		const dispTempEl = document.getElementById('set-display-temp');
		const dispWindEl = document.getElementById('set-display-wind');
		if (audioChk) audioChk.checked = (localStorage.getItem('beather_audio') === 'true');
		if (videoChk) videoChk.checked = (localStorage.getItem('beather_bgvideo') === 'true');
		const vol = parseFloat(localStorage.getItem('beather_volume') || '0.6');
		if (volEl) volEl.value = String(Math.round(Math.min(1, Math.max(0, vol)) * 100));
		const lang = getLang();
		if (langEl) langEl.value = lang;
		if (unitsEl) unitsEl.value = localStorage.getItem('beather_units') || 'auto';
		if (autoEl) autoEl.checked = (localStorage.getItem('beather_autoDetect') === 'true');
		if (cityEl) cityEl.value = localStorage.getItem('beather_lastCity') || '';
		const displayPref = localStorage.getItem('beather_display') || 'temp';
		if (dispTempEl) dispTempEl.checked = (displayPref === 'temp');
		if (dispWindEl) dispWindEl.checked = (displayPref === 'wind');
	}

	btn.addEventListener('click', function() {
		try { applyI18n(getLang()); } catch(_) {}
		syncFromStorage();
		modal.style.display = 'flex';
	});
	closeBtn.addEventListener('click', function(){ modal.style.display = 'none'; });
	modal.addEventListener('click', function(e){ if (e.target === modal) modal.style.display = 'none'; });

	const detectBtn = document.getElementById('set-detect-now');
	if (detectBtn) detectBtn.addEventListener('click', function(){ detectLocationAndFetch(); });
	const fetchBtn = document.getElementById('set-fetch-city');
	if (fetchBtn) fetchBtn.addEventListener('click', function(){
		const city = (document.getElementById('set-manual-city')?.value || '').trim();
		if (!city) return;
		localStorage.setItem('beather_lastCity', city);
		const lang = getLang();
		const units = getPreferredUnits(lang);
		window.lastQuery = city;
		weatherFn(city, { lang, units });
	});

		saveBtn.addEventListener('click', function(){
			const audio = document.getElementById('set-audio-enabled').checked;
			const video = document.getElementById('set-video-enabled').checked;
			const volPct = parseInt(document.getElementById('set-volume').value || '60', 10);
			const lang = document.getElementById('set-language').value || 'en';
			const units = document.getElementById('set-units').value || 'auto';
			const autoDetect = document.getElementById('set-auto-detect').checked;
			const city = (document.getElementById('set-manual-city')?.value || '').trim();
			const displayPref = document.getElementById('set-display-wind').checked ? 'wind' : 'temp';

		localStorage.setItem('beather_audio', String(audio));
		localStorage.setItem('beather_bgvideo', String(video));
		localStorage.setItem('beather_volume', String(Math.min(100, Math.max(0, volPct)) / 100));
		localStorage.setItem('beather_lang', lang);
		localStorage.setItem('beather_units', units);
		localStorage.setItem('beather_autoDetect', String(autoDetect));
		if (city) localStorage.setItem('beather_lastCity', city);
		localStorage.setItem('beather_display', displayPref);

		// Apply immediately
		weatherState.audioEnabled = audio;
		weatherState.backgroundEnabled = video;
		const audioEl = document.getElementById('weather-audio');
		if (audioEl) audioEl.volume = Math.min(1, Math.max(0, volPct/100));
		updateAudioState();
		updateVideoState();
		moment && moment.locale && moment.locale(mapLangToMoment(lang));
		applyI18n(lang);
		// Apply display preference immediately
		if (displayPref === 'temp') {
			$('#temperature').show();
			$('#wind-speed').hide();
		} else {
			$('#wind-speed').show();
			$('#temperature').hide();
		}

		// Refresh weather according to preference
		const effUnits = (units === 'auto') ? getPreferredUnits(lang) : units;
		if (autoDetect) {
			detectLocationAndFetch();
		} else if (city) {
			window.lastQuery = city;
			weatherFn(city, { lang, units: effUnits });
		} else if (window.lastQuery) {
			weatherFn(window.lastQuery, { lang, units: effUnits });
		} else if (window.lastCoords) {
			weatherFn(window.lastCoords, { lang, units: effUnits });
		}

		modal.style.display = 'none';
	});
}

// Fetch weather and switch background/audio
async function weatherFn(query, options = {}) {
	// language code (e.g., 'en', 'zh_cn', 'es'); default to browser language
	const lang = options.lang || (navigator.language ? navigator.language.toLowerCase().replace('-', '_') : 'en');
	const units = options.units || getPreferredUnits(lang);

	let coords = null;
	try {
		if (typeof query === 'string') {
			// Resolve city name in any language using geocoding API
			const geoEndpoint = `${geoUrl}?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
			const gres = await fetch(geoEndpoint);
			const gdata = await gres.json();
			if (Array.isArray(gdata) && gdata.length > 0) {
				coords = { lat: gdata[0].lat, lon: gdata[0].lon };
				// save place meta for localized display
				lastPlaceMeta = {
					name: gdata[0].name,
					country: gdata[0].country,
					localNames: gdata[0].local_names || gdata[0].localNames || {}
				};
			} else {
				alert(getT(lang,'alert.cityNotFound','City not found. Please try again.'));
				return;
			}
		} else if (query && query.lat !== undefined && query.lon !== undefined) {
			coords = { lat: query.lat, lon: query.lon };
			// No new place meta in this flow; use lastPlaceMeta if exists
		} else {
			console.error('Invalid weather query:', query);
			return;
		}

		// Save last coords for re-fetch on language change
		lastCoords = coords;

		const endpoint = `${url}?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=${encodeURIComponent(units)}&lang=${encodeURIComponent(lang)}`;
		const res = await fetch(endpoint);
		const data = await res.json();
		if (res.ok) {
			const weatherMain = data.weather[0].main.toLowerCase();
			switchWeatherTheme(weatherMain);
			// keep lastPlaceMeta for geolocation case (no city meta); store globally for reuse
			window.lastPlaceMeta = lastPlaceMeta || window.lastPlaceMeta || null;
			weatherShowFn(data, { lang, units, placeMeta: window.lastPlaceMeta });
		} else {
			alert(getT(lang,'alert.cityNotFound','City not found. Please try again.'));
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
		$('#date').text(moment(target).format('LLLL'));
	} else {
		$('#date').text(moment(now).format('LLLL'));
	}
}

function getCountryName(code, lang) {
	if (!code) return '';
	const cc = code.toUpperCase();
	const byCode = countryNames[cc];
	if (!byCode) return cc;
	const val = byCode[lang] || byCode['en'] || cc;
	return val;
}

function mapLangKeyForLocalNames(lang) {
	if (!lang) return 'en';
	if (lang.toLowerCase() === 'zh_cn') return 'zh'; // OpenWeather local_names uses 'zh' key commonly
	return lang.toLowerCase();
}

function weatherShowFn(data, opts = {}) {
	const lang = (opts.lang || getLang());
	const units = opts.units || getPreferredUnits(lang);
	const placeMeta = opts.placeMeta || window.lastPlaceMeta || null;
	// Derive display city name with local_names preference
	let cityDisplay = data.name || '';
	if (placeMeta) {
		const lk = mapLangKeyForLocalNames(lang);
		if (placeMeta.localNames && placeMeta.localNames[lk]) {
			cityDisplay = placeMeta.localNames[lk];
		} else if (placeMeta.name) {
			cityDisplay = placeMeta.name;
		}
	}
	// Country localized
	let countryCode = (placeMeta && placeMeta.country) || (data.sys && data.sys.country);
	const countryDisplay = countryCode ? getCountryName(countryCode, lang) : '';
	$('#city-name').text(countryDisplay ? `${cityDisplay}, ${countryDisplay}` : cityDisplay);
	// Start live clock using city's timezone offset (seconds)
	if (data && data.timezone !== undefined) {
		startClock(data.timezone);
	} else {
		startClock(null);
	}
	// Temperature with units
	const symbols = unitSymbols(units);
	$('#temperature').
		html(`${Math.round(data.main.temp)}${symbols.temperature}`);
	$('#description').
		text(data.weather[0].description);
	$('#wind-speed').
		html(`${getT(getLang(),'label.windSpeed','Wind Speed')}: ${Math.round(data.wind.speed)} ${symbols.windSpeed}`);

	$('#weather-info').fadeIn();
}

// ------------------ Flappy Cloud implementation ------------------
// Configuration: you can set `pipeImageSrc` to a URL of a pipe texture.
// By default use the sample SVG we added to the repo.
// Use layered pipe images (back + front) for better depth
let pipeImageSrc = resolvePath('../Images/pipes/pipe_back.svg');
let pipeFrontImageSrc = resolvePath('../Images/pipes/pipe_front.svg');

function startFlappy() {
	// reset state
	// Hide timer for Flappy Cloud (no countdown used)
	$('#game-timer').hide();
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
	$('#game-score').text(getT(getLang(),'label.score','Score') + ': 0');
	const best = getBestScore('flappy');
	$('#best-score').text(getT(getLang(),'label.best','Best') + ': ' + (best === null ? 0 : best));

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
	// ensure smooth scaling for cloud sprites
	try { flappy.ctx.imageSmoothingEnabled = true; } catch(_) {}

	// load cloud images
	flappy.cloudImgs = {
		happy: new Image(),
		sad: new Image(),
		veryhappy: new Image()
	};
	flappy.cloudImgs.happy.src = resolvePath('../Images/clouds/happycloud.svg');
	flappy.cloudImgs.sad.src = resolvePath('../Images/clouds/sadcloud.svg');
	flappy.cloudImgs.veryhappy.src = resolvePath('../Images/clouds/veryhappycloud.svg');
	flappy.currentImg = flappy.cloudImgs.happy;
	// cloud drawing size and collision inset (slightly larger for clarity)
	flappy.cloudDrawW = 50;
	flappy.cloudDrawH = 40;
	flappy.collisionInset = 10; // shrink collision box by inset on each side
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
	// Only trigger flap when the Flappy game is active to avoid interfering with page inputs
	flappy._keydownHandler = function (e) {
		// Ensure game overlay is active and Flappy is the selected game
		if (!gameActive || activeGame !== 'flappy' || !flappy.running) return;
		if (e.code === 'Space' || e.key === ' ') {
			// prevent default (page scroll / button activation) and flap
			try { e.preventDefault(); } catch (err) { /* ignore */ }
			flapHandler(e);
		}
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
	// clamp velocity to avoid instant wrap or too-fast falls
	if (flappy.velocity > 6.5) flappy.velocity = 6.5;
	if (flappy.velocity < -7.0) flappy.velocity = -7.0;
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
		flappy.cloudY = groundY - cloudH; // clamp at ground to avoid wrap
		handleFlappyCollision('ground');
	}

	// spawn pipes
	flappy.frameCount++;
	if (flappy.frameCount % (flappy.spawnRate || 75) === 0) {
		// Normalize pipe gap: consistent bounds and slight tightening over progress
		const progressFactor = Math.min(1, (flappy.totalPassed || 0) / 50); // 0..1, slower difficulty ramp
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
		p.x -= (flappy.pipeSpeed || 3.2);
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
		ctx.fillText(getT(getLang(),'flappy.gameOver','GAME OVER'), flappy.width / 2, 32);
	}
}
