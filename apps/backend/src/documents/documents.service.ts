import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly storageRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.storageRoot = process.env.STORAGE_ROOT || path.join(process.cwd(), '..', '..', 'storage');
  }

  async uploadDocument(
    file: Express.Multer.File,
    meta: {
      category: string;
      billId?: number;
      governmentOrderId?: number;
      billSettlementId?: number;
      vendorId?: number;
      taxRemittanceId?: number;
    },
    userId: number,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    // 1. Calculate SHA256 checksum
    const hash = crypto.createHash('sha256');
    hash.update(file.buffer);
    const checksumSha256 = hash.digest('hex');

    // 2. Generate UUID & destination path
    const documentUid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const categoryFolder = meta.category || 'General';
    const targetDir = path.join(this.storageRoot, categoryFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${documentUid}${ext}`;
    const storedPath = path.join(targetDir, filename);

    // 3. Write locally to Windows Server storage
    fs.writeFileSync(storedPath, file.buffer);

    // 4. Save metadata in MySQL
    const doc = await this.prisma.document.create({
      data: {
        documentUid,
        category: meta.category,
        originalFilename: file.originalname,
        storedPath,
        mimeType: file.mimetype,
        fileSizeBytes: BigInt(file.size),
        checksumSha256,
        uploadedById: userId,
        billId: meta.billId ? Number(meta.billId) : null,
        governmentOrderId: meta.governmentOrderId ? Number(meta.governmentOrderId) : null,
        billSettlementId: meta.billSettlementId ? Number(meta.billSettlementId) : null,
        vendorId: meta.vendorId ? Number(meta.vendorId) : null,
        taxRemittanceId: meta.taxRemittanceId ? Number(meta.taxRemittanceId) : null,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPLOAD_DOCUMENT',
      module: 'DOCUMENTS',
      recordId: String(doc.id),
      details: `Uploaded document ${file.originalname} (${meta.category}) under UID ${documentUid}`,
    });

    return {
      id: doc.id,
      documentUid: doc.documentUid,
      category: doc.category,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSize: Number(doc.fileSizeBytes),
      createdAt: doc.createdAt,
    };
  }

  async getDocumentFile(documentUid: string, userId: number) {
    const doc = await this.prisma.document.findUnique({
      where: { documentUid },
    });

    if (!doc) throw new NotFoundException('Document metadata not found');
    if (!fs.existsSync(doc.storedPath)) {
      throw new NotFoundException('Document file missing from physical storage server');
    }

    await this.auditService.log({
      userId,
      action: 'DOWNLOAD_DOCUMENT',
      module: 'DOCUMENTS',
      recordId: String(doc.id),
      details: `User downloaded document ${doc.originalFilename}`,
    });

    return {
      stream: fs.createReadStream(doc.storedPath),
      doc,
    };
  }

  async getDocumentsForRecord(type: 'bill' | 'vendor' | 'go' | 'settlement', id: number) {
    const where: any = {};
    if (type === 'bill') where.billId = id;
    if (type === 'vendor') where.vendorId = id;
    if (type === 'go') where.governmentOrderId = id;
    if (type === 'settlement') where.billSettlementId = id;

    const docs = await this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    return docs.map((d) => ({
      id: d.id,
      documentUid: d.documentUid,
      category: d.category,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      fileSize: Number(d.fileSizeBytes),
      checksumSha256: d.checksumSha256,
      createdAt: d.createdAt,
      uploadedBy: d.uploadedBy?.fullName || d.uploadedBy?.username,
    }));
  }
}

