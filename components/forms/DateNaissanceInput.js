'use client';

import { useState, useCallback } from 'react';

function isoToDisplay(iso) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function displayToIso(display) {
  const m = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const day = parseInt(d, 10);
  const month = parseInt(mo, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) return '';
  return `${y}-${mo}-${d}`;
}

function autoFormat(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

export default function DateNaissanceInput({ id, className, value, onChange, max }) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((e) => {
    const formatted = autoFormat(e.target.value);
    setDisplay(formatted);
    const iso = displayToIso(formatted);
    if (iso) {
      onChange({ target: { value: iso } });
    } else if (formatted === '') {
      onChange({ target: { value: '' } });
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    const iso = displayToIso(display);
    if (display && !iso) {
      setDisplay('');
      onChange({ target: { value: '' } });
    }
  }, [display, onChange]);

  const isInvalid = touched && display.length > 0 && !displayToIso(display);

  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode="numeric"
      placeholder="JJ/MM/AAAA"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      maxLength={10}
      autoComplete="bday"
      style={isInvalid ? { borderColor: '#ef4444' } : undefined}
    />
  );
}
