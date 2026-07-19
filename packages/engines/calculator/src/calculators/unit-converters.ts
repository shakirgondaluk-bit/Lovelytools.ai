// lovelytools.ai — the per-slug unit converters (Unit Converters category).
// Each is a thin definition over unit-convert.ts's DIMENSIONS table: a fixed
// dimension, sensible default units, and its own vectors. One factory, 24
// tools — plus fuel economy below, which is reciprocal and can't ride the
// linear machinery.
import { D, Decimal } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult, type CalculatorDef } from '../types';
import { DIMENSIONS, fromBaseValue, toBaseValue, type Unit } from './unit-convert';

function findUnit(dim: { units: Unit[] }, id: string, fieldId: string): Unit {
  const u = dim.units.find((x) => x.id === id);
  if (!u) throw new CalcError('invalid-input', 'Pick a unit.', fieldId);
  return u;
}

function defineUnitConverter(opts: {
  slug: string;
  name: string;
  description: string;
  dimension: keyof typeof DIMENSIONS & string;
  from: string;
  to: string;
  value?: number;
  vectors: CalculatorDef['vectors'];
}): CalculatorDef {
  const dim = DIMENSIONS[opts.dimension]!;
  const options = dim.units.map((u) => ({ value: u.id, label: u.label }));

  return defineCalculator({
    slug: opts.slug,
    name: opts.name,
    category: 'units',
    description: opts.description,
    fields: [
      { id: 'value', label: 'Value', kind: 'number', default: opts.value ?? 1, required: true },
      { id: 'from', label: 'From', kind: 'unit', default: opts.from, options },
      { id: 'to', label: 'To', kind: 'unit', default: opts.to, options },
    ],
    compute(inputs: CalcInputs): CalcResult {
      const from = findUnit(dim, inputs.from as string, 'from');
      const to = findUnit(dim, inputs.to as string, 'to');
      const v = inputs.value as Decimal;
      const base = toBaseValue(v, from);
      const result = fromBaseValue(base, to);

      if (opts.dimension === 'temperature' && base.lt(0)) {
        throw new CalcError('out-of-domain', `${v} ${from.label} is below absolute zero.`, 'value');
      }

      return {
        primary: {
          label: `${v} ${from.label} in ${to.label}`,
          value: result.toSignificantDigits(12),
          format: { kind: 'number', unit: to.id },
        },
        secondary: dim.units
          .filter((u) => u.id !== from.id && u.id !== to.id)
          .slice(0, 4)
          .map((u) => ({
            label: u.label,
            value: fromBaseValue(base, u).toSignificantDigits(8),
            format: { kind: 'number' as const, unit: u.id },
          })),
        formula:
          from.offset !== undefined
            ? 'base = (v + offset) × scale · out = base/scale − offset'
            : `out = v × ${from.toBase} / ${to.toBase}`,
        steps: [
          `${v} ${from.id} → ${base.toSignificantDigits(10)} ${dim.base}`,
          `→ ${result.toSignificantDigits(10)} ${to.id}`,
        ],
      };
    },
    vectors: opts.vectors,
  });
}

/* ── general converters ────────────────────────────────────────────────────── */

defineUnitConverter({
  slug: 'length-converter', name: 'Length Converter', dimension: 'length',
  description: 'Meters, feet, miles, inches and more — exact NIST ratios.',
  from: 'km', to: 'mi', value: 100,
  vectors: [{ inputs: { value: '100', from: 'km', to: 'mi' }, expectPrimary: '62.1371192237' }],
});

defineUnitConverter({
  slug: 'weight-converter', name: 'Weight Converter', dimension: 'mass',
  description: 'Kilograms, pounds, ounces, grams and stone.',
  from: 'kg', to: 'lb', value: 10,
  vectors: [
    { inputs: { value: '10', from: 'kg', to: 'lb' }, expectPrimary: '22.0462262185' },
    { inputs: { value: '1', from: 'st', to: 'kg' }, expectPrimary: '6.35029318' },
  ],
});

defineUnitConverter({
  slug: 'volume-converter', name: 'Volume Converter', dimension: 'volume',
  description: 'Liters, gallons, cups and milliliters.',
  from: 'l', to: 'gal', value: 10,
  vectors: [{ inputs: { value: '1', from: 'gal', to: 'l' }, expectPrimary: '3.785411784' }],
});

defineUnitConverter({
  slug: 'temperature-converter', name: 'Temperature Converter', dimension: 'temperature',
  description: 'Celsius, Fahrenheit and Kelvin — affine-exact.',
  from: 'c', to: 'f', value: 20,
  vectors: [
    { inputs: { value: '32', from: 'f', to: 'c' }, expectPrimary: '0' },
    { inputs: { value: '300', from: 'k', to: 'c' }, expectPrimary: '26.85' },
  ],
});

defineUnitConverter({
  slug: 'speed-converter', name: 'Speed Converter', dimension: 'speed',
  description: 'mph, km/h, knots and meters per second.',
  from: 'kmh', to: 'mph', value: 100,
  vectors: [{ inputs: { value: '100', from: 'kmh', to: 'mph' }, expectPrimary: '62.1371192237' }],
});

defineUnitConverter({
  slug: 'data-storage-converter', name: 'Data Storage Converter', dimension: 'data',
  description: 'Bytes, KB, MB, GB, TB — decimal and binary (KiB…) units.',
  from: 'gb', to: 'gib', value: 500,
  vectors: [{ inputs: { value: '500', from: 'gb', to: 'gib' }, expectPrimary: '465.661287308' }],
});

defineUnitConverter({
  slug: 'bytes-converter', name: 'Bytes Converter', dimension: 'data',
  description: 'Bits, bytes, and every KB/KiB size above them.',
  from: 'b', to: 'bit', value: 1,
  vectors: [
    { inputs: { value: '1', from: 'b', to: 'bit' }, expectPrimary: '8' },
    { inputs: { value: '1', from: 'gib', to: 'mib' }, expectPrimary: '1024' },
  ],
});

defineUnitConverter({
  slug: 'mb-to-gb', name: 'MB to GB', dimension: 'data',
  description: 'Megabytes to gigabytes and back.',
  from: 'mb', to: 'gb', value: 1024,
  vectors: [{ inputs: { value: '1024', from: 'mb', to: 'gb' }, expectPrimary: '1.024' }],
});

defineUnitConverter({
  slug: 'angle-converter', name: 'Angle Converter', dimension: 'angle',
  description: 'Degrees, radians, gradians, arcminutes and turns.',
  from: 'deg', to: 'rad', value: 180,
  vectors: [
    { inputs: { value: '90', from: 'deg', to: 'grad' }, expectPrimary: '100' },
    { inputs: { value: '180', from: 'deg', to: 'rad' }, expectPrimary: '3.14159265359' },
  ],
});

defineUnitConverter({
  slug: 'area-converter', name: 'Area Converter', dimension: 'area',
  description: 'Square meters, acres, hectares and square feet.',
  from: 'm2', to: 'ft2', value: 100,
  vectors: [{ inputs: { value: '1', from: 'acre', to: 'm2' }, expectPrimary: '4046.8564224' }],
});

defineUnitConverter({
  slug: 'energy-converter', name: 'Energy Converter', dimension: 'energy',
  description: 'Joules, calories, kWh and BTU.',
  from: 'kcal', to: 'kj', value: 1,
  vectors: [
    { inputs: { value: '1', from: 'kcal', to: 'kj' }, expectPrimary: '4.184' },
    { inputs: { value: '1', from: 'kwh', to: 'j' }, expectPrimary: '3600000' },
  ],
});

defineUnitConverter({
  slug: 'frequency-converter', name: 'Frequency Converter', dimension: 'frequency',
  description: 'Hertz, kHz, MHz, GHz and RPM.',
  from: 'mhz', to: 'ghz', value: 2400,
  vectors: [{ inputs: { value: '3000', from: 'rpm', to: 'hz' }, expectPrimary: '50' }],
});

defineUnitConverter({
  slug: 'density-converter', name: 'Density Converter', dimension: 'density',
  description: 'kg/m³, g/cm³ and pounds per cubic foot.',
  from: 'gcm3', to: 'kgm3', value: 1,
  vectors: [{ inputs: { value: '1', from: 'gcm3', to: 'kgm3' }, expectPrimary: '1000' }],
});

defineUnitConverter({
  slug: 'power-converter', name: 'Power Converter', dimension: 'power',
  description: 'Watts, kilowatts, horsepower and BTU/h.',
  from: 'kw', to: 'hp', value: 100,
  vectors: [
    { inputs: { value: '1', from: 'hp', to: 'w' }, expectPrimary: '745.699871582' },
    { inputs: { value: '100', from: 'kw', to: 'hp' }, expectPrimary: '134.10220896' },
  ],
});

defineUnitConverter({
  slug: 'pressure-converter', name: 'Pressure Converter', dimension: 'pressure',
  description: 'Bar, psi, pascals, atmospheres and mmHg.',
  from: 'bar', to: 'psi', value: 2.5,
  vectors: [
    { inputs: { value: '1', from: 'bar', to: 'kpa' }, expectPrimary: '100' },
    { inputs: { value: '1', from: 'atm', to: 'psi' }, expectPrimary: '14.6959487755' },
  ],
});

defineUnitConverter({
  slug: 'torque-converter', name: 'Torque Converter', dimension: 'torque',
  description: 'Newton-meters, pound-feet and kgf·m.',
  from: 'nm', to: 'lbfft', value: 400,
  vectors: [{ inputs: { value: '1', from: 'kgfm', to: 'nm' }, expectPrimary: '9.80665' }],
});

defineUnitConverter({
  slug: 'time-converter', name: 'Time Converter', dimension: 'time',
  description: 'Seconds, minutes, hours, days and weeks.',
  from: 'min', to: 'h', value: 90,
  vectors: [
    { inputs: { value: '90', from: 'min', to: 'h' }, expectPrimary: '1.5' },
    { inputs: { value: '2', from: 'week', to: 'day' }, expectPrimary: '14' },
  ],
});

defineUnitConverter({
  slug: 'data-transfer-converter', name: 'Data Transfer Converter', dimension: 'transfer',
  description: 'Mbps, MB/s and Gbps — the ISP-ad-to-download-speed decoder.',
  from: 'mbps', to: 'mbs', value: 100,
  vectors: [{ inputs: { value: '100', from: 'mbps', to: 'mbs' }, expectPrimary: '12.5' }],
});

/* ── fixed-pair favorites ──────────────────────────────────────────────────── */

defineUnitConverter({
  slug: 'cm-to-inches', name: 'CM to Inches', dimension: 'length',
  description: 'Centimeters to inches and back — 2.54 cm per inch, exactly.',
  from: 'cm', to: 'in', value: 100,
  vectors: [{ inputs: { value: '100', from: 'cm', to: 'in' }, expectPrimary: '39.3700787402' }],
});

defineUnitConverter({
  slug: 'feet-to-meters', name: 'Feet to Meters', dimension: 'length',
  description: 'Feet to meters and back — 0.3048 m per foot, exactly.',
  from: 'ft', to: 'm', value: 10,
  vectors: [{ inputs: { value: '10', from: 'ft', to: 'm' }, expectPrimary: '3.048' }],
});

defineUnitConverter({
  slug: 'miles-to-km', name: 'Miles to KM', dimension: 'length',
  description: 'Miles to kilometers and back — 1.609344 km per mile, exactly.',
  from: 'mi', to: 'km', value: 10,
  vectors: [{ inputs: { value: '10', from: 'mi', to: 'km' }, expectPrimary: '16.09344' }],
});

defineUnitConverter({
  slug: 'kg-to-lbs', name: 'KG to LBS', dimension: 'mass',
  description: 'Kilograms to pounds and back — 0.45359237 kg per pound, exactly.',
  from: 'kg', to: 'lb', value: 10,
  vectors: [{ inputs: { value: '10', from: 'kg', to: 'lb' }, expectPrimary: '22.0462262185' }],
});

defineUnitConverter({
  slug: 'liters-to-gallons', name: 'Liters to Gallons', dimension: 'volume',
  description: 'Liters to US gallons and back.',
  from: 'l', to: 'gal', value: 10,
  vectors: [{ inputs: { value: '10', from: 'l', to: 'gal' }, expectPrimary: '2.64172052358' }],
});

defineUnitConverter({
  slug: 'celsius-to-fahrenheit', name: 'Celsius to Fahrenheit', dimension: 'temperature',
  description: '°C to °F and back — the affine one everyone mis-remembers.',
  from: 'c', to: 'f', value: 100,
  vectors: [
    { inputs: { value: '100', from: 'c', to: 'f' }, expectPrimary: '212' },
    { inputs: { value: '-40', from: 'c', to: 'f' }, expectPrimary: '-40' },
  ],
});

/* ── fuel economy: reciprocal, not linear ──────────────────────────────────── */

const FUEL_UNITS: Record<string, { label: string; toKmL: string | 'reciprocal' }> = {
  mpgus: { label: 'MPG (US)', toKmL: '0.4251437074302720034' }, // 1.609344/3.785411784
  mpgimp: { label: 'MPG (imperial)', toKmL: '0.35400618993464713633' }, // 1.609344/4.54609
  kml: { label: 'km per liter', toKmL: '1' },
  l100: { label: 'L per 100 km', toKmL: 'reciprocal' }, // km/L = 100 / (L/100km)
};

defineCalculator({
  slug: 'fuel-economy-converter',
  name: 'Fuel Economy Converter',
  category: 'units',
  description: 'MPG, km/L and L/100km — including the inversion everyone gets wrong.',
  fields: [
    { id: 'value', label: 'Value', kind: 'number', default: 30, required: true },
    { id: 'from', label: 'From', kind: 'unit', default: 'mpgus',
      options: Object.entries(FUEL_UNITS).map(([value, u]) => ({ value, label: u.label })) },
    { id: 'to', label: 'To', kind: 'unit', default: 'l100',
      options: Object.entries(FUEL_UNITS).map(([value, u]) => ({ value, label: u.label })) },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const from = FUEL_UNITS[inputs.from as string];
    const to = FUEL_UNITS[inputs.to as string];
    if (!from) throw new CalcError('invalid-input', 'Pick a unit.', 'from');
    if (!to) throw new CalcError('invalid-input', 'Pick a unit.', 'to');
    const v = inputs.value as Decimal;
    if (v.lte(0)) throw new CalcError('out-of-domain', 'Fuel economy must be positive.', 'value');

    // Everything routes through km/L. L/100km is the reciprocal axis — twice
    // the L/100km is HALF the economy, which is why the linear table can't hold it.
    const kmL = from.toKmL === 'reciprocal' ? D(100).div(v) : v.times(from.toKmL);
    const result = to.toKmL === 'reciprocal' ? D(100).div(kmL) : kmL.div(to.toKmL);

    const show = (u: { toKmL: string | 'reciprocal' }) =>
      (u.toKmL === 'reciprocal' ? D(100).div(kmL) : kmL.div(u.toKmL)).toSignificantDigits(6);

    return {
      primary: {
        label: `${v} ${from.label} in ${to.label}`,
        value: result.toSignificantDigits(6),
        format: { kind: 'number' },
      },
      secondary: Object.entries(FUEL_UNITS)
        .filter(([id]) => id !== inputs.from && id !== inputs.to)
        .map(([, u]) => ({ label: u.label, value: show(u), format: { kind: 'number' as const } })),
      formula: 'via km/L · L/100km = 100 ÷ (km/L) — reciprocal, not a ratio',
      steps: [
        `${v} ${from.label} → ${kmL.toSignificantDigits(8)} km/L`,
        `→ ${result.toSignificantDigits(8)} ${to.label}`,
      ],
    };
  },
  vectors: [
    { inputs: { value: '30', from: 'mpgus', to: 'l100' }, expectPrimary: '7.84049' },
    { inputs: { value: '5', from: 'l100', to: 'kml' }, expectPrimary: '20' },
  ],
});
