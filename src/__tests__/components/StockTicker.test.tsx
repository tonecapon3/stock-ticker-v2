import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockTicker, StockTickerList } from '../../components/StockTicker';
import { StockInfo } from '../../lib/types';

// Mock date for consistent testing
const mockDate = new Date('2025-04-06T12:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string);

// Sample stock data for testing
const mockStock: StockInfo = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  currentPrice: 150.25,
  previousPrice: 148.50,
  initialPrice: 148.00,
  percentageChange: 1.18,
  lastUpdated: new Date('2023-01-01T00:00:00Z'),
  priceHistory: [
    { timestamp: new Date('2023-01-01T00:00:00Z'), price: 148.00 },
    { timestamp: new Date('2023-01-01T00:01:00Z'), price: 150.25 }
  ]
};

const mockStockDown: StockInfo = {
  symbol: 'MSFT',
  name: 'Microsoft Corporation',
  currentPrice: 408.75,
  previousPrice: 410.25,
  initialPrice: 412.00,
  percentageChange: -0.37,
  lastUpdated: new Date(),
  priceHistory: [
    { timestamp: new Date('2023-01-01T00:00:00Z'), price: 412.00 },
    { timestamp: new Date('2023-01-01T00:01:00Z'), price: 408.75 }
  ]
};

const mockStocks = [
  mockStock,
  mockStockDown,
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 149.50,
    previousPrice: 147.80,
    initialPrice: 147.00,
    percentageChange: 1.15,
    lastUpdated: new Date(),
    priceHistory: [
      { timestamp: new Date('2023-01-01T00:00:00Z'), price: 147.00 },
      { timestamp: new Date('2023-01-01T00:01:00Z'), price: 149.50 }
    ]
  },
];

// Mock the useEffect hook for animation testing
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useEffect: jest.fn((callback) => callback()),
  };
});

describe('StockTicker Component', () => {
  test('renders stock information correctly', () => {
    render(<StockTicker stock={mockStock} />);
    
    // Check if stock name and symbol are rendered
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    
    // Check if price is rendered correctly
    expect(screen.getByText('$184.25')).toBeInTheDocument();
    
    // Check if percentage change is formatted correctly
    expect(screen.getByText('+2.08%')).toBeInTheDocument();
  });
  
  test('displays negative price changes with proper formatting', () => {
    render(<StockTicker stock={mockStockDown} />);
    
    // Check if negative percentage is formatted correctly
    expect(screen.getByText('-0.37%')).toBeInTheDocument();
    
    // Check if the correct color class is applied
    const priceElement = screen.getByText('$408.75');
    const parentElement = priceElement.parentElement;
    expect(parentElement).toHaveClass('text-red-600');
  });
  
  test('formats dates correctly', () => {
    render(<StockTicker stock={mockStock} />);
    
    // Check if the last updated date is formatted
    const formattedTime = mockDate.toLocaleTimeString();
    expect(screen.getByText(`Last updated: ${formattedTime}`)).toBeInTheDocument();
  });
  
  test('applies animation class when price changes', async () => {
    // Initial render
    const { rerender } = render(<StockTicker stock={mockStock} />);
    
    // Update the stock with a new price to trigger animation
    const updatedStock = {
      ...mockStock,
      previousPrice: mockStock.currentPrice,
      currentPrice: 190.50,
      percentageChange: 3.39,
    };
    
    // Re-render with the updated stock
    rerender(<StockTicker stock={updatedStock} />);
    
    // Check if animation class is applied
    const priceContainer = screen.getByText('$190.50').closest('div');
    expect(priceContainer).toHaveClass('animate-price-up');
    
    // Wait for animation to complete
    await waitFor(() => {
      expect(React.useEffect).toHaveBeenCalled();
    });
  });
});

describe('StockTickerList Component', () => {
  test('renders multiple stocks correctly', () => {
    render(<StockTickerList stocks={mockStocks} />);
    
    // Check if all stock names are rendered
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
    
    // Check if all stock symbols are rendered
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
  });
  
  test('shows empty state when no stocks are present', () => {
    render(<StockTickerList stocks={[]} />);
    
    // Check if empty state message is displayed
    expect(screen.getByText('No stocks available. Add some stocks to get started.')).toBeInTheDocument();
  });
  
  test('updates when stocks are added or removed', () => {
    const { rerender } = render(<StockTickerList stocks={[mockStock]} />);
    
    // Initially only one stock should be visible
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.queryByText('Microsoft Corporation')).not.toBeInTheDocument();
    
    // Add another stock and check if it appears
    rerender(<StockTickerList stocks={[mockStock, mockStockDown]} />);
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    
    // Remove all stocks and check if empty state is shown
    rerender(<StockTickerList stocks={[]} />);
    expect(screen.queryByText('Apple Inc.')).not.toBeInTheDocument();
    expect(screen.getByText('No stocks available. Add some stocks to get started.')).toBeInTheDocument();
  });
});

