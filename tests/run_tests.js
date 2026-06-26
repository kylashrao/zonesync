// Mirrors the exact logic from converter/index.html
function getOffsetMinutes(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  const map = {};
  parts.forEach(p => map[p.type] = p.value);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return (asUTC - date.getTime()) / 60000;
}

function convert(y, m, d, hh, mm, fromTz, toTz) {
  const naiveUTCGuess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetGuess = getOffsetMinutes(new Date(naiveUTCGuess), fromTz);
  let actualUTCms = naiveUTCGuess - offsetGuess * 60000;
  const offsetCheck = getOffsetMinutes(new Date(actualUTCms), fromTz);
  if (offsetCheck !== offsetGuess) {
    actualUTCms = naiveUTCGuess - offsetCheck * 60000;
  }
  const instant = new Date(actualUTCms);
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: toTz });
  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: toTz });

  const fromOffset = getOffsetMinutes(instant, fromTz);
  const toOffset = getOffsetMinutes(instant, toTz);
  const diffMin = toOffset - fromOffset;

  return {
    time: timeFmt.format(instant),
    date: dateFmt.format(instant),
    diffMin
  };
}

const tests = [
  // [description, y, m, d, hh, mm, fromTz, toTz, expectedTime, expectedDateNote]
  ["NY 8:59AM Jun26 -> Mumbai", 2026, 6, 26, 8, 59, "America/New_York", "Asia/Kolkata", "06:29 PM", "same day"],
  ["Mumbai 8:59AM Jun26 -> NY", 2026, 6, 26, 8, 59, "Asia/Kolkata", "America/New_York", "11:29 PM", "previous day"],
  ["Noon UTC -> Mumbai", 2026, 6, 26, 12, 0, "UTC", "Asia/Kolkata", "05:30 PM", "same day"],
  ["11PM LA -> Tokyo (date rollover)", 2026, 6, 25, 23, 0, "America/Los_Angeles", "Asia/Tokyo", "03:00 PM", "next day"],
  ["9AM NY in January (EST, no DST) -> Mumbai", 2026, 1, 15, 9, 0, "America/New_York", "Asia/Kolkata", "07:30 PM", "same day"],
  ["9AM NY in June (EDT, DST active) -> Mumbai", 2026, 6, 15, 9, 0, "America/New_York", "Asia/Kolkata", "06:30 PM", "same day, 1hr earlier than Jan due to DST"],
  ["Midnight UTC -> Sydney", 2026, 6, 26, 0, 0, "UTC", "Australia/Sydney", "10:00 AM", "same day"],
  ["London 1:30AM Mar29 (pre-DST-jump) -> UTC", 2026, 3, 29, 1, 30, "Europe/London", "UTC", "01:30 AM", "GMT, offset 0"],
  ["London 3:30AM Mar29 (post-DST-jump) -> UTC", 2026, 3, 29, 3, 30, "Europe/London", "UTC", "02:30 AM", "BST, offset +1"],
  ["Same zone both sides (no-op)", 2026, 6, 26, 14, 0, "Asia/Kolkata", "Asia/Kolkata", "02:00 PM", "identical"],
  ["New Year's Eve rollover NY -> Tokyo", 2025, 12, 31, 23, 0, "America/Los_Angeles", "Asia/Tokyo", null, "should land Jan 1 2026"],
  ["Half-hour offset zone: Mumbai noon -> Newfoundland(-3:30ish historically, using a known half-hour zone)", 2026, 6, 26, 12, 0, "Asia/Kolkata", "America/St_Johns", null, "check 30/45 min offsets"],
];

tests.forEach(t => {
  const [desc, y, m, d, hh, mm, fromTz, toTz, expected, note] = t;
  const result = convert(y, m, d, hh, mm, fromTz, toTz);
  const pass = expected ? (result.time === expected ? "PASS" : "FAIL") : "INFO";
  console.log(`[${pass}] ${desc}`);
  console.log(`   -> Result: ${result.time}, ${result.date} (diff: ${result.diffMin}min)`);
  if (expected) console.log(`   -> Expected: ${expected} (${note})`);
  console.log("");
});
