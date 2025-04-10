export default function Home() {
  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Welcome to the Stock Ticker App</h2>
      
      <p className="text-gray-700 mb-4">
        This application allows you to monitor stock prices in real-time. You can adjust the prices manually and control the update speed using the control panel.
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 mb-4 space-y-2">
        <li>View stock prices and percentage changes</li>
        <li>Adjust prices using the slider or direct input</li>
        <li>Control the update speed</li>
        <li>Pause/resume price updates</li>
        <li>Add and remove stocks</li>
      </ul>
      
      <p className="text-gray-700 mb-4">
        Use the controls panel on the right to interact with the ticker display.
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
        <h3 className="font-medium mb-2">How It Works</h3>
        <p className="text-sm">
          This application uses Next.js 14 with App Router and parallel routes for the ticker and controls sections.
          The stock data is managed through React Context and updates either randomly on a timer or based on your manual inputs.
          Price changes are animated to provide visual feedback for market movements.
        </p>
      </div>
    </div>
  );
}
