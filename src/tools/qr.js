import QRCode from 'qrcode';

const MAX_DATA_LENGTH = 2000;
const MAX_SIZE = 1000;
const DEFAULT_SIZE = 300;
const DEFAULT_MARGIN = 4;
const HEX_REGEX = /^[0-9a-fA-F]{3,8}$/;

const parseColor = (hex) => {
  if (!hex) { return undefined; }
  const cleaned = hex.replace('#', '');
  return HEX_REGEX.test(cleaned) ? `#${cleaned}` : undefined;
};

const clampSize = (val) => Math.min(Math.max(parseInt(val, 10) || DEFAULT_SIZE, 1), MAX_SIZE);

const buildOptions = ({ size, color, bg }) => ({
  width: clampSize(size),
  margin: DEFAULT_MARGIN,
  color: {
    dark: parseColor(color) || '#000000',
    light: parseColor(bg) || '#ffffff',
  },
});

const generateBase64 = async (data, size, color, bg) => {
  if (!data || typeof data !== 'string') {
    return { error: 'Data is required and must be a string' };
  }

  if (data.length > MAX_DATA_LENGTH) {
    return { error: `Data must be ${MAX_DATA_LENGTH} characters or fewer` };
  }

  try {
    const options = buildOptions({ size, color, bg });
    const dataUrl = await QRCode.toDataURL(data, options);
    return { data, size: options.width, format: 'png', base64: dataUrl };
  } catch (err) {
    return { error: `QR generation failed: ${err.message}` };
  }
};

export { generateBase64 };
