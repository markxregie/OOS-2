from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
import requests
from database import get_db_connection
from prophet import Prophet
import pandas as pd
from datetime import datetime, timedelta
import os
from config import API_KEYS, WEATHER_APIS, HOLIDAY_APIS

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

async def validate_token_and_roles(token: str, allowed_roles: List[str]):
    USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_ME_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            error_detail = f"Auth service error: {e.response.status_code} - {e.response.text}"
            logger.error(error_detail)
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except httpx.RequestError as e:
            logger.error(f"Auth service unavailable: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Auth service unavailable: {e}")

    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return user_data

class ForecastRequest(BaseModel):
    periods: int = 30  # Number of days to forecast

@router.post("/forecast/orders")
async def forecast_orders(request: ForecastRequest, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        # Fetch historical order data: daily order counts
        await cursor.execute("""
            SELECT CONVERT(date, OrderDate) as order_date, COUNT(*) as order_count
            FROM Orders
            WHERE OrderDate >= DATEADD(month, -6, GETDATE())  -- Last 6 months for training
            GROUP BY CONVERT(date, OrderDate)
            ORDER BY order_date
        """)

        rows = await cursor.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No historical order data found")

        # Prepare data for Prophet
        df = pd.DataFrame(rows, columns=['ds', 'y'])
        df['ds'] = pd.to_datetime(df['ds'])

        # Fit Prophet model
        model = Prophet()
        model.fit(df)

        # Make future dataframe
        future = model.make_future_dataframe(periods=request.periods)

        # Forecast
        forecast = model.predict(future)

        # Prepare response
        forecast_data = []
        for _, row in forecast.iterrows():
            forecast_data.append({
                "date": row['ds'].strftime("%Y-%m-%d"),
                "predicted_orders": round(row['yhat'], 2),
                "lower_bound": round(row['yhat_lower'], 2),
                "upper_bound": round(row['yhat_upper'], 2)
            })

        return {
            "forecast": forecast_data,
            "periods": request.periods,
            "model_info": "Prophet forecasting model used"
        }

    except Exception as e:
        logger.error(f"Error generating forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate forecast")
    finally:
        await cursor.close()
        await conn.close()

@router.get("/historical/orders")
async def get_historical_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT CONVERT(date, OrderDate) as order_date, COUNT(*) as order_count
            FROM Orders
            GROUP BY CONVERT(date, OrderDate)
            ORDER BY order_date DESC
            OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY  -- Last 100 days
        """)

        rows = await cursor.fetchall()

        historical_data = []
        for row in rows:
            historical_data.append({
                "date": row[0].strftime("%Y-%m-%d"),
                "orders": row[1]
            })

        return {"historical_orders": historical_data}

    except Exception as e:
        logger.error(f"Error fetching historical orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch historical orders")
    finally:
        await cursor.close()
        await conn.close()

@router.get("/weather")
async def get_weather_data(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    try:
        # Try Visual Crossing API first (primary)
        visual_crossing = WEATHER_APIS["visual_crossing"]
        visual_crossing_url = f"{visual_crossing['base_url']}/philippines"
        params = {
            "unitGroup": "us",
            "include": "alerts,hours,events,current,minutes",
            visual_crossing['key_param']: API_KEYS["visual_crossing"],
            "contentType": "json"
        }

        response = requests.get(visual_crossing_url, params=params)
        response.raise_for_status()
        weather_data = response.json()

        return {"weather_data": weather_data, "source": "visual_crossing"}

    except Exception as e:
        logger.warning(f"Visual Crossing API failed: {e}, trying WeatherAPI as backup")

        try:
            # Fallback to WeatherAPI
            weather_api = WEATHER_APIS["weather_api"]
            weather_api_url = f"{weather_api['base_url']}/current.json"
            params = {
                "q": "Philippines",
                weather_api['key_param']: API_KEYS["weather_api"]
            }

            response = requests.get(weather_api_url, params=params)
            response.raise_for_status()
            weather_data = response.json()

            return {"weather_data": weather_data, "source": "weather_api"}

        except Exception as e2:
            logger.warning(f"WeatherAPI failed: {e2}, trying OpenWeatherMap as backup")

            try:
                # Final fallback to OpenWeatherMap
                open_weather = WEATHER_APIS["open_weather"]
                open_weather_url = f"{open_weather['base_url']}/2.5/weather"
                params = {
                    "q": "Philippines",
                    open_weather['key_param']: API_KEYS["open_weather"],
                    "units": "metric"
                }

                response = requests.get(open_weather_url, params=params)
                response.raise_for_status()
                weather_data = response.json()

                return {"weather_data": weather_data, "source": "open_weather"}

            except Exception as e3:
                logger.error(f"All weather APIs failed: VC={e}, WA={e2}, OW={e3}", exc_info=True)
                raise HTTPException(status_code=500, detail="All weather APIs unavailable")

@router.get("/holidays/{year}")
async def get_holidays(year: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    try:
        # Try Calendarific API first (primary)
        calendarific = HOLIDAY_APIS["calendarific"]
        calendarific_url = f"{calendarific['base_url']}/holidays"
        params = {
            calendarific['key_param']: API_KEYS["calendarific"],
            "country": "PH",
            "year": year
        }

        response = requests.get(calendarific_url, params=params)
        response.raise_for_status()
        holidays_data = response.json()

        return {"holidays": holidays_data, "source": "calendarific"}

    except Exception as e:
        logger.warning(f"Calendarific API failed: {e}, trying Nager.Date as backup")

        try:
            # Fallback to Nager.Date API
            nager = HOLIDAY_APIS["nager"]
            nager_url = f"{nager['base_url']}/PublicHolidays/{year}/PH"

            response = requests.get(nager_url)
            response.raise_for_status()
            holidays_data = response.json()

            return {"holidays": holidays_data, "source": "nager"}

        except Exception as e2:
            logger.error(f"All holiday APIs failed: Calendarific={e}, Nager={e2}", exc_info=True)
            raise HTTPException(status_code=500, detail="All holiday APIs unavailable")

@router.post("/forecast/sales")
async def forecast_sales_with_weather(request: ForecastRequest, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        # Fetch historical sales data with product details
        await cursor.execute("""
            SELECT
                CONVERT(date, o.OrderDate) as order_date,
                oi.ProductName,
                oi.ProductCategory,
                SUM(oi.Quantity) as total_quantity,
                SUM(oi.Quantity * oi.Price) as total_sales
            FROM Orders o
            JOIN OrderItems oi ON o.OrderID = oi.OrderID
            WHERE o.OrderDate >= DATEADD(month, -6, GETDATE())
            GROUP BY CONVERT(date, o.OrderDate), oi.ProductName, oi.ProductCategory
            ORDER BY order_date, oi.ProductName
        """)

        rows = await cursor.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No historical sales data found")

        # Convert to DataFrame
        df = pd.DataFrame(rows, columns=['ds', 'product_name', 'category', 'quantity', 'sales'])
        df['ds'] = pd.to_datetime(df['ds'])

        # Get weather data for additional features
        weather_response = requests.get(
            "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/philippines",
            params={
                "unitGroup": "us",
                "include": "days",
                "key": "5T7BU5TDG8BH8VZAAFSVUW998",
                "contentType": "json"
            }
        )

        weather_data = []
        if weather_response.status_code == 200:
            weather_json = weather_response.json()
            for day in weather_json.get('days', []):
                weather_data.append({
                    'ds': pd.to_datetime(day['datetime']),
                    'temp': day.get('temp', 0),
                    'precip': day.get('precip', 0),
                    'humidity': day.get('humidity', 0)
                })

        weather_df = pd.DataFrame(weather_data)

        # Merge sales with weather data
        df = df.merge(weather_df, on='ds', how='left').fillna(0)

        # Forecast for each product category
        forecasts = {}

        for category in df['category'].unique():
            category_data = df[df['category'] == category].copy()

            if len(category_data) < 10:  # Skip if insufficient data
                continue

            # Prepare data for Prophet with regressors
            prophet_df = category_data[['ds', 'sales', 'temp', 'precip', 'humidity']].copy()
            prophet_df.columns = ['ds', 'y', 'temp', 'precip', 'humidity']

            model = Prophet()
            model.add_regressor('temp')
            model.add_regressor('precip')
            model.add_regressor('humidity')

            model.fit(prophet_df)

            # Create future dataframe with weather predictions
            future = model.make_future_dataframe(periods=request.periods)

            # Add future weather data (simplified - using average values)
            future_weather = df[['temp', 'precip', 'humidity']].mean()
            future['temp'] = future_weather['temp']
            future['precip'] = future_weather['precip']
            future['humidity'] = future_weather['humidity']

            forecast = model.predict(future)

            forecasts[category] = {
                "forecast": [
                    {
                        "date": row['ds'].strftime("%Y-%m-%d"),
                        "predicted_sales": round(row['yhat'], 2),
                        "lower_bound": round(row['yhat_lower'], 2),
                        "upper_bound": round(row['yhat_upper'], 2)
                    } for _, row in forecast.iterrows()
                ],
                "top_products": category_data.groupby('product_name')['sales'].sum().nlargest(5).to_dict()
            }

        return {
            "forecasts_by_category": forecasts,
            "periods": request.periods,
            "model_info": "Prophet with weather regressors"
        }

    except Exception as e:
        logger.error(f"Error generating sales forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate sales forecast")
    finally:
        await cursor.close()
        await conn.close()
