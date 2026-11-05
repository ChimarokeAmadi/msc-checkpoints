# Weather App

A weather app made with HTML, CSS and plain JavaScript. You type a city and it shows the current temperature, a description of the weather, the "feels like" temperature, humidity, wind, today's high and low, and a 5-day forecast.

## How to use it

Open `index.html` in your browser by double-clicking it. There's nothing to install and no API key needed. It starts with the last city you searched (Tunis the first time), and then you can:

- type any city and press **Search** (or Enter)
- click **📍** to get the weather where you are (the browser asks for permission)
- switch between **°C and °F** with the buttons at the top (the wind speed switches between km/h and mph too)

The app remembers your last city and your unit choice for next time. The background colour changes with the weather (sunny, cloudy, rain, snow, storm), and turns dark blue at night.

## The files

- **`index.html`** has the page structure: the meta tags for the character set and viewport, the link to `styles.css`, the search form, a status line for loading and error messages, the current weather card and the forecast section. `script.js` is loaded at the end of the body.
- **`styles.css`** has all the styling. I used classes and IDs for the containers, the glass-style cards, the buttons and the background themes. A media query for screens under 480px stacks the details one under the other and lets the forecast scroll sideways on phones.
- **`script.js`** fetches the data and updates the page.

## How the JavaScript works

I used the **Open-Meteo** API because it's free and doesn't need an API key, so the app works straight away for anyone who opens it. (MetaWeather, mentioned in the instructions, doesn't exist anymore. OpenWeatherMap would also work, but every user would need to create their own key.) Getting the weather takes two requests with `fetch()` and `async/await`:

1. **Geocoding:** `findCity(name)` sends the city name to the geocoding API and gets back its latitude, longitude and country.
2. **Forecast:** `getWeather(lat, lon)` asks the forecast API for the current weather and 5 days of highs and lows.

The JSON response describes the weather with a number (a WMO weather code, for example 63 = rain), so `describeWeather()` turns that code into a description, an emoji icon and a background theme. Then `render()` updates the page by setting the `textContent` of each element and building the 5 forecast cards. The data is always fetched in °C, so switching to °F just converts the numbers and re-renders, without a new request.

## Errors I handle

- **City not found:** "No city called … was found. Check the spelling and try again."
- **No internet:** "Could not reach the weather service. Check your internet connection."
- **The API answers with an error:** the status code is shown in a message.
- **Empty search:** "Please type a city name."
- **Location blocked:** if you refuse location access, it asks you to search for a city instead.

While a request is loading, the buttons are disabled and a "Searching…" message is shown. Errors appear in a red box, and the last good result stays on screen.

## Testing

I tested it in a browser with several cities: Tunis, London and Lagos. I also tried a city that doesn't exist, an empty search, switching °C/°F, and reloading the page (it remembers the last city). I checked it at desktop width and at phone width (375px), and there were no errors in the console.
