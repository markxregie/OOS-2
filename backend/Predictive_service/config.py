# API Keys and Configuration
API_KEYS = {
    "visual_crossing": "5T7BU5TDG8BH8VZAAFSVUW998",
    "weather_api": "b7e008af9a644d2a986141025252110",
    "open_weather": "8bfbf814155160b534c8b4c4b1e89250",
    "calendarific": "ltgNdJLlnQAAixcj88erEndHhwuA21cZ"
}

# API Endpoints
WEATHER_APIS = {
    "visual_crossing": {
        "base_url": "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline",
        "key_param": "key"
    },
    "weather_api": {
        "base_url": "https://api.weatherapi.com/v1",
        "key_param": "key"
    },
    "open_weather": {
        "base_url": "https://api.openweathermap.org/data",
        "key_param": "appid"
    }
}

HOLIDAY_APIS = {
    "calendarific": {
        "base_url": "https://calendarific.com/api/v2",
        "key_param": "api_key"
    },
    "nager": {
        "base_url": "https://date.nager.at/api/v3",
        "key_param": None
    }
}
