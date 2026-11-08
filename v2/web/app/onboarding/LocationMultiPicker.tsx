"use client";

import { useState } from "react";

type Props = {
  title: string;
  name: string;
  cityPlaceholder: string;
};

export default function LocationMultiPicker({ title, name, cityPlaceholder }: Props) {
  const [city, setCity] = useState("");
  const [items, setItems] = useState<string[]>([]);

  const add = () => {
    const value = city.trim();
    if (!value) return;
    setItems((current) => current.includes(value) ? current : [...current, value]);
    setCity("");
  };

  return (
    <div>
      <div className="fieldTitle">{title}</div>
      <label>
        <div className="fieldTitle">Città</div>
        <input
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={cityPlaceholder}
        />
      </label>
      <div className="actions">
        <button className="btn" type="button" onClick={add}>+ Aggiungi città</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {items.map((item) => (
          <span className="choice" key={item} style={{ display: "inline-flex", width: "auto" }}>
            {item}
            <button
              type="button"
              aria-label={"Rimuovi " + item}
              onClick={() => setItems((current) => current.filter((x) => x !== item))}
              style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 18 }}
            >
              ×
            </button>
            <input type="hidden" name={name} value={item} />
          </span>
        ))}
      </div>
    </div>
  );
}
