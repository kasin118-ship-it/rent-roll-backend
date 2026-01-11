
import { Injectable, Logger } from '@nestjs/common';
import { Storage, Bucket } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class GcsService {
    private storage: Storage;
    private bucket: Bucket;
    private readonly logger = new Logger(GcsService.name);
    private readonly bucketName: string;

    constructor(private configService: ConfigService) {
        // Determine bucket name from config or default
        this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || 'rent-roll-documents';

        // Initialize Storage
        // The library automatically checks GOOGLE_APPLICATION_CREDENTIALS env var
        // Or looks for default credentials.
        // We can also explicity load a key file if needed.
        const keyFilePath = this.configService.get<string>('GCS_KEY_FILE_PATH');

        if (keyFilePath) {
            this.storage = new Storage({ keyFilename: keyFilePath });
        } else {
            // Fallback: try to find 'google-credentials.json' in root if env var is not set
            // But best practice is relying on GOOGLE_APPLICATION_CREDENTIALS or default auth
            this.storage = new Storage();
        }

        this.bucket = this.storage.bucket(this.bucketName);
        this.logger.log(`GCS Service initialized for bucket: ${this.bucketName}`);
    }

    async uploadFile(file: Express.Multer.File, destinationFolder: string = 'contracts'): Promise<string> {
        try {
            const fileName = `${destinationFolder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const blob = this.bucket.file(fileName);

            const blobStream = blob.createWriteStream({
                resumable: false,
                contentType: file.mimetype,
            });

            return new Promise((resolve, reject) => {
                blobStream.on('error', (err) => {
                    this.logger.error(`Upload error: ${err.message}`, err.stack);
                    reject(err);
                });

                blobStream.on('finish', () => {
                    // The public URL can be used directly to access the file via HTTP.
                    // Note: The bucket/object must be public or we need to generate a signed URL.
                    // For internal systems, usually we generate Signed URLs on read, or make bucket public (risky).
                    // Let's assume we want Signed URLs or just store the path for now.
                    // But to make it easy for frontend to verify, let's return the cloud storage URI or Signed URL.

                    // For now, let's return the file name (path in bucket) so we can generate Signed URL later
                    // OR if we want to allow immediate access if bucket is public:
                    // const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${blob.name}`;

                    resolve(fileName);
                });

                blobStream.end(file.buffer);
            });
        } catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getSignedUrl(fileName: string): Promise<string> {
        try {
            const options = {
                version: 'v4' as const,
                action: 'read' as const,
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            };

            const [url] = await this.bucket.file(fileName).getSignedUrl(options);
            return url;
        } catch (error) {
            this.logger.error(`Failed to get signed URL: ${error.message}`);
            throw error;
        }
    }
}
