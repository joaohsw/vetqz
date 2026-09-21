/**
 * Upload direto de PDFs ao Supabase Storage.
 * O arquivo nunca atravessa a Vercel: a API cria um intent curto e o browser
 * envia ao bucket privado. Acima de 6 MB usa TUS, que permite retomada.
 */

import * as tus from 'tus-js-client';

import { supabase } from './supabase';

const TUS_THRESHOLD_BYTES = 6 * 1024 * 1024;
const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

function getStorageEndpoint() {
  const projectUrl = new URL(import.meta.env.VITE_SUPABASE_URL);
  const projectId = projectUrl.hostname.split('.')[0];
  return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
}

async function uploadWithTus(file, objectPath, onProgress) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Sua sessão expirou. Entre novamente para enviar o PDF.');
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: getStorageEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      metadata: {
        bucketName: 'materials',
        objectName: objectPath,
        contentType: 'application/pdf',
        cacheControl: '3600',
      },
      onError: (error) => reject(error),
      onProgress: (uploaded, total) => onProgress?.(Math.round((uploaded / total) * 100)),
      onSuccess: resolve,
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
  });
}

export async function uploadPdfDirectly(file, storagePath, onProgress) {
  const objectPath = storagePath.removeprefix('materials/');

  if (file.size > TUS_THRESHOLD_BYTES) {
    await uploadWithTus(file, objectPath, onProgress);
    return;
  }

  onProgress?.(0);
  const { error } = await supabase.storage.from('materials').upload(objectPath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw error;
  onProgress?.(100);
}
