import { Request } from 'express';

/**
 * Utility function to check if platform logos should be hidden for iOS requests
 * during Apple App Store Review.
 *
 * Controlled via environment variable: APPLE_REVIEW_MODE=true
 */
export function shouldHideLogosForIos(req: Request): boolean {
  if (process.env.APPLE_REVIEW_MODE !== 'true') {
    return false;
  }

  const platformHeader = (req.headers['x-platform'] || '').toString().toLowerCase();
  const userAgent = (req.headers['user-agent'] || '').toString().toLowerCase();

  const isIos =
    platformHeader === 'ios' ||
    userAgent.includes('iphone') ||
    userAgent.includes('ipad') ||
    userAgent.includes('ipod') ||
    userAgent.includes('cfnetwork') ||
    userAgent.includes('darwin');

  return isIos;
}
