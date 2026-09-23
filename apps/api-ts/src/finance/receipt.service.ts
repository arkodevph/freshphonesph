import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { receiptTypeSchema, type ReceiptScan, type ReceiptType } from '@freshphones/contracts';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

type Upload = { buffer: Buffer; mimetype: string; size: number };

@Injectable()
export class ReceiptService {
  async scan(type: string, file?: Upload): Promise<ReceiptScan> {
    const parsed = receiptTypeSchema.safeParse(type);
    if (!parsed.success) throw new BadRequestException('Choose a supported receipt type.');
    if (!file) throw new BadRequestException('Choose a receipt image.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      throw new BadRequestException('Use a JPG, PNG or WebP receipt image.');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Receipt image must be 5 MB or smaller.');
    return this.run(parsed.data, file.buffer);
  }

  private run(type: ReceiptType, image: Buffer): Promise<ReceiptScan> {
    const script = join(__dirname, '../../scripts/receipt_ocr.py');
    return new Promise((resolve, reject) => {
      const child = spawn('python3', [script, type], { stdio: ['pipe', 'pipe', 'pipe'] });
      const output: Buffer[] = [];
      const errors: Buffer[] = [];
      const timer = setTimeout(() => child.kill('SIGKILL'), 25_000);
      child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
      child.on('error', () => {
        clearTimeout(timer);
        reject(new ServiceUnavailableException('Receipt scanner is unavailable.'));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        try {
          const result = JSON.parse(Buffer.concat(output).toString()) as ReceiptScan & { error?: string };
          if (code || result.error) reject(new BadRequestException(result.error ?? 'Receipt could not be scanned.'));
          else resolve(result);
        } catch {
          reject(new ServiceUnavailableException(
            Buffer.concat(errors).length ? 'Receipt scanner failed.' : 'Receipt scanner returned an invalid result.',
          ));
        }
      });
      child.stdin.end(image);
    });
  }
}
