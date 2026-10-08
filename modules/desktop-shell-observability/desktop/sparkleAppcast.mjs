import { DESKTOP_ERRORS, desktopError } from '../../contracts/desktopErrors.js';
import { createPublicKey, verify } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import semver from 'semver';

const publicKeyPrefix = Buffer.from('302a300506032b6570032100', 'hex');

/** Verify the same signed feed consumed by Sparkle before showing an update prompt. */
export function readSparkleAppcast(data, publicKey, currentVersion) {
  const bytes = Buffer.from(data);
  const marker = Buffer.from('<!-- sparkle-signatures:');
  const offset = bytes.lastIndexOf(marker);
  if (offset < 0) throw desktopError(DESKTOP_ERRORS.update, 'Sparkle feed is not signed', 'update.verifyFeed');
  const footer = bytes.subarray(offset).toString('utf8');
  const match = /^<!-- sparkle-signatures:\s*edSignature: ([A-Za-z0-9+/=]+)\s*length: (\d+)\s*-->\s*$/.exec(footer);
  const keyBytes = Buffer.from(publicKey, 'base64');
  if (!match || keyBytes.length !== 32 || Number(match[2]) !== offset)
    throw desktopError(DESKTOP_ERRORS.update, 'Invalid Sparkle feed signature block', 'update.verifyFeed');
  const content = bytes.subarray(0, offset);
  const key = createPublicKey({ key: Buffer.concat([publicKeyPrefix, keyBytes]), format: 'der', type: 'spki' });
  if (!verify(null, content, key, Buffer.from(match[1], 'base64')))
    throw desktopError(DESKTOP_ERRORS.update, 'Sparkle feed signature verification failed', 'update.verifyFeed');
  const xml = content.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw desktopError(DESKTOP_ERRORS.update, 'Invalid Sparkle XML', 'update.parseFeed');
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
  const raw = parsed.rss?.channel?.item;
  const items = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const updates = items.map(item => ({
    version: item['sparkle:shortVersionString'] || item['sparkle:version'],
    build: item['sparkle:version'],
    releaseNotes: typeof item.description === 'string' ? item.description : undefined,
    enclosure: item.enclosure,
  })).filter(item => semver.valid(item.version) && semver.valid(item.build)
    && !semver.prerelease(item.version) && semver.gt(item.version, currentVersion));
  updates.sort((a, b) => semver.rcompare(a.version, b.version));
  const latest = updates[0];
  if (latest) {
    let url;
    try { url = new URL(latest.enclosure?.['@_url']); }
    catch { throw desktopError(DESKTOP_ERRORS.update, 'Invalid Sparkle enclosure', 'update.parseFeed'); }
    if (url.protocol !== 'https:' || url.username || url.password
      || !latest.enclosure?.['@_sparkle:edSignature']) throw desktopError(DESKTOP_ERRORS.update, 'Invalid Sparkle enclosure', 'update.parseFeed');
  }
  return latest || null;
}
