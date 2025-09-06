import { PricePoint, MAX_HISTORY_POINTS } from '../lib/types';

/**
 * Configuration for generating fake price history data
 */
export interface PriceHistoryConfig {
  /** Base price to fluctuate around */
  basePrice: number;
  /** Number of data points to generate */
  pointsCount?: number;
  /** Interval between data points in seconds */
  intervalSeconds?: number;
  /** Maximum percentage change from base price */
  maxVariationPercent?: number;
  /** Whether to use trending behavior (slight upward or downward trend) */
  enableTrend?: boolean;
  /** Trend strength (-1 to 1, negative for downward trend, positive for upward) */
  trendStrength?: number;
}

/**
 * Generates fake historical price data points for a stock
 * @param config Configuration for generating the price history
 * @returns Array of PricePoint objects representing historical prices
 */
export function generateFakePriceHistory(config: PriceHistoryConfig): PricePoint[] {
  const {
    basePrice,
    pointsCount = MAX_HISTORY_POINTS,
    intervalSeconds = 15, // 15 seconds between each data point
    maxVariationPercent = 3, // Maximum 3% variation
    enableTrend = false,
    trendStrength = 0
  } = config;

  const priceHistory: PricePoint[] = [];
  const now = new Date();
  
  // Generate historical data points going backwards in time
  for (let i = pointsCount - 1; i >= 0; i--) {
    // Calculate timestamp for this point (going backwards from now)
    const timestamp = new Date(now.getTime() - (i * intervalSeconds * 1000));
    
    // Generate price variation
    let priceVariation = 0;
    
    if (enableTrend && trendStrength !== 0) {
      // Apply trend: stronger effect for older data points
      const trendProgress = (pointsCount - 1 - i) / (pointsCount - 1); // 0 to 1
      const trendEffect = trendStrength * trendProgress * (maxVariationPercent / 100);
      priceVariation += trendEffect;
    }
    
    // Add random fluctuation
    const randomVariation = (Math.random() - 0.5) * 2 * (maxVariationPercent / 100);
    priceVariation += randomVariation;
    
    // Apply some smoothing to make the data look more realistic
    // Use a simple moving average effect with previous point
    if (priceHistory.length > 0) {
      const prevPrice = priceHistory[priceHistory.length - 1].price;
      const targetPrice = basePrice * (1 + priceVariation);
      // Smooth the transition by taking weighted average with previous price
      const smoothingFactor = 0.7;
      const smoothedPrice = prevPrice * (1 - smoothingFactor) + targetPrice * smoothingFactor;
      priceVariation = (smoothedPrice - basePrice) / basePrice;
    }
    
    // Calculate final price
    const price = Math.max(0.01, basePrice * (1 + priceVariation)); // Ensure price is never negative or zero
    
    priceHistory.push({
      timestamp,
      price: Math.round(price * 100) / 100 // Round to 2 decimal places
    });
  }
  
  // Sort by timestamp (oldest first)
  return priceHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Generates fake price history for multiple stocks with different characteristics
 * @param stocks Array of objects with symbol, name, and basePrice
 * @returns Object mapping stock symbols to their generated price histories
 */
export function generateMultipleStockHistories(
  stocks: Array<{ symbol: string; name: string; basePrice: number }>
): Record<string, PricePoint[]> {
  const histories: Record<string, PricePoint[]> = {};
  
  stocks.forEach((stock, index) => {
    // Give each stock slightly different characteristics
    const configs: PriceHistoryConfig = {
      basePrice: stock.basePrice,
      pointsCount: MAX_HISTORY_POINTS,
      intervalSeconds: 15,
      maxVariationPercent: 2 + (index * 0.5), // Vary volatility by stock
      enableTrend: Math.random() > 0.5, // 50% chance of trending
      trendStrength: (Math.random() - 0.5) * 0.4 // Random trend between -0.2 and 0.2
    };
    
    histories[stock.symbol] = generateFakePriceHistory(configs);
  });
  
  return histories;
}

/**
 * Updates an existing price history by adding a new point and maintaining the max length
 * @param currentHistory Current price history array
 * @param newPrice New price to add
 * @param maxPoints Maximum number of points to keep (defaults to MAX_HISTORY_POINTS)
 * @returns Updated price history array
 */
export function updatePriceHistory(
  currentHistory: PricePoint[],
  newPrice: number,
  maxPoints: number = MAX_HISTORY_POINTS
): PricePoint[] {
  const newPoint: PricePoint = {
    timestamp: new Date(),
    price: Math.round(newPrice * 100) / 100
  };
  
  const updatedHistory = [...currentHistory, newPoint];
  
  // Keep only the most recent points
  if (updatedHistory.length > maxPoints) {
    return updatedHistory.slice(-maxPoints);
  }
  
  return updatedHistory;
}

/**
 * Generates a single realistic price change based on current price
 * @param currentPrice Current price of the stock
 * @param maxChangePercent Maximum percentage change allowed
 * @returns New price after applying realistic fluctuation
 */
export function generateRealisticPriceChange(
  currentPrice: number,
  maxChangePercent: number = 2
): number {
  // Generate a random change with bias towards smaller changes
  const randomFactor = Math.random();
  
  // Use a weighted distribution that favors smaller changes
  // Most changes should be small (within 0.5%), with occasional larger moves
  let changePercent: number;
  
  if (randomFactor < 0.7) {
    // 70% of changes are small (within 0.5%)
    changePercent = (Math.random() - 0.5) * 1.0; // -0.5% to +0.5%
  } else if (randomFactor < 0.9) {
    // 20% are medium changes (0.5% to 1.5%)
    changePercent = (Math.random() - 0.5) * 3.0; // -1.5% to +1.5%
  } else {
    // 10% are larger changes (up to max)
    changePercent = (Math.random() - 0.5) * maxChangePercent * 2; // -max% to +max%
  }
  
  const newPrice = currentPrice * (1 + changePercent / 100);
  
  // Ensure price is never negative or zero
  return Math.max(0.01, Math.round(newPrice * 100) / 100);
}
