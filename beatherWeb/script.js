const url =
	'https://api.openweathermap.org/data/2.5/weather';
const apiKey =
	'04b2c70f5678cb788cb9d62c0325ef32';

$(document).ready(function () {
	weatherFn('Salt Lake City'); // Set Noida as the initial city
});

async function weatherFn(cName) {
	const temp =
		`${url}?q=${cName}&appid=${apiKey}&units=metric`;
	try {
		const res = await fetch(temp);
		const data = await res.json();
		if (res.ok) {
			weatherShowFn(data);
		} else {
			alert('City not found. Please try again.');
		}
	} catch (error) {
		console.error('Error fetching weather data:', error);
	}
}

function weatherShowFn(data) {
	$('#city-name').text(data.name);
	$('#date').text(moment().
		format('MMMM Do YYYY, h:mm:ss a')); // Corrected date format to include year
	$('#temperature').
		html(`${Math.round(data.main.temp)}°C`); // Rounded temperature
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