import React from 'react';

export const StrategyDashboard = ({ strategies }: { strategies: any[] }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Strategy Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strategy, index) => (
          <div key={index} className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">{strategy.name}</h3>
            <p className="mb-4">{strategy.description}</p>
            <a href={strategy.regulation.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Learn More</a>
          </div>
        ))}
      </div>
    </div>
  );
};
