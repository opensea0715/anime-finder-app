import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  selectedValue: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  id?: string; // For label association
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  selectedValue,
  onChange,
  label,
  id,
  placeholder = "選択してください",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;
  const componentId = id || `dropdown-${React.useId()}`;
  const listboxId = `${componentId}-listbox`;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus the selected item or first item when opening
      const currentIdx = options.findIndex(opt => opt.value === selectedValue);
      setFocusedOptionIndex(currentIdx !== -1 ? currentIdx : 0);
    }
  };

  const handleSelect = (value: string | number, index: number) => {
    onChange(value);
    setFocusedOptionIndex(index);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    if (isOpen && focusedOptionIndex >= 0 && listRef.current) {
      const optionElement = listRef.current.children[focusedOptionIndex] as HTMLElement;
      optionElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusedOptionIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setFocusedOptionIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setFocusedOptionIndex(prev => (prev - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
           const currentIdx = options.findIndex(opt => opt.value === selectedValue);
           setFocusedOptionIndex(currentIdx !== -1 ? currentIdx : 0);
        } else {
          if (focusedOptionIndex >= 0 && focusedOptionIndex < options.length) {
            handleSelect(options[focusedOptionIndex].value, focusedOptionIndex);
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        if (isOpen) setFocusedOptionIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (isOpen) setFocusedOptionIndex(options.length - 1);
        break;
      default:
        // Allow typing to select (basic first-letter match)
        if (isOpen && /^[a-zA-Z0-9]$/.test(e.key)) {
          const char = e.key.toLowerCase();
          const startIndex = focusedOptionIndex >= 0 ? (focusedOptionIndex + 1) % options.length : 0;
          for (let i = 0; i < options.length; i++) {
            const optionIndex = (startIndex + i) % options.length;
            if (options[optionIndex].label.toLowerCase().startsWith(char)) {
              setFocusedOptionIndex(optionIndex);
              break;
            }
          }
        }
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label htmlFor={`${componentId}-button`} className="block text-xs font-medium text-gray-300 mb-1">{label}</label>}
      <button
        id={`${componentId}-button`}
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between bg-[#1a252f] text-white border border-gray-600 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff] transition-colors duration-150"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={label ? undefined : `${componentId}-button`} // If no external label, button labels itself
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul
          id={listboxId}
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-[rgba(26,37,47,0.9)] backdrop-blur-md shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          tabIndex={-1} // List itself is not focusable, but options are via aria-activedescendant
          role="listbox"
          aria-activedescendant={focusedOptionIndex >= 0 ? `${componentId}-option-${focusedOptionIndex}` : undefined}
          aria-labelledby={label ? `${componentId}-button` : undefined} // If label exists, it describes the button which controls this listbox
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${componentId}-option-${index}`}
              onClick={() => handleSelect(option.value, index)}
              onMouseOver={() => setFocusedOptionIndex(index)} // Optional: update focus on mouse over
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-white text-xs transition-colors duration-100 ${
                index === focusedOptionIndex ? 'bg-[#00d4ff] text-[#0f171e]' : 'hover:bg-[#00aaff] hover:text-[#0f171e]'
              } ${
                selectedValue === option.value && index !== focusedOptionIndex ? 'bg-[#0088cc] text-white font-semibold' : '' // Highlight selected if not focused
              }`}
              role="option"
              aria-selected={selectedValue === option.value}
            >
              <span className="font-normal block truncate">{option.label}</span>
              {selectedValue === option.value && ( // Visual indicator for selected item
                 <span className={`absolute inset-y-0 right-0 flex items-center pr-4 ${index === focusedOptionIndex ? 'text-[#0f171e]' : 'text-[#00d4ff]'}`}>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                 </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;