"use client";

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTickerContext } from '@/lib/context';
import { PricePoint, CURRENCY_SYMBOLS, CurrencyCode } from '@/lib/types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define the maximum number of data points to display in the price history chart
const MAX_HISTORY_POINTS = 100;

export default function StockPriceGraph() {
  const { tickerState, getStockPriceHistory, selectStock } = useTickerContext();
  const { stocks, selectedStock, currency } = tickerState;

  // Helper function to get currency display symbol
  const getCurrencySymbol = (currencyCode: CurrencyCode): string => {
    if (currencyCode === 'CAD') {
      return 'C$';
    } else if (currencyCode === 'CHF') {
      return 'Fr.';
    } else {
      return CURRENCY_SYMBOLS[currencyCode];
    }
  };
  
  // Format time labels consistently to avoid hydration errors
  const formatTimeLabel = (timestamp: Date): string => {
    // Use fixed format that doesn't depend on locale settings
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    const seconds = timestamp.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Prepare chart data based on selected stock
  const prepareChartData = () => {
    if (!selectedStock) return null;
    
    const priceHistory = getStockPriceHistory(selectedStock);
    
    return {
      labels: priceHistory.map(point => formatTimeLabel(point.timestamp)),
      datasets: [
        {
          label: `${selectedStock} Price (${currency})`,
          data: priceHistory.map(point => point.price),
          borderColor: 'rgb(59, 130, 246)', // Tailwind blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.2, // Slightly curved lines
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  };

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 400, // Smoother animations for real-time updates
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8, // Limit number of x-axis labels for readability
          color: 'rgb(209, 213, 219)', // Tailwind gray-300 for better visibility on dark background
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          color: 'rgb(209, 213, 219)', // Tailwind gray-300 for better visibility on dark background
          callback: (value) => `${getCurrencySymbol(currency)}${typeof value === 'number' ? value.toFixed(2) : value}`,
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)', // Tailwind gray-600 with opacity for dark background
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(243, 244, 246)', // Tailwind gray-100 for better visibility on dark background
          font: {
            family: "'Inter', 'system-ui', sans-serif",
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)', // Tailwind gray-900 with transparency
        titleColor: 'rgb(243, 244, 246)', // Tailwind gray-100
        bodyColor: 'rgb(243, 244, 246)', // Tailwind gray-100
        borderColor: 'rgb(59, 130, 246)', // Tailwind blue-500
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: (context) => `${getCurrencySymbol(currency)}${context.parsed.y.toFixed(2)}`,
        },
      },
    },
  };

  // Get chart data from selected stock
  const chartData = prepareChartData();

  // Handle stock selection change
  const handleStockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectStock(e.target.value);
  };

  return (
    <div className="bg-black rounded-lg shadow-md p-6 mt-6 w-full text-white border border-gray-700">
      {/* Add custom styling for select options */}
      <style jsx>{`
        select option {
          background-color: black;
          color: white;
        }
        
        select:hover {
          border-color: rgb(96, 165, 250);
        }
      `}</style>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Stock Price Chart <span className="text-sm font-normal text-gray-400">({currency})</span></h3>
        <div className="mt-2 sm:mt-0">
          <select
            value={selectedStock || ''}
            onChange={handleStockChange}
            className="block w-full sm:w-auto px-3 py-2 border border-blue-500 rounded-md shadow-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400 hover:border-blue-400 text-sm bg-black text-white"
            title="Select a stock to view"
            aria-label="Select a stock to view"
          >
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-gray-900 rounded-md p-2 border border-gray-700">
        {selectedStock && (
          <div className="text-sm text-gray-300 flex justify-between items-center mb-2 px-2">
            <span>Current: {getCurrencySymbol(currency)}{stocks.find(s => s.symbol === selectedStock)?.currentPrice.toFixed(2)}</span>
            <span>
              Updated: {formatTimeLabel(stocks.find(s => s.symbol === selectedStock)?.lastUpdated || new Date())}
            </span>
          </div>
        )}
        
        <div className="h-72 w-full">
          {chartData ? (
            <Line options={options} data={chartData} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a stock to view price history
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-400 mt-4">
        <p>Chart shows the last {MAX_HISTORY_POINTS} price updates. Price updates occur in real-time or when manually adjusted.</p>
      </div>
    </div>
  );
}
