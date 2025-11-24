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

// Default background and audio
const defaultTheme = { video: 'BackGround.webp', audio: 'Backgroundmusic.mp3' };

// State management
const weatherState = {
	audioEnabled: true,
	backgroundEnabled: true,
	currentVideo: defaultTheme.video,
	currentAudio: defaultTheme.audio,
	videoPlaying: false,
	audioPlaying: false
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
		});
	}, 2000);
}

$(document).ready(function () {
	// Show splash first
	initSplashScreen();
	// Delay app init to allow splash to show
	setTimeout(function () {
		weatherFn('Salt Lake City');
		initControls();
		playBackgroundMedia();
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

	if (audioEl.src !== audioSrc) {
		audioEl.src = audioSrc;
		audioEl.load();
	}

	if (weatherState.audioEnabled) {
		audioEl.play().catch(err => {
			console.log('Audio autoplay prevented:', err);
		});
		weatherState.audioPlaying = true;
	} else {
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
	if (weatherState.audioEnabled) {
		playAudio();
	} else {
		const audioEl = document.getElementById('weather-audio');
		audioEl.pause();
		weatherState.audioPlaying = false;
	}
}

// Fetch weather and switch background/audio
async function weatherFn(cName) {
	const temp =
		`${url}?q=${cName}&appid=${apiKey}&units=imperial`;
	try {
		const res = await fetch(temp);
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

function weatherShowFn(data) {
	$('#city-name').text(data.name);
	$('#date').text(moment().
		format('MMMM Do YYYY, h:mm:ss a'));
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