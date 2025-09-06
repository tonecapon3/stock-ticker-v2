import React, { useState, useEffect } from 'react';
import SafeStockChart from '../components/SafeStockChart';
import { useEnhancedTickerContext } from '../lib/enhancedContext';
import { formatPrice } from '../lib/types';

const EnhancedDemo: React.FC = () => {
  const {
    enhancedState,
    getPerformanceMetrics,
    toggleInterpolation,
    toggleAdaptiveUpdates,
    setLocalUpdateSpeed,
    getInterpolationStatus,
  } = useEnhancedTickerContext();

  const [performanceMetrics, setPerformanceMetrics] = useState(getPerformanceMetrics());
  const [selectedStock, setSelectedStock] = useState(enhancedState.stocks[0]?.symbol || '');

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(getPerformanceMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  const interpolationStatus = selectedStock ? getInterpolationStatus(selectedStock) : null;
  const currentStock = enhancedState.stocks.find(s => s.symbol === selectedStock);

  const handleUpdateSpeedChange = (speed: number) => {
    const result = setLocalUpdateSpeed(speed);
    if (!result.isValid) {
      alert(`Error: ${result.errorMessage}`);
    }
  };

  const getPerformanceColor = (level: number) => {
    if (level >= 80) return 'text-green-400';
    if (level >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConnectionStatusColor = (isConnected: boolean) => {
    return isConnected ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Enhanced Stock Ticker Demo
        </h1>
        
        {/* Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Connection Status */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>API Connected:</span>
                <span className={getConnectionStatusColor(enhancedState.isApiConnected)}>
                  {enhancedState.isApiConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interpolation:</span>
                <span className={enhancedState.interpolationEnabled ? 'text-green-400' : 'text-gray-400'}>
                  {enhancedState.interpolationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Adaptive Updates:</span>
                <span className={enhancedState.adaptiveUpdatesEnabled ? 'text-green-400' : 'text-gray-400'}>
                  {enhancedState.adaptiveUpdatesEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Frame Rate:</span>
                <span className={getPerformanceColor(performanceMetrics.frameRate)}>
                  {performanceMetrics.frameRate.toFixed(1)} fps
                </span>
              </div>
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className={getPerformanceColor(100 - performanceMetrics.memoryUsage)}>
                  {performanceMetrics.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>CPU Load:</span>
                <span className={getPerformanceColor(100 - performanceMetrics.cpuLoad)}>
                  {performanceMetrics.cpuLoad.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Update Latency:</span>
                <span className={getPerformanceColor(100 - (performanceMetrics.updateLatency / 50) * 100)}>
                  {performanceMetrics.updateLatency.toFixed(1)}ms
                </span>
              </div>
            </div>
          </div>

          {/* Update Intervals */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Update Rates</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Local Updates:</span>
                <span className="text-blue-400">
                  {enhancedState.localUpdateInterval}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>API Sync:</span>
                <span className="text-purple-400">
                  {enhancedState.apiSyncInterval}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chart Animation:</span>
                <span className="text-green-400">
                  16ms (60fps)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={toggleInterpolation}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                enhancedState.interpolationEnabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {enhancedState.interpolationEnabled ? 'Disable' : 'Enable'} Interpolation
            </button>

            <button
              onClick={toggleAdaptiveUpdates}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                enhancedState.adaptiveUpdatesEnabled
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {enhancedState.adaptiveUpdatesEnabled ? 'Disable' : 'Enable'} Adaptive Updates
            </button>

            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white"
            >
              {enhancedState.stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>

            <select
              value={enhancedState.localUpdateInterval}
              onChange={(e) => handleUpdateSpeedChange(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white"
            >
              <option value={250}>Ultra Fast (250ms)</option>
              <option value={375}>Fast (375ms)</option>
              <option value={500}>Medium (500ms)</option>
              <option value={750}>Slow (750ms)</option>
              <option value={1000}>Very Slow (1000ms)</option>
              <option value={2000}>Relaxed (2000ms)</option>
              <option value={3000}>Calm (3000ms)</option>
              <option value={5000}>Smooth (5000ms)</option>
            </select>
          </div>
        </div>

        {/* Stock Information */}
        {currentStock && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold mb-4">
              {currentStock.name} ({currentStock.symbol})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400">Current Price:</span>
                <div className="text-2xl font-bold text-white">
                  {formatPrice(currentStock.currentPrice, 'USD')}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Change:</span>
                <div className={`text-2xl font-bold ${
                  currentStock.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {currentStock.percentageChange >= 0 ? '+' : ''}{currentStock.percentageChange.toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="text-gray-400">Previous Price:</span>
                <div className="text-xl text-gray-300">
                  {formatPrice(currentStock.previousPrice, 'USD')}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Initial Price:</span>
                <div className="text-xl text-gray-300">
                  {formatPrice(currentStock.initialPrice, 'USD')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interpolation Status */}
        {interpolationStatus && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold mb-4">Interpolation Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400">Status:</span>
                <div className={`text-lg font-semibold ${
                  interpolationStatus.isInterpolating ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {interpolationStatus.isInterpolating ? 'Interpolating' : 'Waiting'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Progress:</span>
                <div className="text-lg text-white">
                  {(interpolationStatus.progress * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-gray-400">Step:</span>
                <div className="text-lg text-white">
                  {interpolationStatus.step} / {interpolationStatus.totalSteps}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Progress Bar:</span>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${interpolationStatus.progress * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Real-time Stock Chart</h3>
          <div className="h-96">
            <SafeStockChart
              selectedStock={selectedStock}
              timeRange="1h"
              showGrid={true}
            />
          </div>
          <div className="mt-4 text-sm text-gray-400 text-center">
            {enhancedState.isApiConnected ? (
              <span>🟢 Live data with smooth interpolation</span>
            ) : (
              <span>🔴 Simulated data with local price generation</span>
            )}
            {' • '}
            <span>Updates every {enhancedState.localUpdateInterval}ms</span>
            {' • '}
            <span>60fps animations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDemo;
