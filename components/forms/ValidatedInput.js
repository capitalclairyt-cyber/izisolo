'use client';

import { useState, useCallback } from 'react';

/**
 * Input avec validation en temps réel
 * Affiche une erreur et formate au blur
 */
export default function ValidatedInput({
  label, value, onChange, validate, format,
  type = 'text', placeholder = '', required = false,
  inputMode, maxLength, className = '',
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    let v = e.target.value;
    // Pour le téléphone, ne garder que chiffres, +, espaces
    if (inputMode === 'tel') {
      v = v.replace(/[^\d+\s.\-()]/g, '');
    }
    onChange(v);
    if (touched && validate) {
      const result = validate(v);
      setError(result.valide ? '' : result.message);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    // Formatter au blur
    if (format && value) {
      const formatted = format(value);
      if (formatted !== value) onChange(formatted);
    }
    // Valider
    if (validate) {
      const result = validate(value);
      setError(result.valide ? '' : result.message);
    }
  };

  const isInvalid = touched && error;

  return (
    <div className={`vi-wrapper ${className}`}>
      {label && (
        <label className="form-label">
          {label} {required && '*'}
        </label>
      )}
      <input
        className={`izi-input ${isInvalid ? 'izi-input-error' : ''} ${touched && !error && value ? 'izi-input-valid' : ''}`}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
      />
      {isInvalid && <span className="vi-error">{error}</span>}

      <style jsx global>{`
        .vi-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .izi-input-error { border-color: var(--danger) !important; background: #fef2f2 !important; }
        .izi-input-valid { border-color: var(--success, #22c55e) !important; }
        .vi-error { font-size: 0.75rem; color: var(--danger); font-weight: 500; }
      `}</style>
    </div>
  );
}
