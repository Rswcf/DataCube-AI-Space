"""
Stock data proxy endpoints using Polygon.io API.

This router proxies requests to Polygon.io (formerly Massive.com) to fetch
real-time stock data for the Secondary Market section. The API key is kept
server-side to avoid exposing it to the frontend.
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stock", tags=["stock"])

# Polygon.io API base URL
POLYGON_BASE_URL = "https://api.polygon.io"


class StockData(BaseModel):
    """Stock data response model."""
    ticker: str
    price: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    marketCap: Optional[float] = None
    name: Optional[str] = None
    error: Optional[str] = None


class BatchStockResponse(BaseModel):
    """Batch stock data response model."""
    stocks: dict[str, StockData]


def format_market_cap(value: Optional[float], language: str = "en") -> str:
    """Format market cap for display.

    Args:
        value: Market cap in dollars
        language: "de" for German formatting, "en" for English

    Returns:
        Formatted string like "$2.1T" or "$2,1 Bio."
    """
    if not value:
        return "N/A"

    if language == "de":
        # German formatting: use comma as decimal separator, period as thousand separator
        if value >= 1e12:
            num = f"{value / 1e12:.1f}".replace(".", ",")
            return f"${num} Bio."
        elif value >= 1e9:
            num = f"{value / 1e9:.1f}".replace(".", ",")
            return f"${num} Mrd."
        elif value >= 1e6:
            num = f"{value / 1e6:.1f}".replace(".", ",")
            return f"${num} Mio."
        else:
            return f"${value:,.0f}".replace(",", ".")
    else:
        if value >= 1e12:
            return f"${value / 1e12:.1f}T"
        elif value >= 1e9:
            return f"${value / 1e9:.1f}B"
        elif value >= 1e6:
            return f"${value / 1e6:.1f}M"
        else:
            return f"${value:,.0f}"


def format_price(value: Optional[float]) -> str:
    """Format price for display."""
    if not value:
        return "N/A"
    return f"${value:,.2f}"


def format_change_percent(value: Optional[float]) -> str:
    """Format change percent for display."""
    if value is None:
        return "N/A"
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"


@router.get("/{ticker}", response_model=StockData)
async def get_stock_data(ticker: str):
    """
    Get real-time stock data for a single ticker.

    Fetches data from Polygon.io snapshot and reference endpoints.
    Data is delayed by 15 minutes (Starter plan).

    Args:
        ticker: Stock ticker symbol (e.g., "AAPL", "NVDA")

    Returns:
        StockData with price, change, marketCap, and company name
    """
    settings = get_settings()

    if not settings.polygon_api_key:
        raise HTTPException(status_code=503, detail="Stock API not configured")

    ticker = ticker.upper()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Fetch snapshot (price, change)
            snapshot_url = f"{POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}"
            snapshot_resp = await client.get(
                snapshot_url,
                params={"apiKey": settings.polygon_api_key}
            )

            # Fetch ticker details (market cap, name)
            details_url = f"{POLYGON_BASE_URL}/v3/reference/tickers/{ticker}"
            details_resp = await client.get(
                details_url,
                params={"apiKey": settings.polygon_api_key}
            )

            # Parse responses
            snapshot_data = snapshot_resp.json() if snapshot_resp.status_code == 200 else {}
            details_data = details_resp.json() if details_resp.status_code == 200 else {}

            # Extract data from snapshot
            ticker_data = snapshot_data.get("ticker", {})
            day_data = ticker_data.get("day", {})

            price = day_data.get("c")  # closing/current price
            change = ticker_data.get("todaysChange")
            change_percent = ticker_data.get("todaysChangePerc")

            # Extract data from details
            results = details_data.get("results", {})
            market_cap = results.get("market_cap")
            name = results.get("name")

            return StockData(
                ticker=ticker,
                price=price,
                change=change,
                changePercent=change_percent,
                marketCap=market_cap,
                name=name,
            )

        except httpx.RequestError as e:
            logger.error(f"Failed to fetch stock data for {ticker}: {e}")
            return StockData(
                ticker=ticker,
                error=f"Failed to fetch data: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error fetching stock data for {ticker}: {e}")
            return StockData(
                ticker=ticker,
                error=f"Unexpected error: {str(e)}"
            )


@router.get("/batch/", response_model=BatchStockResponse)
async def get_batch_stock_data(
    tickers: str = Query(..., description="Comma-separated list of ticker symbols")
):
    """
    Get real-time stock data for multiple tickers.

    Args:
        tickers: Comma-separated list of ticker symbols (e.g., "AAPL,NVDA,PLTR")

    Returns:
        Dictionary mapping tickers to their stock data
    """
    settings = get_settings()

    if not settings.polygon_api_key:
        raise HTTPException(status_code=503, detail="Stock API not configured")

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    if not ticker_list:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers per request")

    results = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Use Polygon's grouped daily endpoint for batch fetching
        # This is more efficient than individual calls
        try:
            # For batch requests, we'll use the snapshot endpoint with multiple tickers
            # Polygon supports this via the tickers parameter
            snapshot_url = f"{POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers"
            snapshot_resp = await client.get(
                snapshot_url,
                params={
                    "tickers": ",".join(ticker_list),
                    "apiKey": settings.polygon_api_key
                }
            )

            if snapshot_resp.status_code == 200:
                snapshot_data = snapshot_resp.json()
                tickers_data = snapshot_data.get("tickers", [])

                # Build lookup from snapshot
                snapshot_lookup = {}
                for t in tickers_data:
                    ticker_symbol = t.get("ticker", "")
                    snapshot_lookup[ticker_symbol] = t

                # Fetch details for each ticker (market cap, name)
                for ticker in ticker_list:
                    try:
                        details_url = f"{POLYGON_BASE_URL}/v3/reference/tickers/{ticker}"
                        details_resp = await client.get(
                            details_url,
                            params={"apiKey": settings.polygon_api_key}
                        )
                        details_data = details_resp.json() if details_resp.status_code == 200 else {}
                        details_results = details_data.get("results", {})

                        # Get snapshot data
                        ticker_snapshot = snapshot_lookup.get(ticker, {})
                        day_data = ticker_snapshot.get("day", {})

                        results[ticker] = StockData(
                            ticker=ticker,
                            price=day_data.get("c"),
                            change=ticker_snapshot.get("todaysChange"),
                            changePercent=ticker_snapshot.get("todaysChangePerc"),
                            marketCap=details_results.get("market_cap"),
                            name=details_results.get("name"),
                        )
                    except Exception as e:
                        logger.warning(f"Failed to fetch details for {ticker}: {e}")
                        results[ticker] = StockData(
                            ticker=ticker,
                            error=str(e)
                        )
            else:
                # Fallback: fetch each ticker individually
                for ticker in ticker_list:
                    try:
                        data = await get_stock_data(ticker)
                        results[ticker] = data
                    except Exception as e:
                        results[ticker] = StockData(ticker=ticker, error=str(e))

        except httpx.RequestError as e:
            logger.error(f"Failed to fetch batch stock data: {e}")
            # Return error for all tickers
            for ticker in ticker_list:
                results[ticker] = StockData(ticker=ticker, error=str(e))

    return BatchStockResponse(stocks=results)


@router.get("/formatted/{ticker}")
async def get_formatted_stock_data(
    ticker: str,
    language: str = Query("en", description="Language for formatting: 'de' or 'en'")
):
    """
    Get formatted stock data for display in the frontend.

    Returns pre-formatted strings ready for UI display.

    Args:
        ticker: Stock ticker symbol
        language: "de" for German formatting, "en" for English

    Returns:
        Formatted stock data with display-ready strings
    """
    data = await get_stock_data(ticker)

    return {
        "ticker": data.ticker,
        "price": format_price(data.price),
        "change": format_change_percent(data.changePercent),
        "direction": "up" if (data.changePercent or 0) >= 0 else "down",
        "marketCap": format_market_cap(data.marketCap, language),
        "name": data.name or "Unknown",
        "error": data.error,
    }


@router.get("/formatted/batch/")
async def get_formatted_batch_stock_data(
    tickers: str = Query(..., description="Comma-separated list of ticker symbols"),
    language: str = Query("en", description="Language for formatting: 'de' or 'en'")
):
    """
    Get formatted stock data for multiple tickers.

    Returns pre-formatted strings ready for UI display.

    Args:
        tickers: Comma-separated list of ticker symbols
        language: "de" for German formatting, "en" for English

    Returns:
        Dictionary mapping tickers to formatted stock data
    """
    batch_data = await get_batch_stock_data(tickers)

    results = {}
    for ticker, data in batch_data.stocks.items():
        results[ticker] = {
            "ticker": data.ticker,
            "price": format_price(data.price),
            "change": format_change_percent(data.changePercent),
            "direction": "up" if (data.changePercent or 0) >= 0 else "down",
            "marketCap": format_market_cap(data.marketCap, language),
            "name": data.name or "Unknown",
            "error": data.error,
        }

    return results
