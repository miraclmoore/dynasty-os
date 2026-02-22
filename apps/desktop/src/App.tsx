import React from 'react';
import { CORE_TYPES_VERSION } from '@dynasty-os/core-types';
import type { Dynasty } from '@dynasty-os/core-types';
import './App.css';

const exampleDynasty: Dynasty = {
  id: '1',
  name: 'My Dynasty',
};

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">Dynasty OS</h1>
      <p className="text-gray-400 text-lg mb-8">
        The memory layer for your dynasty
      </p>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Workspace Status
        </h2>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500 text-sm">Package</dt>
            <dd className="text-green-400 text-sm font-mono">{CORE_TYPES_VERSION}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 text-sm">Dynasty</dt>
            <dd className="text-blue-400 text-sm font-mono">{exampleDynasty.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 text-sm">Status</dt>
            <dd className="text-emerald-400 text-sm">Ready</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default App;
