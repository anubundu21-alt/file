export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  const normalized = path.trim().toLowerCase();
  if (
    path.startsWith('file://')
    || normalized.startsWith('file-manager-ios://inbox')
    || normalized.startsWith('file-manager-ios:///inbox')
    || normalized === '/inbox'
    || normalized === 'inbox'
  ) {
    return '/(tabs)/files';
  }
  return path;
}
