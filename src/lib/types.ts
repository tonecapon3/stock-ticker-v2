// Stock information interface
export interface StockInfo {
  symbol: string;
  name: string;
  currentPrice: number;
  previousPrice: number;
  percentageChange: number;
  lastUpdated: Date;
}

// Ticker state interface
export interface TickerState {
  stocks: StockInfo[];
  updateIntervalMs: number;
  isPaused: boolean;
}

// Context type definition
export interface TickerContextType {
  tickerState: TickerState;
  setPrice: (symbol: string, price: number) => void;
  updateSpeed: (intervalMs: number) => void;
  togglePause: () => void;
  addStock: (symbol: string, name: string, initialPrice: number) => void;
  removeStock: (symbol: string) => void;
}
