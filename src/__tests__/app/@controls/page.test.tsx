import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ControlsPage from '../../pages/ControlsPage';
import { TickerProvider } from '../../lib/context';

// Mock the context with more controlled behavior for testing
jest.mock('../../lib/context', () => {
  const originalModule = jest.requireActual('@/lib/context');
  
  // Create mock implementation of provider functions
  const mockSetPrice = jest.fn();
  const mockUpdateSpeed = jest.fn();
  const mockTogglePause = jest.fn();
  const mockAddStock = jest.fn();
  const mockRemoveStock = jest.fn();
  
  return {
    ...originalModule,
    useTickerContext: jest.fn(() => ({
      tickerState: {
        stocks: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            currentPrice: 175.50,
            previousPrice: 170.25,
            percentageChange: 3.08,
            lastUpdated: new Date(),
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            currentPrice: 410.75,
            previousPrice: 408.30,
            percentageChange: 0.60,
            lastUpdated: new Date(),
          }
        ],
        isPaused: false,
        updateIntervalMs: 2000,
      },
      setPrice: mockSetPrice,
      updateSpeed: mockUpdateSpeed,
      togglePause: mockTogglePause,
      addStock: mockAddStock,
      removeStock: mockRemoveStock,
    })),
  };
});

// Helper function to get the mock functions
const getMockFunctions = () => {
  const { useTickerContext } = require('../../lib/context');
  const context = useTickerContext();
  return {
    setPrice: context.setPrice,
    updateSpeed: context.updateSpeed,
    togglePause: context.togglePause,
    addStock: context.addStock,
    removeStock: context.removeStock,
  };
};

describe('ControlsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all UI elements correctly', () => {
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Check page title
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
    
    // Check main sections
    expect(screen.getByText('Update Speed')).toBeInTheDocument();
    expect(screen.getByText('Ticker Control')).toBeInTheDocument();
    expect(screen.getByText('Adjust Stock Price')).toBeInTheDocument();
    expect(screen.getByText('Add New Stock')).toBeInTheDocument();
    
    // Check inputs
    expect(screen.getByLabelText(/Select Stock/i)).toBeInTheDocument();
    expect(screen.getByText('Current Price:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause Updates/i })).toBeInTheDocument();
  });
  
  test('toggle pause button changes state', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Initial state - not paused
    const pauseButton = screen.getByRole('button', { name: /Pause Updates/i });
    expect(pauseButton).toBeInTheDocument();
    
    // Click to pause
    await user.click(pauseButton);
    
    // Check if togglePause function was called
    const { togglePause } = getMockFunctions();
    expect(togglePause).toHaveBeenCalledTimes(1);
  });
  
  test('update speed slider changes interval', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Find speed slider
    const speedSlider = screen.getByLabelText(/Update Speed/i, { selector: 'input[type="range"]' });
    
    // Change slider value
    await user.click(speedSlider);
    
    // Check if updateSpeed was called
    const { updateSpeed } = getMockFunctions();
    expect(updateSpeed).toHaveBeenCalled();
  });
  
  test('stock selection dropdown works', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Find stock dropdown
    const stockSelect = screen.getByLabelText(/Select Stock/i);
    
    // Verify "All Stocks" option is present
    expect(screen.getByText(/🔥 All Stocks - Apply to Everything/i)).toBeInTheDocument();
    
    // Select different stock
    await user.selectOptions(stockSelect, 'MSFT');
    
    // Verify the selected option changed
    expect((stockSelect as HTMLSelectElement).value).toBe('MSFT');
    
    // Test selecting "All Stocks"
    await user.selectOptions(stockSelect, 'ALL_STOCKS');
    expect((stockSelect as HTMLSelectElement).value).toBe('ALL_STOCKS');
  });
  
  test('bulk update mode displays when All Stocks selected', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Find stock dropdown and select "All Stocks"
    const stockSelect = screen.getByLabelText(/Select Stock/i);
    await user.selectOptions(stockSelect, 'ALL_STOCKS');
    
    // Verify bulk update mode is displayed
    expect(screen.getByText(/All stocks will be updated to the same price/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter price for all stocks:/i)).toBeInTheDocument();
    
    // Verify the slider is hidden (price slider shouldn't exist for bulk updates)
    expect(screen.queryByLabelText(/Current Price:/i, { selector: 'input[type="range"]' })).not.toBeInTheDocument();
    
    // Verify all stocks are listed
    expect(screen.getByText(/AAPL - Apple Inc./i)).toBeInTheDocument();
    expect(screen.getByText(/MSFT - Microsoft Corporation/i)).toBeInTheDocument();
  });
  
  test('bulk price update works for All Stocks', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Select "All Stocks"
    const stockSelect = screen.getByLabelText(/Select Stock/i);
    await user.selectOptions(stockSelect, 'ALL_STOCKS');
    
    // Find bulk price input and set a value
    const bulkPriceInput = screen.getByLabelText(/Enter price for all stocks:/i);
    await user.type(bulkPriceInput, '300');
    
    // Check if setPrice was called with ALL_STOCKS symbol
    const { setPrice } = getMockFunctions();
    expect(setPrice).toHaveBeenCalledWith('ALL_STOCKS', 300);
  });
  
  test('price adjustment slider changes stock price', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Find price input
    const priceInput = screen.getByLabelText(/Current Price:/i);
    
    // Change price
    await user.clear(priceInput);
    await user.type(priceInput, '200');
    
    // Check if setPrice was called
    const { setPrice } = getMockFunctions();
    expect(setPrice).toHaveBeenCalledWith('AAPL', 200);
  });
  
  test('remove stock button functionality', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Find remove button
    const removeButton = screen.getByRole('button', { name: /Remove Stock/i });
    
    // Click remove button
    await user.click(removeButton);
    
    // Check if removeStock was called
    const { removeStock } = getMockFunctions();
    expect(removeStock).toHaveBeenCalledWith('AAPL');
  });
  
  test('add stock form validation and submission', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Fill out new stock form
    const symbolInput = screen.getByLabelText(/Symbol/i);
    const nameInput = screen.getByLabelText(/Company Name/i);
    const priceInput = screen.getByLabelText(/Initial Price/i);
    
    await user.type(symbolInput, 'GOOG');
    await user.type(nameInput, 'Google Inc.');
    await user.type(priceInput, '150.25');
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /Add Stock/i });
    await user.click(addButton);
    
    // Check if addStock was called with correct params
    const { addStock } = getMockFunctions();
    expect(addStock).toHaveBeenCalledWith('GOOG', 'Google Inc.', 150.25);
  });
  
  test('form validation prevents empty submissions', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Try to submit empty form
    const addButton = screen.getByRole('button', { name: /Add Stock/i });
    await user.click(addButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
    
    // Verify addStock wasn't called
    const { addStock } = getMockFunctions();
    expect(addStock).not.toHaveBeenCalled();
  });
  
  test('form validation prevents invalid price', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Fill form with invalid price
    const symbolInput = screen.getByLabelText(/Symbol/i);
    const nameInput = screen.getByLabelText(/Company Name/i);
    const priceInput = screen.getByLabelText(/Initial Price/i);
    
    await user.type(symbolInput, 'GOOG');
    await user.type(nameInput, 'Google Inc.');
    await user.type(priceInput, '-10');
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /Add Stock/i });
    await user.click(addButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/Price must be a positive number/i)).toBeInTheDocument();
    
    // Verify addStock wasn't called
    const { addStock } = getMockFunctions();
    expect(addStock).not.toHaveBeenCalled();
  });
  
  test('prevents duplicate stock symbols', async () => {
    // This test checks that you can't add a stock with an existing symbol
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Try to add a stock with existing symbol
    const symbolInput = screen.getByLabelText(/Symbol/i);
    const nameInput = screen.getByLabelText(/Company Name/i);
    const priceInput = screen.getByLabelText(/Initial Price/i);
    
    await user.type(symbolInput, 'AAPL');
    await user.type(nameInput, 'Apple Inc. Duplicate');
    await user.type(priceInput, '200');
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /Add Stock/i });
    await user.click(addButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/Stock symbol already exists/i)).toBeInTheDocument();
    
    // Verify addStock wasn't called
    const { addStock } = getMockFunctions();
    expect(addStock).not.toHaveBeenCalled();
  });
  
  test('form resets after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <TickerProvider>
        <ControlsPage />
      </TickerProvider>
    );
    
    // Fill out form
    const symbolInput = screen.getByLabelText(/Symbol/i);
    const nameInput = screen.getByLabelText(/Company Name/i);
    const priceInput = screen.getByLabelText(/Initial Price/i);
    
    await user.type(symbolInput, 'NFLX');
    await user.type(nameInput, 'Netflix Inc.');
    await user.type(priceInput, '500');
    
    // Get mock functions
    const { addStock } = getMockFunctions();
    // Mock successful addition
    addStock.mockImplementationOnce(() => true);
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /Add Stock/i });
    await user.click(addButton);
    
    // Verify fields are reset
    await waitFor(() => {
      expect(symbolInput).toHaveValue('');
      expect(nameInput).toHaveValue('');
      expect(priceInput).toHaveValue('');
    });
  });
});

