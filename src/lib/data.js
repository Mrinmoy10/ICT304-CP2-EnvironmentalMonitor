/**
 * Domain data and business rules.
 *
 * Entities mirror the schema defined in ICT304 Assessment 1, Table 7:
 * users, locations, data_sources, sensor_readings, threshold_config,
 * alerts and alert_acknowledgements.
 */

export const LOCATIONS = [
  { location_id: 1, name: "Room A", type: "Classroom" },
  { location_id: 2, name: "Room B", type: "Classroom" },
  { location_id: 3, name: "Office", type: "Office" },
  { location_id: 4, name: "Lab", type: "Laboratory" },
];

export const USERS = [
  {
    user_id: 1,
    full_name: "Saad Ebn Rashid Mrinmoy",
    email: "saadebnrashid10@gmail.com",
    role: "Administrator",
    locations: "All locations",
    is_active: true,
    last_active: "2 minutes ago",
  },
  {
    user_id: 2,
    full_name: "Samir B K",
    email: "samir.bk@sistc.nsw.edu.au",
    role: "Administrator",
    locations: "All locations",
    is_active: true,
    last_active: "18 minutes ago",
  },
  {
    user_id: 3,
    full_name: "Muhammad Khizar",
    email: "miankhizer86@gmail.com",
    role: "End User",
    locations: "Room A, Room B",
    is_active: true,
    last_active: "1 hour ago",
  },
  {
    user_id: 4,
    full_name: "Aawash Tripathi",
    email: "a.tripathi@sistc.nsw.edu.au",
    role: "End User",
    locations: "Office",
    is_active: true,
    last_active: "Yesterday",
  },
  {
    user_id: 5,
    full_name: "Prabin Chhantyal",
    email: "p.chhantyal@sistc.nsw.edu.au",
    role: "End User",
    locations: "Lab",
    is_active: false,
    last_active: "Never",
  },
];

export const DATA_SOURCES = [
  {
    source_id: 1,
    name: "DHT22 Sensor — Room A",
    source_type: "IoT Sensor",
    endpoint: "gpio://dht22-a",
    is_active: true,
  },
  {
    source_id: 2,
    name: "DHT22 Sensor — Room B",
    source_type: "IoT Sensor",
    endpoint: "gpio://dht22-b",
    is_active: true,
  },
  {
    source_id: 3,
    name: "OpenWeather API",
    source_type: "Public API",
    endpoint: "https://api.openweathermap.org/…",
    is_active: true,
  },
  {
    source_id: 4,
    name: "Simulated Generator",
    source_type: "Simulated",
    endpoint: "internal://generator",
    is_active: true,
  },
  {
    source_id: 5,
    name: "Legacy Lab Probe",
    source_type: "IoT Sensor",
    endpoint: "gpio://probe-legacy",
    is_active: false,
  },
];

export const METRICS = {
  temperature: {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    accent: "hsl(var(--metric-temperature))",
    decimals: 1,
  },
  humidity: {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    accent: "hsl(var(--metric-humidity))",
    decimals: 0,
  },
  air_quality: {
    key: "air_quality",
    label: "Air Quality",
    unit: "AQI",
    accent: "hsl(var(--metric-air))",
    decimals: 0,
  },
};

/** Default threshold_config rows: per metric, per location (A1 section 2.4). */
export function defaultThresholds() {
  const config = {};
  LOCATIONS.forEach((l) => {
    config[l.location_id] = {
      temperature: { warn_min: 18, warn_max: 26, crit_min: 15, crit_max: 30 },
      humidity: { warn_min: 35, warn_max: 60, crit_min: 25, crit_max: 70 },
      air_quality: { warn_min: 0, warn_max: 80, crit_min: 0, crit_max: 120 },
    };
  });
  return config;
}

/**
 * State model from Capstone Project 1, Figure 3.8.
 *
 * A reading outside the critical band is Critical; outside the warning band
 * but inside critical is Warning; otherwise Normal. Critical is tested first
 * so that the more severe state always wins.
 */
export function evaluate(value, band) {
  if (!band) return "good";
  if (value < band.crit_min || value > band.crit_max) return "critical";
  if (value < band.warn_min || value > band.warn_max) return "warning";
  return "good";
}

/**
 * Access rule from Assessment 1, Table 1.
 *
 * An Administrator sees every location; an End User sees only the locations
 * assigned to their account. Filtering happens in the data layer, so an
 * unassigned location is never present in the response rather than merely
 * hidden by the client.
 */
export function visibleLocations(user) {
  if (!user) return [];
  if (user.role === "Administrator") return LOCATIONS;
  const allowed = user.locations.split(",").map((s) => s.trim());
  return LOCATIONS.filter((l) => allowed.includes(l.name));
}

export const fmt = (value, metric) =>
  Number(value).toFixed(METRICS[metric].decimals);
export const clock = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const stamp = (ts) =>
  new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
