/**
 * Build-time application version.
 *
 * The version shown in the UI is never written by hand: it is resolved once,
 * when Vite builds or serves the app, and inlined as `__APP_VERSION__`.
 */

/**
 * Pick the version string to inline into the bundle.
 *
 * CI passes `APP_VERSION` (the release tag, or `sha-<commit>` on `main`)
 * because the Docker build context has no `.git` directory. Local builds fall
 * back to `git describe`, and to `dev` when Git is unavailable.
 *
 * @param envVersion - Value of the `APP_VERSION` environment variable, if any.
 * @param gitDescribe - Returns `git describe` output, or throws without Git.
 * @returns The version, without the leading `v` of a tag.
 */
export function resolveAppVersion(
  envVersion: string | undefined,
  gitDescribe: () => string,
): string {
  const fromEnv = envVersion?.trim();
  if (fromEnv) return stripTagPrefix(fromEnv);

  try {
    const described = gitDescribe().trim();
    if (described) return stripTagPrefix(described);
  } catch {
    // No Git, or no commit: fall through to the placeholder.
  }
  return 'dev';
}

/**
 * Drop the `v` that release tags carry (`v2026.11.11` becomes `2026.11.11`).
 *
 * @param version - Raw version or tag name.
 * @returns The version without a leading `v` before a digit.
 */
function stripTagPrefix(version: string): string {
  return version.replace(/^v(?=\d)/, '');
}
