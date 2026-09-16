export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  if (path.startsWith('file://')) {
    return '/(tabs)/files';
  }
  return path;
}