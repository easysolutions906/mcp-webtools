const FETCH_TIMEOUT_MS = 10000;
const IP_V4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IP_V6_REGEX = /^[0-9a-fA-F:]+$/;

const isValidIp = (ip) =>
  typeof ip === 'string' && (IP_V4_REGEX.test(ip) || IP_V6_REGEX.test(ip));

const formatResult = (data) => ({
  ip: data.query,
  country: data.country,
  countryCode: data.countryCode,
  region: data.regionName,
  regionCode: data.region,
  city: data.city,
  zip: data.zip,
  latitude: data.lat,
  longitude: data.lon,
  timezone: data.timezone,
  isp: data.isp,
  organization: data.org,
  as: data.as,
});

const fetchIp = async (ip) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { signal: controller.signal },
    );
    const data = await res.json();

    if (data.status === 'fail') {
      throw new Error(data.message || 'IP lookup failed');
    }

    return formatResult(data);
  } finally {
    clearTimeout(timeout);
  }
};

const lookup = async (ip) => {
  if (!ip || typeof ip !== 'string') {
    return { error: 'IP address is required' };
  }

  const trimmed = ip.trim();

  if (!isValidIp(trimmed)) {
    return { error: 'Invalid IP address format' };
  }

  try {
    return await fetchIp(trimmed);
  } catch (err) {
    return { error: `IP lookup failed: ${err.message}` };
  }
};

const lookupSelf = async () => {
  try {
    return await fetchIp('');
  } catch (err) {
    return { error: `Self IP lookup failed: ${err.message}` };
  }
};

export { lookup, lookupSelf };
