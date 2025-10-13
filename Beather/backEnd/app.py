from flask import Flask, render_template, request
import requests

app = Flask(__name__)

API_KEY = "04b2c70f5678cb788cb9d62c0325ef32"

@app.route('/', methods=['GET', 'POST'])
def home():
    weather = None
    if request.method == 'POST':
        city = request.form['city']
        url = f'https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=imperial'
        response = requests.get(url)
        data = response.json()
        if response.status_code == 200:
            weather = {
                'city': city,
                'temperature': data['main']['temp'],
                'description': data['weather'][0]['description']
            }
        else:
            weather = {'error': 'City not found'}
    return render_template('index.html', weather=weather)
