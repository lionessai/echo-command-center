import { google } from 'googleapis';
import { Readable } from 'stream';

export function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export const ECHO_OUTPUTS_FOLDER_ID = '1ToVT8kAx6VwtZQ46z-brf8ujBKOjqNDS';

export async function listFiles(folderId?: string, query?: string) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const qParts = ['trashed = false'];
  if (folderId) qParts.push(`'${folderId}' in parents`);
  if (query) qParts.push(`name contains '${query}'`);
  const res = await drive.files.list({
    q: qParts.join(' and '),
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 30,
  });
  return res.data.files || [];
}

export async function createFolder(name: string, parentId?: string) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const meta: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) meta.parents = [parentId];
  const res = await drive.files.create({ requestBody: meta, fields: 'id, name, webViewLink' });
  return res.data;
}

export async function writeDocument(name: string, content: string, folderId?: string, asGoogleDoc = false) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const meta: { name: string; parents?: string[]; mimeType?: string } = { name };
  if (folderId) meta.parents = [folderId];
  if (asGoogleDoc) meta.mimeType = 'application/vnd.google-apps.document';
  const stream = Readable.from([Buffer.from(content, 'utf-8')]);
  const res = await drive.files.create({
    requestBody: meta,
    media: { mimeType: 'text/plain', body: stream },
    fields: 'id, name, webViewLink, mimeType',
  });
  return res.data;
}

export async function moveFile(fileId: string, targetFolderId: string, newName?: string) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const file = await drive.files.get({ fileId, fields: 'parents' });
  const previousParents = (file.data.parents || []).join(',');

  const updateOptions: {
    fileId: string;
    addParents: string;
    removeParents: string;
    fields: string;
    requestBody?: { name: string };
  } = {
    fileId,
    addParents: targetFolderId,
    removeParents: previousParents,
    fields: 'id, name, webViewLink',
  };

  if (newName) updateOptions.requestBody = { name: newName };
  const res = await drive.files.update(updateOptions);
  return res.data;
}
