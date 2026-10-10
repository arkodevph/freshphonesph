import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CatalogInput, CatalogItem, CatalogQuery, PublicCatalogItem, User } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma, type CatalogItem as StoredItem } from '../generated/prisma/client';
import { allowed, requireCurrentUser } from '../auth/access';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';

const pageSize = 20;
const view = (row: StoredItem): CatalogItem => ({
  id: row.id, code: row.code, name: row.name, condition: row.condition,
  dailyAmount: row.dailyAmount?.toFixed(2) ?? null, availability: row.availability,
  description: row.description, published: row.published, sortOrder: row.sortOrder,
  imageAsset: row.imageAsset as CatalogItem['imageAsset'], hasImage: Boolean(row.imageFileId),
  installmentPlan: row.planTotalAmount !== null && row.planInstallmentCount !== null && row.planCadence !== null
    ? { totalAmount: row.planTotalAmount.toFixed(2), installmentCount: row.planInstallmentCount, cadence: row.planCadence } : null,
  version: row.version, updatedAt: row.updatedAt.toISOString(),
});
const publicView = (row: StoredItem): PublicCatalogItem => {
  const { id, name, condition, dailyAmount, availability, description, imageAsset, hasImage, version, installmentPlan } = view(row);
  return { id, name, condition, dailyAmount, availability, description, imageAsset, hasImage, version, installmentPlan };
};
const storedInput = ({ installmentPlan, ...record }: CatalogInput) => ({ ...record,
  planTotalAmount: installmentPlan?.totalAmount ?? null,
  planInstallmentCount: installmentPlan?.installmentCount ?? null,
  planCadence: installmentPlan?.cadence ?? null,
});
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

@Injectable()
export class CatalogService {
  constructor(@Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService) {}

  private async list(query: CatalogQuery, publicOnly: boolean) {
    const where: Prisma.CatalogItemWhereInput = {
      ...(publicOnly ? { published: true } : query.visibility ? { published: query.visibility === 'PUBLISHED' } : {}),
      ...(query.availability ? { availability: query.availability } : {}),
      ...(query.q ? { OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        ...(!publicOnly ? [{ code: { contains: query.q, mode: 'insensitive' as const } }] : []),
      ] } : {}),
    };
    return this.db.$transaction(async tx => {
      const total = await tx.catalogItem.count({ where });
      const rows = await tx.catalogItem.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * pageSize, take: pageSize });
      return { rows, total, page: query.page, pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async publicList(query: CatalogQuery) {
    const { rows, ...page } = await this.list(query, true);
    return { ...page, items: rows.map(publicView) };
  }
  async directory(user: User, query: CatalogQuery) {
    await requireCurrentUser(this.db, user, 'CATALOG_MANAGE');
    const { rows, ...page } = await this.list(query, false);
    return { ...page, items: rows.map(view) };
  }
  async detail(user: User, id: string) {
    await requireCurrentUser(this.db, user, 'CATALOG_MANAGE');
    const row = await this.db.catalogItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Listing not found.');
    return view(row);
  }
  private async write<T>(user: User, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'CATALOG_MANAGE')) throw new ForbiddenException('Your catalog access has changed.');
      return run(tx);
    });
  }
  private async record(tx: Prisma.TransactionClient, user: User, row: StoredItem, before?: StoredItem, action = 'catalog.updated') {
    await tx.auditEntry.create({ data: { actorId: user.id, entity: 'catalog', recordId: row.id, action,
      ...(before ? { before: json({ ...view(before), imageFileId: before.imageFileId }) } : {}),
      after: json({ ...view(row), imageFileId: row.imageFileId }) } });
    await tx.changeEvent.create({ data: { entity: 'catalog', recordId: row.id } });
    return view(row);
  }
  private async current(tx: Prisma.TransactionClient, id: string, version: number) {
    const before = await tx.catalogItem.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Listing not found.');
    if (before.version !== version) throw new ConflictException('This listing changed. Review the latest version before saving.');
    return before;
  }
  create(user: User, input: CatalogInput) {
    return this.write(user, async tx => {
      const row = await tx.catalogItem.create({ data: storedInput(input) });
      return this.record(tx, user, row, undefined, 'catalog.created');
    });
  }
  update(user: User, id: string, version: number, input: CatalogInput) {
    return this.write(user, async tx => {
      const before = await this.current(tx, id, version);
      const row = await tx.catalogItem.update({ where: { id }, data: { ...storedInput(input), version: { increment: 1 } } });
      return this.record(tx, user, row, before);
    });
  }
  async upload(user: User, id: string, version: number, upload?: PrivateUpload) {
    await this.detail(user, id);
    const file = this.storage.validateDocument(upload, { allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024, label: 'product photo' });
    const storageKey = await this.storage.saveDocument(file);
    try {
      return await this.write(user, async tx => {
        const before = await this.current(tx, id, version);
        const stored = await tx.storedFile.create({ data: { storageKey, originalName: file.originalname.slice(0, 255),
          mimeType: file.mimetype, size: file.size, uploadedById: user.id } });
        const row = await tx.catalogItem.update({ where: { id }, data: { imageFileId: stored.id, version: { increment: 1 } } });
        return this.record(tx, user, row, before, 'catalog.photo_uploaded');
      });
    } catch (error) { await this.storage.remove(storageKey); throw error; }
  }
  clearImage(user: User, id: string, version: number) {
    return this.write(user, async tx => {
      const before = await this.current(tx, id, version);
      const row = await tx.catalogItem.update({ where: { id }, data: { imageFileId: null, imageAsset: null, version: { increment: 1 } } });
      return this.record(tx, user, row, before, 'catalog.photo_removed');
    });
  }
  async image(id: string, user?: User) {
    if (user) await requireCurrentUser(this.db, user, 'CATALOG_MANAGE');
    const row = await this.db.catalogItem.findFirst({ where: { id, ...(!user ? { published: true } : {}) }, include: { imageFile: true } });
    if (!row?.imageFile) throw new NotFoundException('Product photo not found.');
    return { data: await this.storage.read(row.imageFile.storageKey), mimeType: row.imageFile.mimeType };
  }
}
