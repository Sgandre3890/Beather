from flask import Flask, request, jsonify
import requests

#This is a sample to see if it works

app = Flask(__name__)

API_KEY = 'your_openweathermap_api_key'

@app.route('/')
def home():
    return "Welcome to the Weather App!"

@app.route('/weather')
def get_weather():
    city = request.args.get('city', 'Salt Lake City')
    url = f'https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=imperial'
    response = requests.get(url)
    data = response.json()

    if response.status_code == 200:
        return jsonify({
            'city': city,
            'temperature': data['main']['temp'],
            'description': data['weather'][0]['description']
        })
    else:
        return jsonify({'error': 'City not found'}), 404
