import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { TickerProvider, useTickerContext } from '@/lib/context';

// Test component that displays ticker state
const TestTickerDisplay = () => {
  const { tickerState } = useTickerContext();
  return (
    <div data-testid="ticker-display">
      <p data-testid="stocks-count">{tickerState.stocks.length}</p>
      <p data-testid="is-paused">{tickerState.isPaused.toString()}</p>
      <p data-testid="update-interval">{tickerState.updateIntervalMs}</p>
      {tickerState.stocks.map((stock) => (
        <div key={stock.symbol} data-testid={`stock-${stock.symbol}`}>
          <p data-testid={`price-${stock.symbol}`}>
            {stock.currentPrice.toFixed(2)}
          </p>
          <p data-testid={`change-${stock.symbol}`}>
            {stock.percentageChange.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
};

// Test component with controls for the ticker state
const TestTickerControls = () => {
  const { togglePause, updateSpeed, addStock, removeStock, setPrice } = useTickerContext();
  return (
    <div data-testid="ticker-controls">
      <button data-testid="toggle-pause" onClick={togglePause}>
        Toggle Pause
      </button>
      <button 
        data-testid="set-speed" 
        onClick={() => updateSpeed(2000)}
      >
        Set Speed 2000ms
      </button>
      <button 
        data-testid="add-stock" 
        onClick={() => addStock('TEST', 'Test Stock', 100)}
      >
        Add Test Stock
      </button>
      <button 
        data-testid="remove-stock" 
        onClick={() => removeStock('AAPL')}
      >
        Remove AAPL
      </button>
      <button 
        data-testid="set-price" 
        onClick={() => setPrice('AAPL', 200)}
      >
        Set AAPL Price
      </button>
      <button 
        data-testid="set-all-prices" 
        onClick={() => setPrice('ALL_STOCKS', 300)}
      >
        Set All Prices
      </button>
    </div>
  );
};
// Component that will throw error if used outside provider
const OutsideProviderTest = () => {
  try {
    const { tickerState } = useTickerContext();
    return <div>{tickerState.stocks.length}</div>;
  } catch (error) {
    return <div data-testid="error-message">Error: {(error as Error).message}</div>;
  }
};

// Mock the timer API
jest.useFakeTimers();

describe('TickerProvider', () => {
  test('initializes with default state', () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
      </TickerProvider>
    );
    
    // Check if initial state is correctly set
    expect(screen.getByTestId('stocks-count')).toHaveTextContent('3'); // Default is 3 stocks
    expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    expect(screen.getByTestId('update-interval')).toHaveTextContent('2000');
    
    // Check if AAPL stock exists by default
    expect(screen.getByTestId('stock-AAPL')).toBeInTheDocument();
  });
  
  test('updates stock prices automatically when not paused', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
      </TickerProvider>
    );
    
    // Get initial price for AAPL
    const initialPrice = screen.getByTestId('price-AAPL').textContent;
    
    // Advance timers to trigger price updates
    act(() => {
      jest.advanceTimersByTime(2000); // Default interval is 2000ms
    });
    
    // Wait for state to update
    await waitFor(() => {
      const newPrice = screen.getByTestId('price-AAPL').textContent;
      expect(newPrice).not.toBe(initialPrice);
    });
  });
  
  test('pauses and resumes price updates', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Initially not paused
    expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    
    // Get initial price
    const initialPrice = screen.getByTestId('price-AAPL').textContent;
    
    // Pause the updates
    await userEvent.click(screen.getByTestId('toggle-pause'));
    
    // Verify it's paused
    expect(screen.getByTestId('is-paused')).toHaveTextContent('true');
    
    // Advance timers
    act(() => {
      jest.advanceTimersByTime(6000); // Multiple intervals
    });
    
    // Check that price hasn't changed
    expect(screen.getByTestId('price-AAPL')).toHaveTextContent(initialPrice as string);
    
    // Resume updates
    await userEvent.click(screen.getByTestId('toggle-pause'));
    
    // Verify it's resumed
    expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    
    // Advance timers again
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Wait for state to update
    await waitFor(() => {
      const newPrice = screen.getByTestId('price-AAPL').textContent;
      expect(newPrice).not.toBe(initialPrice);
    });
  });
  
  test('changes update interval', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Check initial interval
    expect(screen.getByTestId('update-interval')).toHaveTextContent('2000');
    
    // Change interval
    await userEvent.click(screen.getByTestId('set-speed'));
    
    // Verify interval changed
    expect(screen.getByTestId('update-interval')).toHaveTextContent('2000');
  });
  
  test('adds new stock', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Get initial stock count
    expect(screen.getByTestId('stocks-count')).toHaveTextContent('3');
    
    // Add a new stock
    await userEvent.click(screen.getByTestId('add-stock'));
    
    // Verify new stock count
    expect(screen.getByTestId('stocks-count')).toHaveTextContent('4');
    
    // Verify the new stock is displayed
    expect(screen.getByTestId('stock-TEST')).toBeInTheDocument();
    expect(screen.getByTestId('price-TEST')).toHaveTextContent('100');
  });
  
  test('removes a stock', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Verify AAPL stock exists
    expect(screen.getByTestId('stock-AAPL')).toBeInTheDocument();
    
    // Remove AAPL stock
    await userEvent.click(screen.getByTestId('remove-stock'));
    
    // Verify AAPL is gone
    expect(screen.queryByTestId('stock-AAPL')).not.toBeInTheDocument();
  });
  
  test('manually sets stock price', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Get initial AAPL price
    const initialPrice = screen.getByTestId('price-AAPL').textContent;
    
    // Set a new price
    await userEvent.click(screen.getByTestId('set-price'));
    
    // Verify price changed
    expect(screen.getByTestId('price-AAPL')).toHaveTextContent('200');
    expect(screen.getByTestId('price-AAPL')).not.toHaveTextContent(initialPrice as string);
    
    // Verify percentage change is calculated
    expect(parseFloat(screen.getByTestId('change-AAPL').textContent || '0')).not.toBe(0);
  });
  
  test('bulk update sets all stock prices with ALL_STOCKS symbol', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Get initial prices for all stocks
    const initialPriceAAPL = screen.getByTestId('price-AAPL').textContent;
    const initialPriceGOOGL = screen.getByTestId('price-GOOGL').textContent;
    const initialPriceMSFT = screen.getByTestId('price-MSFT').textContent;
    
    // Set all prices to 300
    await userEvent.click(screen.getByTestId('set-all-prices'));
    
    // Verify all prices changed to 300
    expect(screen.getByTestId('price-AAPL')).toHaveTextContent('300.00');
    expect(screen.getByTestId('price-GOOGL')).toHaveTextContent('300.00');
    expect(screen.getByTestId('price-MSFT')).toHaveTextContent('300.00');
    
    // Verify they're different from initial prices
    expect(screen.getByTestId('price-AAPL')).not.toHaveTextContent(initialPriceAAPL as string);
    expect(screen.getByTestId('price-GOOGL')).not.toHaveTextContent(initialPriceGOOGL as string);
    expect(screen.getByTestId('price-MSFT')).not.toHaveTextContent(initialPriceMSFT as string);
    
    // Verify percentage changes are calculated for all stocks
    expect(parseFloat(screen.getByTestId('change-AAPL').textContent || '0')).not.toBe(0);
    expect(parseFloat(screen.getByTestId('change-GOOGL').textContent || '0')).not.toBe(0);
    expect(parseFloat(screen.getByTestId('change-MSFT').textContent || '0')).not.toBe(0);
  });
});

describe('useTickerContext hook', () => {
  test('throws error when used outside provider', () => {
    render(<OutsideProviderTest />);
    
    // Verify error message is displayed
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Error: useTickerContext must be used within a TickerProvider'
    );
  });
  
  test('provides access to context when used correctly', () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
      </TickerProvider>
    );
    
    // Verify we can access the context
    expect(screen.getByTestId('ticker-display')).toBeInTheDocument();
    expect(screen.getByTestId('stocks-count')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('updates propagate to multiple consuming components', async () => {
    // Create two separate display components to verify they both get updates
    render(
      <TickerProvider>
        <div data-testid="component-1">
          <TestTickerDisplay />
        </div>
        <div data-testid="component-2">
          <TestTickerDisplay />
        </div>
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Verify both components have the same initial state
    const stockCount1 = screen.getAllByTestId('stocks-count')[0];
    const stockCount2 = screen.getAllByTestId('stocks-count')[1];
    expect(stockCount1.textContent).toBe(stockCount2.textContent);
    
    // Update the state
    await userEvent.click(screen.getByTestId('add-stock'));
    
    // Verify updates propagate to both components
    expect(stockCount1).toHaveTextContent('4');
    expect(stockCount2).toHaveTextContent('4');
  });
  
  test('timer management works correctly', async () => {
    render(
      <TickerProvider>
        <TestTickerDisplay />
        <TestTickerControls />
      </TickerProvider>
    );
    
    // Get initial price
    const initialPrice = screen.getByTestId('price-AAPL').textContent;
    
    // Change update interval
    await userEvent.click(screen.getByTestId('set-speed'));
    
    // Advance timers by the new interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Wait for price to update
    await waitFor(() => {
      const newPrice = screen.getByTestId('price-AAPL').textContent;
      expect(newPrice).not.toBe(initialPrice);
    });
    
    // Now pause the updates
    await userEvent.click(screen.getByTestId('toggle-pause'));
    
    // Get the current price after the change
    const pausedPrice = screen.getByTestId('price-AAPL').textContent;
    
    // Advance timers again
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    
    // Verify price hasn't changed while paused
    expect(screen.getByTestId('price-AAPL')).toHaveTextContent(pausedPrice as string);
  });
});

