"use client";

import { useTickerContext } from '@/lib/context';
import { StockTickerList } from '@/components/StockTicker';
import StockPriceGraph from './components/StockPriceGraph';

export default function TickerPage() {
  const { tickerState } = useTickerContext();
  const { stocks, isPaused, updateIntervalMs } = tickerState;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-2xl font-bold text-white">Live Stock Prices</h2>
        <div className="text-sm">
          <span className={`inline-block px-3 py-1 rounded-full font-medium ${isPaused 
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
            : 'bg-green-100 text-green-800 border border-green-200'}`}
          >
            {isPaused ? 'Updates Paused' : `Updating every ${(updateIntervalMs / 1000).toFixed(1)}s`}
          </span>
        </div>
      </header>
      
      {stocks.length === 0 ? (
        <div className="p-12 text-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-900">
          <p className="text-gray-400">No stocks added yet. Use the control panel to add stocks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Stock ticker list */}
          <div className="lg:col-span-1">
            <div className="bg-black rounded-lg shadow-md p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Stock List</h3>
              <div className="transition-all duration-300 ease-in-out">
                <StockTickerList stocks={stocks} />
              </div>
            </div>
          </div>
          
          {/* Right column: Price graph */}
          <div className="lg:col-span-2">
            <StockPriceGraph />
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 text-sm">
          <h4 className="font-semibold mb-1 text-blue-400">Tips:</h4>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Stock prices are updated automatically in real-time</li>
            <li>Use the control panel to adjust prices manually or add/remove stocks</li>
            <li>Select different stocks in the dropdown above the graph to view their price history</li>
          </ul>
        </div>
      )}
    </div>
  );
}
