const DREAMINA_LOGIN_ORIGIN = 'https://jimeng.jianying.com';
const DREAMINA_LOGIN_PATH = '/ai-tool/cli-auth';
const DREAMINA_DEVICE_CONFIRM_PATH = '/passport/open/scan_user_code/';

export function isOfficialDreaminaLoginUrl(
  value: string | undefined,
  userCode: string | undefined,
) {
  if (!value || !userCode) return false;
  let outer: URL;
  try {
    outer = new URL(value);
  } catch {
    return false;
  }
  if (
    outer.origin !== DREAMINA_LOGIN_ORIGIN ||
    outer.pathname !== DREAMINA_LOGIN_PATH ||
    outer.username ||
    outer.password ||
    outer.hash
  )
    return false;
  if (!outer.search) return true;
  const outerKeys = [...outer.searchParams.keys()];
  const nestedValues = outer.searchParams.getAll('verification_uri');
  if (outerKeys.length !== 1 || outerKeys[0] !== 'verification_uri' || nestedValues.length !== 1)
    return false;
  let nested: URL;
  try {
    nested = new URL(nestedValues[0]);
  } catch {
    return false;
  }
  const nestedKeys = [...nested.searchParams.keys()];
  const nestedCodes = nested.searchParams.getAll('user_code');
  return (
    nested.origin === DREAMINA_LOGIN_ORIGIN &&
    nested.pathname === DREAMINA_DEVICE_CONFIRM_PATH &&
    !nested.username &&
    !nested.password &&
    !nested.hash &&
    nestedKeys.length === 1 &&
    nestedKeys[0] === 'user_code' &&
    nestedCodes.length === 1 &&
    nestedCodes[0] === userCode
  );
}
