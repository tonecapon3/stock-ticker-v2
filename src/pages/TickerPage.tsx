import React from 'react';
import { useTickerContext } from '../lib/context';
import { StockTickerList } from '../components/StockTicker';
import SafeStockChart from '../components/SafeStockChart';
import { formatPrice } from '../lib/types';

export default function TickerPage() {
  const { tickerState } = useTickerContext();
  const { stocks, isPaused, updateIntervalMs, selectedStock, selectedCurrency } = tickerState;

  return (
    <div className="space-y-8">
      {/* Enhanced Pause Indicator Banner */}
      {isPaused && (
        <div className="bg-yellow-900 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-400 mr-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-lg font-bold text-yellow-100">⏸️ Stock Updates Paused</h3>
                <p className="text-sm text-yellow-200 mt-1">
                  Price updates are currently paused. Stocks will not automatically update until resumed.
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-yellow-300 bg-yellow-800 px-2 py-1 rounded-full">
                PAUSED
              </span>
            </div>
          </div>
        </div>
      )}
      
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          Stock Prices
          {/* Status indicator icon */}
          {isPaused ? (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </h2>
        <div className="text-sm">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm ${
            isPaused 
              ? 'bg-yellow-900 text-yellow-100 border border-yellow-600' 
              : 'bg-green-900 text-green-100'
          }`}>
            {isPaused ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updates Paused
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Updating every {(updateIntervalMs / 1000).toFixed(1)}s</span>
                </div>
              </>
            )}
          </span>
        </div>
      </header>
      
      {stocks.length === 0 ? (
        <div className="p-12 text-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-900">
          <p className="text-gray-400">No stocks added yet. Use the control panel to add stocks.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Price graph - Full width, prominent display */}
          <div className="bg-black rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-2">Price Chart</h3>
                <div className="text-left">
                  {(() => {
                    const currentStock = selectedStock ? stocks.find(s => s.symbol === selectedStock) : stocks[0];
                    if (!currentStock) return null;
                    
                    return (
                      <>
                        <div className="text-2xl font-bold text-gray-100 mb-2">
                          {currentStock.symbol} - {formatPrice(currentStock.currentPrice, selectedCurrency)}
                        </div>
                        <div className="text-lg text-gray-400 font-semibold">
                          {(() => {
                            const current = currentStock.currentPrice;
                            const initial = currentStock.initialPrice;
                            const diff = ((current - initial) / initial * 100).toFixed(1);
                            if (current < initial) {
                              return (
                                <span className="text-red-400 font-medium">
                                  🔴 -{Math.abs(parseFloat(diff))}% from initial ({formatPrice(initial, selectedCurrency)})
                                </span>
                              );
                            } else if (current > initial) {
                              return (
                                <span className="text-green-400 font-medium">
                                  🟢 +{diff}% from initial ({formatPrice(initial, selectedCurrency)})
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-blue-400 font-medium">
                                  🔵 At initial price ({formatPrice(initial, selectedCurrency)})
                                </span>
                              );
                            }
                          })()} 
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="h-64 sm:h-80 lg:h-96">
              <SafeStockChart 
                selectedStock={selectedStock}
                timeRange="all"
                showGrid={true}
              />
            </div>
          </div>
          
          {/* Stock ticker list - Below the chart */}
          <div className={`bg-black rounded-lg shadow-md p-4 border ${
            isPaused ? 'border-yellow-600' : 'border-gray-700'
          }`}>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              Stock List
              {isPaused && (
                <span className="text-sm text-yellow-400 bg-yellow-900 px-2 py-1 rounded-full">
                  PAUSED
                </span>
              )}
            </h3>
            <div className="transition-all duration-300 ease-in-out">
              <StockTickerList stocks={stocks} />
            </div>
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 text-sm">
          <h4 className="font-semibold mb-2 text-blue-400">Chart Color Legend:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>🔴 <strong>Red:</strong> Below initial price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>🟢 <strong>Green:</strong> Above initial price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>🔵 <strong>Blue:</strong> Equal to initial price</span>
            </div>
          </div>
          
          <h4 className="font-semibold mb-1 text-blue-400">Tips:</h4>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Stock prices are updated automatically in real-time</li>
            <li>Use the control panel to adjust prices manually or add/remove stocks</li>
            <li>Chart color changes dynamically based on current price vs. initial price</li>
            <li>Hover over the chart to see detailed price information</li>
          </ul>
        </div>
      )}
    </div>
  );
}
