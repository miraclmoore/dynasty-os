import React, { useState } from 'react';
import { CORE_TYPES_VERSION } from '@dynasty-os/core-types';
import { DB_VERSION, DB_NAME } from '@dynasty-os/db';
import { SPORT_CONFIGS_VERSION } from '@dynasty-os/sport-configs';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dynasty OS</h1>
        <p className="text-gray-400 text-lg">
          The memory layer for your dynasty
        </p>
      </div>

      {/* Workspace package versions - proves cross-package workspace imports */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Workspace Packages
        </h2>
        <dl className="space-y-3">
          <div className="flex justify-between items-center">
            <dt className="text-gray-400 text-sm">@dynasty-os/core-types</dt>
            <dd className="text-green-400 text-sm font-mono">{CORE_TYPES_VERSION}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-400 text-sm">@dynasty-os/db</dt>
            <dd className="text-blue-400 text-sm font-mono">
              {DB_NAME} v{DB_VERSION}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-400 text-sm">@dynasty-os/sport-configs</dt>
            <dd className="text-purple-400 text-sm font-mono">{SPORT_CONFIGS_VERSION}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-400 text-sm">Runtime</dt>
            <dd className="text-emerald-400 text-sm">Tauri 2 + React 18</dd>
          </div>
        </dl>
      </div>

      {/* Interactive counter - proves React state works in WebView */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md text-center">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          WebView State Test
        </h2>
        <p className="text-gray-300 text-sm mb-4">
          Click to verify React state works in the Tauri WebView
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCount((c) => c - 1)}
            className="w-10 h-10 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            -
          </button>
          <span className="text-3xl font-bold font-mono w-16 text-center">{count}</span>
          <button
            onClick={() => setCount((c) => c + 1)}
            className="w-10 h-10 rounded-md bg-blue-700 hover:bg-blue-600 text-white font-bold text-lg transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-xs">
        Native window via Tauri 2 WebView — ready for Dynasty OS features
      </p>
    </div>
  );
}

export default App;
