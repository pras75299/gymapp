import crypto from 'crypto';
import { randomUUID } from 'crypto';

interface QRData {
    passId: string;
    passType: string;
    expiryDate: string;
    uuid: string;
    signature: string;
}

export function encodeQRData(data: Omit<QRData, 'signature'>): string {
    // Create a string representation of the data
    const dataString = JSON.stringify(data);

    // Create a signature using the data's UUID as part of the secret
    const signature = crypto
        .createHmac('sha256', data.uuid)
        .update(dataString)
        .digest('hex');

    // Combine data and signature
    const qrData: QRData = {
        ...data,
        signature
    };

    // Return as base64 encoded string
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
}

export function decodeQRData(encodedData: string): QRData | null {
    try {
        // Decode base64 string
        const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
        const qrData = JSON.parse(decodedString) as QRData;

        // Extract signature
        const { signature, ...data } = qrData;

        // Verify signature using the UUID from the data
        const expectedSignature = crypto
            .createHmac('sha256', data.uuid)
            .update(JSON.stringify(data))
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Invalid QR code signature');
            return null;
        }

        return qrData;
    } catch (error) {
        console.error('Error decoding QR data:', error);
        return null;
    }
}

export function generateQRData(passId: string, passType: string, expiryDate: string): Omit<QRData, 'signature'> {
    return {
        passId,
        passType,
        expiryDate,
        uuid: randomUUID()
    };
}
