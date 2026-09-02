import { Input, Select } from "antd";
import ReactCountryFlag from "react-country-flag";
import { useMemo, type CSSProperties } from "react";

import { COUNTRY_CODES } from "../constants/countryCodes";

type PhoneCountryInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
};

const DEFAULT_CODE = COUNTRY_CODES[0]?.code || "+591";

const parsePhoneValue = (value?: string) => {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  if (!raw) {
    return { code: DEFAULT_CODE, number: "" };
  }

  for (const item of COUNTRY_CODES) {
    const canonical = String(item.code || "").trim();
    const withoutPlus = canonical.startsWith("+") ? canonical.slice(1) : canonical;
    if (canonical && raw.startsWith(canonical)) {
      return { code: canonical, number: raw.slice(canonical.length).replace(/\D/g, "") };
    }
    if (withoutPlus && raw.startsWith(withoutPlus)) {
      return { code: canonical || DEFAULT_CODE, number: raw.slice(withoutPlus.length).replace(/\D/g, "") };
    }
  }

  return { code: DEFAULT_CODE, number: raw.replace(/\D/g, "") };
};

const PhoneCountryInput = ({ value, onChange, placeholder = "Celular", disabled, style }: PhoneCountryInputProps) => {
  const parsed = useMemo(() => parsePhoneValue(value), [value]);

  const handleCodeChange = (nextCode: string) => {
    const safeCode = String(nextCode || DEFAULT_CODE).trim() || DEFAULT_CODE;
    onChange?.(parsed.number ? `${safeCode}${parsed.number}` : "");
  };

  const handleNumberChange = (nextNumber: string) => {
    const digits = String(nextNumber || "").replace(/\D/g, "");
    onChange?.(digits ? `${parsed.code}${digits}` : "");
  };

  return (
    <div style={{ display: "flex", gap: 8, width: "100%", ...style }}>
      <Select
        value={parsed.code}
        disabled={disabled}
        style={{ width: 132, flexShrink: 0 }}
        options={COUNTRY_CODES.map((item) => ({
          value: item.code,
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ReactCountryFlag
                countryCode={item.flag}
                svg
                style={{ width: 18, height: 18 }}
                aria-label={item.name}
              />
              {item.code}
            </span>
          ),
        }))}
        onChange={(nextCode) => handleCodeChange(String(nextCode || DEFAULT_CODE))}
      />
      <Input
        value={parsed.number}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => handleNumberChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            !/[0-9]/.test(event.key) &&
            !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter"].includes(event.key)
          ) {
            event.preventDefault();
          }
        }}
      />
    </div>
  );
};

export default PhoneCountryInput;
