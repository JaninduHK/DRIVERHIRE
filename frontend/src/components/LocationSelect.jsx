import { LOCATIONS, findLocation } from '../constants/locations.js';

const REGIONS = [...new Set(LOCATIONS.map((location) => location.region))];

/**
 * Base-town picker for drivers: a fixed list grouped by region, so the same place
 * is always spelled the same way. `value` is the stored town name. An older,
 * hand-typed value that isn't in the list shows as unselected so the driver picks one.
 */
const LocationSelect = ({ id, name = 'address', value, onChange, className = '', required = false, disabled = false }) => {
  const selected = findLocation(value)?.name || '';
  return (
    <select
      id={id}
      name={name}
      value={selected}
      required={required}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value, event)}
      className={className}
    >
      <option value="" disabled>
        Choose the nearest town
      </option>
      {REGIONS.map((region) => (
        <optgroup key={region} label={region}>
          {LOCATIONS.filter((location) => location.region === region).map((location) => (
            <option key={location.slug} value={location.name}>
              {location.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

export default LocationSelect;
