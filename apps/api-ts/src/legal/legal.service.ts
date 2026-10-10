import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  legalAction, legalDocuments, requiredLegalKeys,
  type LegalDocument, type LegalDocumentKey, type User,
} from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';

function publishedDocument(key: LegalDocumentKey): LegalDocument | null {
  const document = legalDocuments[key];
  if (document.status === 'DRAFT') return null;
  if (!document.publishedAt || !Number.isFinite(Date.parse(document.publishedAt)) ||
      Date.parse(document.publishedAt) > Date.now() ||
      document.version.startsWith('draft-') || document.reviewItems.length)
    throw new Error(`Legal document ${key} is marked published without a complete approved version.`);
  return document;
}

function snapshot(document: LegalDocument) {
  return { key: document.key, version: document.version, title: document.title,
    audience: document.audience, sections: document.sections, publishedAt: document.publishedAt };
}

async function ensureVersion(tx: Prisma.TransactionClient, document: LegalDocument) {
  const content = snapshot(document);
  const serialized = JSON.stringify(content);
  const hash = createHash('sha256').update(serialized).digest('hex');
  await tx.$executeRaw`
    INSERT INTO "LegalDocumentVersion" ("id", "key", "version", "title", "content", "contentHash", "publishedAt")
    VALUES (${randomUUID()}::uuid, ${document.key}, ${document.version}, ${document.title},
      ${serialized}::jsonb, ${hash}, ${new Date(document.publishedAt!)})
    ON CONFLICT ("key", "version") DO NOTHING`;
  const version = await tx.legalDocumentVersion.findUniqueOrThrow({
    where: { key_version: { key: document.key, version: document.version } },
  });
  if (version.contentHash !== hash)
    throw new ConflictException('This legal document version has different saved text. Publish a new version.');
  return version;
}

@Injectable()
export class LegalService {
  constructor(@Inject(Database) private readonly db: Database) {}

  document(key: LegalDocumentKey) { return legalDocuments[key]; }

  async status(user: User) {
    const required = requiredLegalKeys(user.role).map(publishedDocument).filter((item): item is LegalDocument => item !== null);
    const records = await this.db.legalAcknowledgement.findMany({
      where: { userId: user.id },
      include: { document: { select: { key: true, version: true, title: true } } },
      orderBy: { acknowledgedAt: 'desc' },
    });
    const completed = new Set(records.map((row) => `${row.document.key}:${row.document.version}`));
    return {
      pending: required.filter((item) => !completed.has(`${item.key}:${item.version}`)),
      history: records.map((row) => ({ key: row.document.key, version: row.document.version,
        title: row.document.title, action: row.action, acknowledgedAt: row.acknowledgedAt })),
    };
  }

  async hasPending(user: User) {
    const required = requiredLegalKeys(user.role).map(publishedDocument).filter((item): item is LegalDocument => item !== null);
    if (!required.length) return false;
    const records = await this.db.legalAcknowledgement.findMany({
      where: { userId: user.id, OR: required.map((item) => ({ document: { key: item.key, version: item.version } })) },
      select: { document: { select: { key: true, version: true } } },
    });
    return required.some((item) => !records.some((row) => row.document.key === item.key && row.document.version === item.version));
  }

  async acknowledge(user: User, input: { key: LegalDocumentKey; version: string; action: 'ACKNOWLEDGED' | 'ACCEPTED' }) {
    const document = publishedDocument(input.key);
    if (!document || document.version !== input.version || legalAction(input.key) !== input.action)
      throw new BadRequestException('Choose the current published document and its required action.');
    if (!requiredLegalKeys(user.role).includes(input.key)) throw new ForbiddenException('This document is not for your account.');
    return this.db.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: user.id }, select: { active: true, role: true } });
      if (!current?.active || !requiredLegalKeys(current.role).includes(input.key))
        throw new ForbiddenException('Your account access has changed.');
      const version = await ensureVersion(tx, document);
      const rowId = randomUUID();
      const inserted = await tx.$executeRaw`
        INSERT INTO "LegalAcknowledgement" ("id", "documentId", "userId", "action")
        VALUES (${rowId}::uuid, ${version.id}::uuid, ${user.id}::uuid, ${input.action})
        ON CONFLICT ("documentId", "userId") DO NOTHING`;
      const row = await tx.legalAcknowledgement.findUniqueOrThrow({
        where: { documentId_userId: { documentId: version.id, userId: user.id } },
      });
      if (inserted) await tx.auditEntry.create({ data: { actorId: user.id, action: 'legal.acknowledged',
        entity: 'legal_acknowledgement', recordId: row.id,
        after: { key: document.key, version: document.version, action: input.action, contentHash: version.contentHash },
      } });
      return { key: document.key, version: document.version, action: row.action, acknowledgedAt: row.acknowledgedAt };
    });
  }

  applicantNotice() { return publishedDocument('APPLICANT_PRIVACY'); }

  async recordApplicantAcknowledgement(tx: Prisma.TransactionClient, applicantId: string,
    input: { privacyNoticeVersion?: string; privacyNoticeAcknowledged?: boolean }) {
    const document = this.applicantNotice();
    if (!document) return;
    if (input.privacyNoticeVersion !== document.version || input.privacyNoticeAcknowledged !== true)
      throw new BadRequestException('Read and acknowledge the current Applicant Privacy Notice before applying.');
    const version = await ensureVersion(tx, document);
    await tx.legalAcknowledgement.create({ data: {
      documentId: version.id, applicantId, action: 'ACKNOWLEDGED',
    } });
  }
}
