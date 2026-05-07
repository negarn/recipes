import { chmod, mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ensurePrivateJsonStorageFile, writePrivateJsonFile } from './privateFilesystem';

function getModeBits(mode: number) {
  return mode & 0o777;
}

describe('privateFilesystem', () => {
  it('writes private json files with restrictive permissions', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'recipes-private-files-'));

    const filePath = join(rootDir, 'nested', 'state.json');

    await writePrivateJsonFile(filePath, { hello: 'world' });

    const fileStats = await stat(filePath);
    const directoryStats = await stat(join(rootDir, 'nested'));

    expect(getModeBits(fileStats.mode)).toBe(0o600);
    expect(getModeBits(directoryStats.mode)).toBe(0o700);

    await rm(rootDir, { recursive: true, force: true });
  });

  it('tightens existing private json paths', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'recipes-private-files-'));
    const directoryPath = join(rootDir, 'nested');
    const filePath = join(directoryPath, 'state.json');

    await mkdir(directoryPath, { recursive: true });
    await writeFile(filePath, '{"hello":"world"}', 'utf8');
    await chmod(directoryPath, 0o755);
    await chmod(filePath, 0o644);

    await ensurePrivateJsonStorageFile(filePath);

    const fileStats = await stat(filePath);
    const directoryStats = await stat(directoryPath);

    expect(getModeBits(fileStats.mode)).toBe(0o600);
    expect(getModeBits(directoryStats.mode)).toBe(0o700);

    await rm(rootDir, { recursive: true, force: true });
  });
});
