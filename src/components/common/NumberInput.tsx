// ═══════════════════════════════════════════════
// Triwara POS — Formatted Number Input (titik ribuan ala Indonesia)
// ═══════════════════════════════════════════════
//
// Kenapa perlu komponen sendiri: <input type="number"> di browser TIDAK BISA
// nampilin "5.000.000" — begitu ada titik/koma, browser anggap itu bukan angka
// valid. Jadi di sini kita pakai <input type="text"> biasa, tapi:
//   - yang ditampilkan ke user = versi terformat ("5.000.000")
//   - yang dikirim lewat onChange = angka polos (5000000), sama seperti sebelumnya
// Jadi komponen ini bisa gantiin <input type="number"> di form manapun tanpa
// mengubah cara kamu menyimpan datanya.

import React, { useState, useEffect, useRef } from 'react';

interface NumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  /** Set true untuk field yang butuh desimal (mis. gram resep: 12,5) */
  allowDecimal?: boolean;
  style?: React.CSSProperties;
}

function formatForDisplay(num: number, allowDecimal: boolean): string {
  return num.toLocaleString('id-ID', {
    maximumFractionDigits: allowDecimal ? 2 : 0,
  });
}

// "5.000.000" -> "5000000" | "12,5" -> "12.5" (format internal pakai titik desimal
// biar gampang di-parseFloat, walau yang dilihat user pakai koma)
function toRawNumericString(input: string, allowDecimal: boolean): string {
  if (!allowDecimal) {
    return input.replace(/[^\d]/g, '');
  }
  const commaIndex = input.indexOf(',');
  if (commaIndex === -1) {
    return input.replace(/[^\d]/g, '');
  }
  const intPart = input.slice(0, commaIndex).replace(/[^\d]/g, '');
  const decPart = input.slice(commaIndex + 1).replace(/[^\d]/g, '');
  return `${intPart}.${decPart}`;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder,
  className = 'form-input',
  disabled,
  required,
  allowDecimal = false,
  style,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value === '' ? '' : formatForDisplay(value, allowDecimal)
  );
  const isFocused = useRef(false);

  // Sinkronkan tampilan kalau value berubah dari LUAR (mis. modal dibuka ulang
  // dengan data lain) — tapi jangan ganggu user yang lagi ngetik.
  useEffect(() => {
    if (isFocused.current) return;
    setDisplayValue(value === '' ? '' : formatForDisplay(value, allowDecimal));
  }, [value, allowDecimal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    const rawNumeric = toRawNumericString(typed, allowDecimal);

    if (rawNumeric === '' || rawNumeric === '.') {
      setDisplayValue('');
      onChange('');
      return;
    }

    const parsed = parseFloat(rawNumeric);
    if (Number.isNaN(parsed)) return;

    if (allowDecimal && typed.includes(',')) {
      // Lagi ngetik bagian desimal (mis. "12," atau "12,5") — biarkan apa adanya,
      // jangan diformat ulang paksa supaya koma yang baru diketik gak hilang.
      const [intPartTyped, decPartTyped] = typed.split(',');
      const intDigits = intPartTyped.replace(/[^\d]/g, '');
      const formattedInt = intDigits ? Number(intDigits).toLocaleString('id-ID') : '';
      setDisplayValue(`${formattedInt},${decPartTyped.replace(/[^\d]/g, '')}`);
    } else {
      setDisplayValue(formatForDisplay(parsed, allowDecimal));
    }

    onChange(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      placeholder={placeholder}
      value={displayValue}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={() => {
        isFocused.current = false;
      }}
      onChange={handleChange}
      disabled={disabled}
      required={required}
    />
  );
};
