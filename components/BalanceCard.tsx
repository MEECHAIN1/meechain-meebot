import React from 'react';

interface BalanceCardProps {
  title: string;
  value: string | number;
  unit: string;
  className?: string;
  loading?: boolean;
  emoji?: string; // Add emoji prop
}

const BalanceCard: React.FC<BalanceCardProps> = ({ title, value, unit, className, loading, emoji }) => {
  return (
    <div className={`p-6 bg-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
      <h3 className="text-xl font-semibold text-slate-200 mb-2 flex items-center">
        {emoji && <span className="mr-2 text-2xl">{emoji}</span>}{title}
      </h3>
      <p className="text-4xl font-bold text-indigo-400">
        {loading ? (
          <span className="animate-pulse">...</span>
        ) : (
          <>
            {value}{' '}
            <span className="text-lg font-medium text-slate-300">{unit}</span>
          </>
        )}
      </p>
    </div>
  );
};

export default BalanceCard;