import fs from 'fs';
import path from 'path';
import { AUTH_STORAGE_STATE, buildStorageState } from './utils/auth';

export default async function globalSetup() {
  const storageState = buildStorageState();
  const targetPath = path.resolve(AUTH_STORAGE_STATE);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(storageState, null, 2), 'utf-8');
}
