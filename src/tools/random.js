import crypto from 'node:crypto';

const MAX_COUNT = 100;
const MAX_PARAGRAPHS = 20;
const MAX_SENTENCES = 20;
const COLOR_MAX = 255;

const pick = (arr) => arr[crypto.randomInt(arr.length)];
const randInt = (min, max) => crypto.randomInt(min, max + 1);

const FIRST_NAMES = Object.freeze(['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia']);
const LAST_NAMES = Object.freeze(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']);
const STREETS = Object.freeze(['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Pine Rd', 'Washington Blvd', 'Lake Ave', 'Hill St', 'Park Dr', 'Sunset Blvd', 'Broadway', 'Cherry Ln', 'Forest Ave', 'Highland Dr', 'Meadow Ln', 'River Rd', 'Spring St', 'Valley Rd', 'Walnut St', 'Birch Ln', 'Chestnut Ave', 'Dogwood Dr', 'Fairview Rd', 'Garden St']);
const CITIES = Object.freeze(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville', 'Portland', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa', 'Sacramento']);
const STATES = Object.freeze([['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']]);
const INDUSTRIES = Object.freeze(['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Energy', 'Real Estate', 'Transportation', 'Media', 'Consulting', 'Agriculture', 'Construction', 'Entertainment', 'Hospitality']);
const DOMAINS = Object.freeze(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com']);
const COMPANY_SUFFIXES = Object.freeze(['Solutions', 'Technologies', 'Industries', 'Group', 'Partners', 'Systems', 'Labs', 'Digital', 'Dynamics', 'Ventures']);
const DOMAIN_SUFFIXES = Object.freeze(['tech', 'solutions', 'co', 'io', 'inc']);
const EMPLOYEE_RANGES = Object.freeze(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']);
const GENDERS = Object.freeze(['male', 'female', 'non-binary']);
const LOREM_WORDS = Object.freeze(['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum']);

const clampCount = (val) => Math.min(Math.max(parseInt(val, 10) || 1, 1), MAX_COUNT);

const genAddress = () => {
  const [stateCode, stateName] = pick(STATES);
  return {
    street: `${randInt(100, 9999)} ${pick(STREETS)}`,
    city: pick(CITIES),
    state: stateName,
    stateCode,
    zip: String(randInt(10000, 99999)),
    country: 'United States',
    latitude: Math.round((crypto.randomInt(25000, 75000) / 1000) * 10000) / 10000,
    longitude: Math.round((crypto.randomInt(-125000, -65000) / 1000) * 10000) / 10000,
  };
};

const genPerson = () => {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 999)}@${pick(DOMAINS)}`,
    phone: `(${randInt(200, 999)}) ${randInt(200, 999)}-${String(randInt(1000, 9999))}`,
    birthday: `${randInt(1950, 2005)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    gender: pick(GENDERS),
    address: genAddress(),
  };
};

const genCompany = () => ({
  name: `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`,
  industry: pick(INDUSTRIES),
  phone: `(${randInt(200, 999)}) ${randInt(200, 999)}-${String(randInt(1000, 9999))}`,
  website: `https://www.${pick(LAST_NAMES).toLowerCase()}${pick(DOMAIN_SUFFIXES)}.com`,
  founded: randInt(1950, 2023),
  employees: pick(EMPLOYEE_RANGES),
  address: genAddress(),
});

const genSentence = () => {
  const len = randInt(5, 15);
  const s = Array.from({ length: len }, () => pick(LOREM_WORDS)).join(' ');
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
};

const genMany = (fn, count) => {
  const n = clampCount(count);
  return n === 1 ? fn() : Array.from({ length: n }, fn);
};

const person = (count) => genMany(genPerson, count);

const company = (count) => genMany(genCompany, count);

const address = (count) => genMany(genAddress, count);

const uuid = (count) => {
  const n = clampCount(count);
  const uuids = Array.from({ length: n }, () => crypto.randomUUID());
  return n === 1 ? { uuid: uuids[0] } : { uuids };
};

const text = (paragraphs, sentences) => {
  const p = Math.min(parseInt(paragraphs, 10) || 1, MAX_PARAGRAPHS);
  const s = Math.min(parseInt(sentences, 10) || 5, MAX_SENTENCES);
  const generated = Array.from({ length: p }, () =>
    Array.from({ length: s }, genSentence).join(' ')
  ).join('\n\n');
  return { paragraphs: p, sentences: s, text: generated };
};

export { person, company, address, uuid, text };
