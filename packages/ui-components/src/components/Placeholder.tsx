import React from 'react';

interface PlaceholderProps {
  label?: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ label = 'Placeholder' }) => {
  return (
    <div className="rounded border border-gray-300 p-4 text-gray-500">
      {label}
    </div>
  );
};

export default Placeholder;
