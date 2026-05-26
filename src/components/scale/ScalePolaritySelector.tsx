import { ScalePolarity } from '../../lib/types';

interface ScalePolaritySelectorProps {
  value: ScalePolarity;
  onChange: (value: ScalePolarity) => void;
}

const OPTIONS = [
  { value: ScalePolarity.Bipolar, label: 'Bipolarna', desc: 'Dwa przeciwstawne bieguny (np. dobre-złe)' },
  { value: ScalePolarity.Unipolar, label: 'Unipolarna', desc: 'Jeden biegun z nasileniem (np. w ogóle-całkowicie)' },
];

export function ScalePolaritySelector({ value, onChange }: ScalePolaritySelectorProps) {
  return (
    <fieldset>
      <legend className="label">Polaryzacja skali</legend>
      <div className="flex gap-3">
        {OPTIONS.map(opt => (
          <label
            key={opt.value}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors
              ${value === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input
              type="radio"
              name="polarity"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <p className="text-[10px] text-gray-400">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
