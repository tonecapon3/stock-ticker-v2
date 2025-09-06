import { 
  generateFakePriceHistory, 
  generateMultipleStockHistories, 
  updatePriceHistory, 
  generateRealisticPriceChange,
  PriceHistoryConfig 
} from '../../utils/dataGenerator';
import { MAX_HISTORY_POINTS } from '../../lib/types';

describe('DataGenerator', () => {
  beforeEach(() => {
    // Mock Date to make tests deterministic
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateFakePriceHistory', () => {
    it('should generate the correct number of price points', () => {
      const config: PriceHistoryConfig = {
        basePrice: 100,
        pointsCount: 10,
        intervalSeconds: 15
      };

      const history = generateFakePriceHistory(config);
      
      expect(history).toHaveLength(10);
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(typeof history[0].price).toBe('number');
    });

    it('should generate prices around the base price', () => {
      const basePrice = 150;
      const config: PriceHistoryConfig = {
        basePrice,
        pointsCount: 20,
        maxVariationPercent: 5
      };

      const history = generateFakePriceHistory(config);
      
      // All prices should be within reasonable bounds of the base price
      history.forEach(point => {
        expect(point.price).toBeGreaterThan(basePrice * 0.8); // 20% below base
        expect(point.price).toBeLessThan(basePrice * 1.2); // 20% above base
        expect(point.price).toBeGreaterThan(0.01); // Never zero or negative
      });
    });

    it('should create timestamps going backwards in time', () => {
      const config: PriceHistoryConfig = {
        basePrice: 100,
        pointsCount: 5,
        intervalSeconds: 30
      };

      const history = generateFakePriceHistory(config);
      
      // Check that timestamps are in ascending order (oldest first)
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThan(
          history[i - 1].timestamp.getTime()
        );
      }

      // Check that the last timestamp is close to current time
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - history[history.length - 1].timestamp.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should round prices to 2 decimal places', () => {
      const config: PriceHistoryConfig = {
        basePrice: 123.456,
        pointsCount: 5
      };

      const history = generateFakePriceHistory(config);
      
      history.forEach(point => {
        const decimalPlaces = (point.price.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });

    it('should apply trending when enabled', () => {
      const config: PriceHistoryConfig = {
        basePrice: 100,
        pointsCount: 10,
        enableTrend: true,
        trendStrength: 0.5, // Positive trend
        maxVariationPercent: 1
      };

      // Run multiple times to reduce randomness effect
      let trendingUpCount = 0;
      for (let test = 0; test < 5; test++) {
        const history = generateFakePriceHistory(config);
        const firstPrice = history[0].price;
        const lastPrice = history[history.length - 1].price;
        
        if (lastPrice > firstPrice) {
          trendingUpCount++;
        }
      }
      
      // With positive trend strength, more tests should trend upward
      expect(trendingUpCount).toBeGreaterThan(2); // At least 3 out of 5 tests
    });
  });

  describe('generateMultipleStockHistories', () => {
    it('should generate histories for all provided stocks', () => {
      const stocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 150 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 2800 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 300 }
      ];

      const histories = generateMultipleStockHistories(stocks);
      
      expect(Object.keys(histories)).toHaveLength(3);
      expect(histories['AAPL']).toBeDefined();
      expect(histories['GOOGL']).toBeDefined();
      expect(histories['MSFT']).toBeDefined();
      
      // Each history should have MAX_HISTORY_POINTS by default
      Object.values(histories).forEach(history => {
        expect(history).toHaveLength(MAX_HISTORY_POINTS);
      });
    });

    it('should give different characteristics to different stocks', () => {
      const stocks = [
        { symbol: 'STOCK1', name: 'Stock 1', basePrice: 100 },
        { symbol: 'STOCK2', name: 'Stock 2', basePrice: 100 }
      ];

      const histories = generateMultipleStockHistories(stocks);
      
      // The two stocks should have some differences in their price patterns
      // (This is probabilistic, but should be true most of the time)
      const stock1Prices = histories['STOCK1'].map(p => p.price);
      const stock2Prices = histories['STOCK2'].map(p => p.price);
      
      // They shouldn't be identical (very unlikely with random generation)
      expect(stock1Prices).not.toEqual(stock2Prices);
    });
  });

  describe('updatePriceHistory', () => {
    it('should add new price point to history', () => {
      const currentHistory = [
        { timestamp: new Date('2024-01-01T11:00:00Z'), price: 100 },
        { timestamp: new Date('2024-01-01T11:15:00Z'), price: 101 }
      ];
      
      const updatedHistory = updatePriceHistory(currentHistory, 102);
      
      expect(updatedHistory).toHaveLength(3);
      expect(updatedHistory[2].price).toBe(102);
      expect(updatedHistory[2].timestamp).toBeInstanceOf(Date);
    });

    it('should maintain max points limit', () => {
      const currentHistory = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`),
        price: 100 + i
      }));
      
      const updatedHistory = updatePriceHistory(currentHistory, 150, 30);
      
      expect(updatedHistory).toHaveLength(30);
      expect(updatedHistory[29].price).toBe(150); // New price is last
      expect(updatedHistory[0].price).toBe(101); // First old price was removed
    });

    it('should round new price to 2 decimal places', () => {
      const currentHistory = [
        { timestamp: new Date(), price: 100 }
      ];
      
      const updatedHistory = updatePriceHistory(currentHistory, 123.456789);
      
      expect(updatedHistory[1].price).toBe(123.46);
    });
  });

  describe('generateRealisticPriceChange', () => {
    it('should generate price close to current price', () => {
      const currentPrice = 100;
      const maxChangePercent = 2;
      
      // Test multiple times to account for randomness
      for (let i = 0; i < 10; i++) {
        const newPrice = generateRealisticPriceChange(currentPrice, maxChangePercent);
        
        expect(newPrice).toBeGreaterThan(currentPrice * 0.96); // Within 4% down
        expect(newPrice).toBeLessThan(currentPrice * 1.04); // Within 4% up
        expect(newPrice).toBeGreaterThan(0.01); // Never zero or negative
      }
    });

    it('should favor smaller changes over larger ones', () => {
      const currentPrice = 100;
      const maxChangePercent = 5;
      const testRuns = 100;
      
      let smallChanges = 0; // Changes within 0.5%
      let mediumChanges = 0; // Changes within 0.5% to 2%
      let largeChanges = 0; // Changes over 2%
      
      for (let i = 0; i < testRuns; i++) {
        const newPrice = generateRealisticPriceChange(currentPrice, maxChangePercent);
        const changePercent = Math.abs((newPrice - currentPrice) / currentPrice) * 100;
        
        if (changePercent <= 0.5) {
          smallChanges++;
        } else if (changePercent <= 2) {
          mediumChanges++;
        } else {
          largeChanges++;
        }
      }
      
      // Should favor smaller changes
      expect(smallChanges).toBeGreaterThan(mediumChanges);
      expect(mediumChanges).toBeGreaterThan(largeChanges);
      expect(smallChanges).toBeGreaterThan(testRuns * 0.5); // At least 50% should be small changes
    });

    it('should round result to 2 decimal places', () => {
      const currentPrice = 123.456;
      const newPrice = generateRealisticPriceChange(currentPrice);
      
      const decimalPlaces = (newPrice.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});
