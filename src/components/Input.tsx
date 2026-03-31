import React from 'react';

interface InputProps {
  label?: string;
  darkMode?: boolean;
  variant?: "default" | "minimal";
  id?: string;
  className?: string;
  value?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const Input = ({ label, className = "", darkMode, variant = "default", ...props }: InputProps) => {
  const baseStyles = variant === "minimal" 
    ? "bg-transparent border-none px-0 py-1 focus:ring-0" 
    : `bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full text-gray-900 dark:text-white transition-all outline-none ${baseStyles} ${className}`}
      />
    </div>
  );
};
