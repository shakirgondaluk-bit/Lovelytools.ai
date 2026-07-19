// lovelytools.ai — unit conversion: exact ratios to SI base units (NIST),
// affine transforms for temperature.
import { D, Decimal } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

export interface Unit {
  id: string;
  label: string;
  /**
   * Multiplier to the dimension's base unit. Either an exact decimal string
   * or an exact fraction 'a/b' — fractions matter for the repeating ones:
   * Fahrenheit's 5/9 truncated at 20 digits made 32°F convert to 2e-17 °C
   * instead of 0, because the dust survives toSignificantDigits.
   */
  toBase: string;
  /** Affine offset for temperature (applied before scale when converting to base). */
  offset?: string;
}

/** Apply toBase, multiplying before dividing so 'a/b' factors stay exact. */
export function toBaseValue(v: Decimal, u: Unit): Decimal {
  const shifted = u.offset !== undefined ? v.plus(u.offset) : v;
  const [n, d] = u.toBase.split('/');
  const scaled = shifted.times(n!);
  return d ? scaled.div(d) : scaled;
}

/** Invert toBase (and offset) — base × b / a for a fraction 'a/b'. */
export function fromBaseValue(base: Decimal, u: Unit): Decimal {
  const [n, d] = u.toBase.split('/');
  const out = (d ? base.times(d) : base).div(n!);
  return u.offset !== undefined ? out.minus(u.offset) : out;
}

/**
 * Ratios are exact NIST definitions where one exists (inch, pound, gallon,
 * atm, hp…), exact fractions where the decimal repeats (5/9, 1/60, 101325/760),
 * and 20-significant-digit decimals only for the genuinely irrational (π).
 */
export const DIMENSIONS: Record<string, { base: string; units: Unit[] }> = {
  length: {
    base: 'meter',
    units: [
      { id: 'mm', label: 'Millimeters', toBase: '0.001' },
      { id: 'cm', label: 'Centimeters', toBase: '0.01' },
      { id: 'm', label: 'Meters', toBase: '1' },
      { id: 'km', label: 'Kilometers', toBase: '1000' },
      { id: 'in', label: 'Inches', toBase: '0.0254' }, // exact
      { id: 'ft', label: 'Feet', toBase: '0.3048' }, // exact
      { id: 'yd', label: 'Yards', toBase: '0.9144' }, // exact
      { id: 'mi', label: 'Miles', toBase: '1609.344' }, // exact
    ],
  },
  mass: {
    base: 'kilogram',
    units: [
      { id: 'mg', label: 'Milligrams', toBase: '0.000001' },
      { id: 'g', label: 'Grams', toBase: '0.001' },
      { id: 'kg', label: 'Kilograms', toBase: '1' },
      { id: 't', label: 'Metric tons', toBase: '1000' },
      { id: 'oz', label: 'Ounces', toBase: '0.028349523125' }, // exact
      { id: 'lb', label: 'Pounds', toBase: '0.45359237' }, // exact
      { id: 'st', label: 'Stone', toBase: '6.35029318' }, // exact
    ],
  },
  volume: {
    base: 'liter',
    units: [
      { id: 'ml', label: 'Milliliters', toBase: '0.001' },
      { id: 'l', label: 'Liters', toBase: '1' },
      { id: 'tsp', label: 'Teaspoons (US)', toBase: '0.00492892159375' },
      { id: 'tbsp', label: 'Tablespoons (US)', toBase: '0.01478676478125' },
      { id: 'cup', label: 'Cups (US)', toBase: '0.2365882365' },
      { id: 'floz', label: 'Fluid ounces (US)', toBase: '0.0295735295625' },
      { id: 'gal', label: 'Gallons (US)', toBase: '3.785411784' }, // exact
    ],
  },
  temperature: {
    base: 'kelvin',
    units: [
      { id: 'c', label: 'Celsius', toBase: '1', offset: '273.15' },
      { id: 'f', label: 'Fahrenheit', toBase: '5/9', offset: '459.67' }, // (F+459.67)·5/9, exact
      { id: 'k', label: 'Kelvin', toBase: '1', offset: '0' },
    ],
  },
  data: {
    base: 'byte',
    units: [
      { id: 'bit', label: 'Bits', toBase: '0.125' },
      { id: 'b', label: 'Bytes', toBase: '1' },
      { id: 'kb', label: 'KB (1000)', toBase: '1000' },
      { id: 'kib', label: 'KiB (1024)', toBase: '1024' },
      { id: 'mb', label: 'MB', toBase: '1000000' },
      { id: 'mib', label: 'MiB', toBase: '1048576' },
      { id: 'gb', label: 'GB', toBase: '1000000000' },
      { id: 'gib', label: 'GiB', toBase: '1073741824' },
      { id: 'tb', label: 'TB', toBase: '1000000000000' },
      { id: 'tib', label: 'TiB', toBase: '1099511627776' },
    ],
  },
  speed: {
    base: 'm/s',
    units: [
      { id: 'ms', label: 'Meters/second', toBase: '1' },
      { id: 'kmh', label: 'km/h', toBase: '5/18' }, // exact
      { id: 'mph', label: 'mph', toBase: '0.44704' }, // exact
      { id: 'kn', label: 'Knots', toBase: '463/900' }, // 1852 m per hour, exact
    ],
  },
  angle: {
    base: 'radian',
    units: [
      { id: 'deg', label: 'Degrees', toBase: '0.017453292519943295769' }, // π/180
      { id: 'rad', label: 'Radians', toBase: '1' },
      { id: 'grad', label: 'Gradians', toBase: '0.015707963267948966192' }, // π/200
      { id: 'arcmin', label: 'Arcminutes', toBase: '0.00029088820866572159615' }, // π/10800
      { id: 'arcsec', label: 'Arcseconds', toBase: '0.0000048481368110953599359' }, // π/648000
      { id: 'turn', label: 'Turns', toBase: '6.2831853071795864769' }, // 2π
    ],
  },
  area: {
    base: 'm²',
    units: [
      { id: 'mm2', label: 'Square millimeters', toBase: '0.000001' },
      { id: 'cm2', label: 'Square centimeters', toBase: '0.0001' },
      { id: 'm2', label: 'Square meters', toBase: '1' },
      { id: 'ha', label: 'Hectares', toBase: '10000' },
      { id: 'km2', label: 'Square kilometers', toBase: '1000000' },
      { id: 'in2', label: 'Square inches', toBase: '0.00064516' }, // exact
      { id: 'ft2', label: 'Square feet', toBase: '0.09290304' }, // exact
      { id: 'yd2', label: 'Square yards', toBase: '0.83612736' }, // exact
      { id: 'acre', label: 'Acres', toBase: '4046.8564224' }, // exact
      { id: 'mi2', label: 'Square miles', toBase: '2589988.110336' }, // exact
    ],
  },
  energy: {
    base: 'joule',
    units: [
      { id: 'j', label: 'Joules', toBase: '1' },
      { id: 'kj', label: 'Kilojoules', toBase: '1000' },
      { id: 'cal', label: 'Calories (thermochemical)', toBase: '4.184' }, // exact
      { id: 'kcal', label: 'Kilocalories (food)', toBase: '4184' }, // exact
      { id: 'wh', label: 'Watt-hours', toBase: '3600' },
      { id: 'kwh', label: 'Kilowatt-hours', toBase: '3600000' },
      { id: 'btu', label: 'BTU (IT)', toBase: '1055.05585262' }, // exact
      { id: 'ftlb', label: 'Foot-pounds', toBase: '1.3558179483314004' }, // exact
    ],
  },
  frequency: {
    base: 'hertz',
    units: [
      { id: 'hz', label: 'Hertz', toBase: '1' },
      { id: 'khz', label: 'Kilohertz', toBase: '1000' },
      { id: 'mhz', label: 'Megahertz', toBase: '1000000' },
      { id: 'ghz', label: 'Gigahertz', toBase: '1000000000' },
      { id: 'rpm', label: 'RPM (rev/min)', toBase: '1/60' }, // exact
    ],
  },
  density: {
    base: 'kg/m³',
    units: [
      { id: 'kgm3', label: 'kg per cubic meter', toBase: '1' },
      { id: 'gcm3', label: 'g per cubic centimeter', toBase: '1000' },
      { id: 'gml', label: 'g per milliliter', toBase: '1000' },
      { id: 'kgl', label: 'kg per liter', toBase: '1000' },
      { id: 'lbft3', label: 'lb per cubic foot', toBase: '0.45359237/0.028316846592' }, // exact
      { id: 'lbgal', label: 'lb per US gallon', toBase: '0.45359237/0.003785411784' }, // exact
    ],
  },
  power: {
    base: 'watt',
    units: [
      { id: 'w', label: 'Watts', toBase: '1' },
      { id: 'kw', label: 'Kilowatts', toBase: '1000' },
      { id: 'mw', label: 'Megawatts', toBase: '1000000' },
      { id: 'hp', label: 'Horsepower (mechanical)', toBase: '745.69987158227022' }, // exact: 550 ft·lbf/s
      { id: 'ps', label: 'Horsepower (metric, PS)', toBase: '735.49875' }, // exact
      { id: 'btuh', label: 'BTU per hour', toBase: '1055.05585262/3600' }, // exact
    ],
  },
  pressure: {
    base: 'pascal',
    units: [
      { id: 'pa', label: 'Pascals', toBase: '1' },
      { id: 'kpa', label: 'Kilopascals', toBase: '1000' },
      { id: 'mpa', label: 'Megapascals', toBase: '1000000' },
      { id: 'bar', label: 'Bar', toBase: '100000' }, // exact
      { id: 'mbar', label: 'Millibar', toBase: '100' },
      { id: 'atm', label: 'Atmospheres', toBase: '101325' }, // exact
      { id: 'psi', label: 'PSI', toBase: '4.4482216152605/0.00064516' }, // lbf/in², exact
      { id: 'mmhg', label: 'mmHg (torr)', toBase: '101325/760' }, // exact
    ],
  },
  torque: {
    base: 'N·m',
    units: [
      { id: 'nm', label: 'Newton-meters', toBase: '1' },
      { id: 'knm', label: 'Kilonewton-meters', toBase: '1000' },
      { id: 'lbfft', label: 'Pound-feet', toBase: '1.3558179483314004' }, // exact
      { id: 'lbfin', label: 'Pound-inches', toBase: '0.1129848290276167' }, // exact
      { id: 'kgfm', label: 'Kilogram-force meters', toBase: '9.80665' }, // exact
    ],
  },
  time: {
    base: 'second',
    units: [
      { id: 'ms2', label: 'Milliseconds', toBase: '0.001' },
      { id: 's', label: 'Seconds', toBase: '1' },
      { id: 'min', label: 'Minutes', toBase: '60' },
      { id: 'h', label: 'Hours', toBase: '3600' },
      { id: 'day', label: 'Days', toBase: '86400' },
      { id: 'week', label: 'Weeks', toBase: '604800' },
      { id: 'year', label: 'Years (Julian, 365.25 d)', toBase: '31557600' },
    ],
  },
  transfer: {
    base: 'bit/s',
    units: [
      { id: 'bps', label: 'bit/s', toBase: '1' },
      { id: 'kbps', label: 'kbit/s', toBase: '1000' },
      { id: 'mbps', label: 'Mbit/s', toBase: '1000000' },
      { id: 'gbps', label: 'Gbit/s', toBase: '1000000000' },
      { id: 'kbs', label: 'KB/s', toBase: '8000' },
      { id: 'mbs', label: 'MB/s', toBase: '8000000' },
      { id: 'gbs', label: 'GB/s', toBase: '8000000000' },
    ],
  },
};

export const unitConvert = defineCalculator({
  slug: 'unit-converter',
  name: 'Unit Converter',
  category: 'units',
  description: 'Length, mass, volume, temperature, data, and speed — exact NIST ratios.',
  fields: [
    { id: 'dimension', label: 'Type', kind: 'select', default: 'length',
      options: Object.keys(DIMENSIONS).map((k) => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) })) },
    { id: 'value', label: 'Value', kind: 'number', default: 100, required: true },
    { id: 'from', label: 'From', kind: 'unit', default: 'km' },
    { id: 'to', label: 'To', kind: 'unit', default: 'mi' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const dim = DIMENSIONS[inputs.dimension as string];
    if (!dim) throw new CalcError('invalid-input', 'Pick a conversion type.', 'dimension');
    const from = dim.units.find((u) => u.id === inputs.from);
    const to = dim.units.find((u) => u.id === inputs.to);
    if (!from) throw new CalcError('invalid-input', 'Pick a source unit.', 'from');
    if (!to) throw new CalcError('invalid-input', 'Pick a target unit.', 'to');
    const v = inputs.value as Decimal;

    // to base: (v + offset) × scale — offsets only exist for temperature.
    const base = toBaseValue(v, from);
    const result = fromBaseValue(base, to);

    if ((inputs.dimension as string) === 'temperature' && base.lt(0)) {
      throw new CalcError('out-of-domain', `${v} ${from.label} is below absolute zero.`, 'value');
    }

    return {
      primary: { label: `${v} ${from.label} in ${to.label}`, value: result.toSignificantDigits(12), format: { kind: 'number', unit: to.id } },
      secondary: dim.units
        .filter((u) => u.id !== from.id && u.id !== to.id)
        .slice(0, 4)
        .map((u) => ({
          label: u.label,
          value: fromBaseValue(base, u).toSignificantDigits(8),
          format: { kind: 'number' as const, unit: u.id },
        })),
      formula: from.offset !== undefined ? 'base = (v + offset) × scale; out = base/scale − offset' : `out = v × ${from.toBase} / ${to.toBase}`,
      steps: [
        `${v} ${from.id} → ${base.toSignificantDigits(10)} ${dim.base}`,
        `→ ${result.toSignificantDigits(10)} ${to.id}`,
      ],
    };
  },
  vectors: [
    { inputs: { dimension: 'length', value: '100', from: 'km', to: 'mi' }, expectPrimary: '62.1371192237' },
    { inputs: { dimension: 'temperature', value: '100', from: 'c', to: 'f' }, expectPrimary: '212' },
    { inputs: { dimension: 'data', value: '1', from: 'gib', to: 'mb' }, expectPrimary: '1073.741824' },
  ],
});
