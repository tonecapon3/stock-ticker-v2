import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from 'chart.js';
import { useTickerContext } from '../lib/context';
import { PricePoint, formatPrice, ChartTimeRange } from '../lib/types';

// Register ChartJS components only once
let chartJSRegistered = false;
if (!chartJSRegistered) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Title,
    Tooltip,
    Legend,
    Filler
  );
  chartJSRegistered = true;
}

interface SafeStockChartProps {
  selectedStock?: string;
  timeRange?: ChartTimeRange;
  showGrid?: boolean;
}

const SafeStockChart: React.FC<SafeStockChartProps> = ({ 
  selectedStock, 
  timeRange = '1h', 
  showGrid = true 
}) => {
  const { tickerState, getStockPriceHistory } = useTickerContext();
  const { stocks } = tickerState;
  
  // Use refs to manage chart instance and canvas
  const chartRef = useRef<ChartJS | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Generate a unique ID for this chart instance
  const chartId = useMemo(() => `safe-chart-vite-${Math.random().toString(36).substr(2, 9)}`, []);

  // Clean up function to destroy chart safely
  const destroyChart = useCallback(() => {
    // First, try to destroy using our ref
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
        chartRef.current = null;
      } catch (error) {
        console.warn('Error destroying chart via ref:', error);
        chartRef.current = null;
      }
    }
    
    // Also check if there's an existing Chart.js instance on the canvas
    if (canvasRef.current) {
      try {
        const existingChart = ChartJS.getChart(canvasRef.current);
        if (existingChart) {
          existingChart.destroy();
        }
      } catch (error) {
        console.warn('Error destroying existing chart on canvas:', error);
      }
    }
  }, []);

  // Get current stock data
  const currentStock = useMemo(() => {
    // Use selectedStock if provided and exists in stocks
    if (selectedStock && stocks.find(s => s.symbol === selectedStock)) {
      return stocks.find(s => s.symbol === selectedStock);
    }
    // Fallback to first stock if selectedStock not provided or doesn't exist
    return stocks[0];
  }, [selectedStock, stocks]);

  // Filter price history based on time range
  const getFilteredPriceHistory = useCallback((symbol: string, range: ChartTimeRange) => {
    const allHistory = getStockPriceHistory(symbol);
    if (allHistory.length === 0) return [];
    
    const now = new Date();
    let cutoffTime: Date;
    
    switch (range) {
      case '1m':
        cutoffTime = new Date(now.getTime() - 1 * 60 * 1000);
        break;
      case '5m':
        cutoffTime = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '15m':
        cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '4h':
        cutoffTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return allHistory;
    }
    
    return allHistory.filter(point => point.timestamp >= cutoffTime);
  }, [getStockPriceHistory]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!currentStock) {
      return null;
    }
    
    const priceHistory = getFilteredPriceHistory(currentStock.symbol, timeRange);
    if (priceHistory.length === 0) {
      return null;
    }

    // Enhanced time labeling with more frequent indicators
    const labels = priceHistory.map((point, index) => {
      const time = new Date(point.timestamp);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const seconds = time.getSeconds().toString().padStart(2, '0');
      
      // Show different detail levels based on time range and data density
      if (timeRange === '1m' || timeRange === '5m') {
        // For short ranges, show minutes and seconds
        return `${hours}:${minutes}:${seconds}`;
      } else if (timeRange === '15m' || timeRange === '1h') {
        // For medium ranges, show minutes but add seconds every few points for better tracking
        return index % 3 === 0 ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
      } else {
        // For longer ranges, show hours and minutes
        return `${hours}:${minutes}`;
      }
    });

    const prices = priceHistory.map(point => point.price);
    
    // Determine chart color based on current price vs initial price
    const currentPrice = currentStock.currentPrice;
    const initialPrice = currentStock.initialPrice;
    
    let chartColor: string;
    let chartColorRGBA: string;
    
    if (currentPrice < initialPrice) {
      // Below initial price - RED
      chartColor = '#ff4444';
      chartColorRGBA = 'rgba(255, 68, 68, 0.1)';
    } else if (currentPrice > initialPrice) {
      // Above initial price - GREEN
      chartColor = '#00ff88';
      chartColorRGBA = 'rgba(0, 255, 136, 0.1)';
    } else {
      // Equal to initial price - BLUE
      chartColor = '#4488ff';
      chartColorRGBA = 'rgba(68, 136, 255, 0.1)';
    }

    // Create point radius array - show all points with larger current point
    const pointRadiusArray = prices.map((_, index) => index === prices.length - 1 ? 6 : 4);
    const pointHoverRadiusArray = prices.map((_, index) => index === prices.length - 1 ? 10 : 8);
    const pointBorderWidthArray = prices.map((_, index) => index === prices.length - 1 ? 3 : 2);

    return {
      labels,
      datasets: [
        {
          label: `${currentStock.symbol} Price`,
          data: prices,
          borderColor: chartColor,
          backgroundColor: chartColorRGBA,
          borderWidth: 3,
          tension: 0.8,
          pointRadius: pointRadiusArray,
          pointHoverRadius: pointHoverRadiusArray,
          pointBackgroundColor: chartColor,
          pointBorderColor: chartColor,
          pointBorderWidth: pointBorderWidthArray,
          fill: true,
          cubicInterpolationMode: 'default',
          yAxisID: 'price',
        },
        // Additional dataset for animated current price marker
        {
          label: 'Current Price Marker',
          data: Array(prices.length - 1).fill(null).concat([prices[prices.length - 1]]),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: Array(prices.length - 1).fill(0).concat([8]),
          pointHoverRadius: Array(prices.length - 1).fill(0).concat([12]),
          pointBackgroundColor: Array(prices.length - 1).fill('transparent').concat([chartColor]),
          pointBorderColor: Array(prices.length - 1).fill('transparent').concat(['#ffffff']),
          pointBorderWidth: Array(prices.length - 1).fill(0).concat([4]),
          pointStyle: Array(prices.length - 1).fill('circle').concat(['circle']),
          showLine: false,
          yAxisID: 'price',
        },
        // Horizontal reference line for initial stock price
        {
          label: `Initial Price: $${currentStock.initialPrice.toFixed(2)}`,
          data: Array(prices.length).fill(currentStock.initialPrice),
          borderColor: '#4488ff', // Blue reference line
          backgroundColor: 'rgba(68, 136, 255, 0.1)',
          borderWidth: 2,
          borderDash: [8, 4], // Dashed line pattern
          tension: 0,
          pointRadius: 0, // No points on reference line
          pointHoverRadius: 0,
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'transparent',
          fill: false,
          yAxisID: 'price',
          // Custom styling for reference line
          spanGaps: true,
          stepped: false,
        },
      ],
    };
  }, [currentStock, timeRange, getFilteredPriceHistory]);

  // Chart options with dynamic tooltip color
  const chartOptions: ChartOptions = useMemo(() => {
    // Determine tooltip color based on current price vs initial price
    const currentPrice = currentStock?.currentPrice || 0;
    const initialPrice = currentStock?.initialPrice || 0;
    
    let tooltipColor: string;
    if (currentPrice < initialPrice) {
      tooltipColor = '#ff4444'; // Red
    } else if (currentPrice > initialPrice) {
      tooltipColor = '#00ff88'; // Green
    } else {
      tooltipColor = '#4488ff'; // Blue
    }

    return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 150, // Shorter duration for snappy 60fps animations
      easing: 'easeOutQuart', // Optimized easing for smooth movement
      animateRotate: true,
      animateScale: true,
      tension: {
        duration: 200, // Faster line tension animation
        easing: 'easeOutCubic',
        from: 1,
        to: 0,
        loop: false
      },
      // 60fps animation configuration
      frame: {
        duration: 16.67, // Target 60fps (1000ms / 60fps)
      }
    },
    transitions: {
      active: {
        animation: {
          duration: 100, // Very fast hover animations
          easing: 'easeOutQuart'
        }
      },
      resize: {
        animation: {
          duration: 200, // Smooth resize
          easing: 'easeOutCubic'
        }
      },
      // New: Optimized data transitions
      data: {
        animation: {
          duration: 150,
          easing: 'easeOutCubic'
        }
      }
    },
      layout: {
        padding: {
          left: 20,
          right: 20,
          top: 20,
          bottom: 20,
        },
      },
      scales: {
        x: {
          type: 'category',
          position: 'bottom',
          grid: {
            display: showGrid,
            color: 'rgba(255, 255, 255, 0.15)', // Slightly more visible grid
            lineWidth: 1,
            drawTicks: true,
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)', // More visible tick labels
            font: {
              size: 11, // Slightly smaller to fit more labels
              family: "'Inter', 'system-ui', sans-serif",
              weight: '500',
            },
            // Dynamic tick limits based on time range
            maxTicksLimit: timeRange === '1m' ? 15 : timeRange === '5m' ? 18 : timeRange === '15m' ? 20 : 24,
            maxRotation: 0,
            minRotation: 0,
            // Show more frequent labels
            stepSize: 1,
            // Custom callback for better label display
            callback: function(value, index, values) {
              const label = this.getLabelForValue(value);
              // For very short time ranges, show every label
              if (timeRange === '1m' || timeRange === '5m') {
                return label;
              }
              // For other ranges, show every other label to prevent crowding
              return index % 2 === 0 ? label : '';
            },
          },
          border: {
            display: false,
          },
          // Add time indicator lines
          afterBuildTicks: function(scale) {
            // This will help with more precise time tracking
            return scale.ticks;
          },
        },
        price: {
          type: 'linear',
          position: 'right',
          beginAtZero: false,
          grid: {
            display: showGrid,
            color: 'rgba(255, 255, 255, 0.1)',
            lineWidth: 1,
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            font: {
              size: 12,
              family: "'Inter', 'system-ui', sans-serif",
            },
            callback: (value) => `$${typeof value === 'number' ? value.toFixed(2) : value}`,
            count: 8,
          },
          border: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: {
              size: 11,
              family: "'Inter', 'system-ui', sans-serif",
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'line',
            // Filter to show only the reference line in legend
            filter: function(item) {
              return item.text.includes('Initial Price');
            },
            // Custom legend labels
            generateLabels: function(chart) {
              const datasets = chart.data.datasets;
              return datasets
                .map((dataset, i) => {
                  if (dataset.label && dataset.label.includes('Initial Price')) {
                    return {
                      text: dataset.label,
                      fillStyle: 'transparent',
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      lineDash: dataset.borderDash,
                      pointStyle: 'line',
                      datasetIndex: i
                    };
                  }
                  return null;
                })
                .filter(item => item !== null);
            }
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: tooltipColor,
          bodyColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: tooltipColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (tooltipItems) => {
              // Enhanced tooltip with more detailed time information
              if (!tooltipItems[0] || !currentStock) return '';
              
              const dataIndex = tooltipItems[0].dataIndex;
              const priceHistory = getFilteredPriceHistory(currentStock.symbol, timeRange);
              
              if (priceHistory[dataIndex]) {
                const timestamp = priceHistory[dataIndex].timestamp;
                const time = new Date(timestamp);
                const hours = time.getHours().toString().padStart(2, '0');
                const minutes = time.getMinutes().toString().padStart(2, '0');
                const seconds = time.getSeconds().toString().padStart(2, '0');
                const ms = time.getMilliseconds().toString().padStart(3, '0');
                
                // Show different detail levels in tooltip
                if (timeRange === '1m' || timeRange === '5m') {
                  return `Time: ${hours}:${minutes}:${seconds}.${ms}`;
                } else {
                  return `Time: ${hours}:${minutes}:${seconds}`;
                }
              }
              
              return tooltipItems[0]?.label || '';
            },
            label: (context) => {
              const price = context.parsed.y;
              const initialPrice = currentStock?.initialPrice || 0;
              const change = currentStock ? 
                ((price - initialPrice) / initialPrice * 100) : 0;
              const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
              const priceDiff = price - initialPrice;
              const priceDiffText = priceDiff >= 0 ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`;
              
              return [
                `Price: $${price.toFixed(2)}`,
                `Initial: $${initialPrice.toFixed(2)}`,
                `Difference: ${priceDiffText} (${changeText})`,
                change >= 0 ? '📈 Above initial price' : '📉 Below initial price'
              ];
            },
          },
        },
      },
    };
  }, [showGrid, currentStock]);

  // Create chart when component mounts or data changes
  useEffect(() => {
    if (!canvasRef.current || !chartData) return;

    // Clean up any existing chart first
    destroyChart();

    try {
      // Get canvas context
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Clear any existing Chart.js instances on this canvas
        const existingChart = ChartJS.getChart(canvasRef.current);
        if (existingChart) {
          existingChart.destroy();
        }
        
        // Create new chart instance
        chartRef.current = new ChartJS(ctx, {
          type: 'line',
          data: chartData,
          options: chartOptions,
        });
        
        // Add pulsing animation for current price marker
        let pulseDirection = 1;
        let pulseSize = 8;
        const minSize = 6;
        const maxSize = 10;
        
        const animateMarker = () => {
          if (!chartRef.current || !chartData.datasets[1]) return;
          
          // 60fps-optimized marker animation with easing
          pulseSize += pulseDirection * 0.15; // Smoother increment for 60fps
          if (pulseSize >= maxSize) {
            pulseDirection = -1;
          } else if (pulseSize <= minSize) {
            pulseDirection = 1;
          }
          
          // Update the marker point radius
          const markerDataset = chartRef.current.data.datasets[1];
          if (markerDataset && markerDataset.pointRadius) {
            const pointRadiusArray = markerDataset.pointRadius as number[];
            pointRadiusArray[pointRadiusArray.length - 1] = Math.round(pulseSize);
            
            // Update chart without animation for smoothest possible rendering
            chartRef.current.update('none');
          }
        };
        
        // 60fps pulsing animation (16.67ms intervals)
        const pulseInterval = setInterval(animateMarker, 16);
        
        // Store interval for cleanup
        (chartRef.current as any).pulseInterval = pulseInterval;
      }
    } catch (error) {
      console.error('Error creating chart:', error);
    }

    // Cleanup function for this effect
    return () => {
      if (chartRef.current && (chartRef.current as any).pulseInterval) {
        clearInterval((chartRef.current as any).pulseInterval);
      }
      destroyChart();
    };
  }, [chartData, chartOptions, destroyChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyChart();
    };
  }, [destroyChart]);

  if (!currentStock || !chartData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-2xl mb-2">📈</div>
          <div>No data available for chart</div>
          <div className="text-xs mt-2 text-gray-600">
            Debug: currentStock={currentStock?.symbol || 'none'}, 
            chartData={chartData ? 'exists' : 'null'}, 
            stocks={stocks?.length || 0}
          </div>
        </div>
      </div>
    );
  }

  // Get the latest price update time for display
  const latestUpdateTime = currentStock.priceHistory.length > 0 
    ? currentStock.priceHistory[currentStock.priceHistory.length - 1].timestamp
    : currentStock.lastUpdated;
    
  const formatLatestTime = (timestamp: Date) => {
    const time = new Date(timestamp);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ms = time.getMilliseconds().toString().padStart(3, '0');
    
    if (timeRange === '1m' || timeRange === '5m') {
      return `${hours}:${minutes}:${seconds}.${ms}`;
    } else {
      return `${hours}:${minutes}:${seconds}`;
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        transition: 'all 0.5s ease-in-out'
      }}
    >
      {/* Time Indicator Header */}
      <div className="flex justify-between items-center mb-2 px-2 text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 font-mono">
              Last Update: {formatLatestTime(latestUpdateTime)}
            </span>
          </div>
          <div className="text-gray-400 text-xs">
            Range: {timeRange === '1m' ? '1 Minute' : 
                   timeRange === '5m' ? '5 Minutes' : 
                   timeRange === '15m' ? '15 Minutes' : 
                   timeRange === '1h' ? '1 Hour' : 
                   timeRange === '4h' ? '4 Hours' : 'All Time'}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-gray-400 text-sm font-medium">
            Data Points: {currentStock.priceHistory.length}
          </div>
          <div className="text-gray-400 text-sm font-medium">
            Updates: {timeRange === '1m' || timeRange === '5m' ? 'Real-time' : 'Live'}
          </div>
          {/* Initial Price Status Indicator */}
          <div className="flex items-center space-x-1 text-sm">
            <div className="w-2 h-0.5 bg-blue-400" style={{ borderRadius: '1px' }}></div>
            <span className="text-blue-400 font-mono font-medium">
              Initial: ${currentStock.initialPrice.toFixed(2)}
            </span>
            <span className={`font-semibold ${
              currentStock.currentPrice >= currentStock.initialPrice ? 'text-green-400' : 'text-red-400'
            }`}>
              {currentStock.currentPrice >= currentStock.initialPrice ? '▲' : '▼'}
              {(((currentStock.currentPrice - currentStock.initialPrice) / currentStock.initialPrice) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="relative" style={{ height: 'calc(100% - 3rem)' }}>
        <canvas
          ref={canvasRef}
          id={chartId}
          style={{ 
            display: 'block', 
            width: '100%', 
            height: '100%',
            transition: 'all 0.5s ease-in-out'
          }}
        />
        
        {/* Time Grid Overlay for Enhanced Precision */}
        {showGrid && timeRange !== 'all' && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                to right,
                transparent,
                transparent 8.33%,
                rgba(255, 255, 255, 0.05) 8.33%,
                rgba(255, 255, 255, 0.05) 8.34%
              )`
            }}
          />
        )}
      </div>
      
      {/* Time Scale Legend */}
      <div className="flex justify-center mt-2">
        <div className="flex items-center space-x-6 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            <span>Major Tick: {timeRange === '1m' ? '10s' : 
                              timeRange === '5m' ? '30s' : 
                              timeRange === '15m' ? '2min' : 
                              timeRange === '1h' ? '5min' : '15min'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <span>Minor Tick: {timeRange === '1m' ? '5s' : 
                              timeRange === '5m' ? '15s' : 
                              timeRange === '15m' ? '1min' : 
                              timeRange === '1h' ? '2min' : '5min'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeStockChart;
